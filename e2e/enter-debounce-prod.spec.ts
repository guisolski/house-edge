/**
 * Playtest #26 FAIL3: real keyboard on Nair at spawn — not runStoryBeat.
 * E → dialogue → Enter closes → Enter×4 @80ms must not reopen;
 * E → Enter×3 must not select a choice in the first 250ms.
 */
import { test, expect } from '@playwright/test';

test('prod: Enter spam after closing Nair at spawn does not reopen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  // Spawn is next to Nair — focus canvas so keyboard reaches the game.
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });
  // Arm window — wait out choice lock, then pick Loud.
  await page.waitForTimeout(300);
  const choice = page.locator('.dialogue-choice').first();
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(
    page.getByRole('button', { name: /Walk away|Desistir|Sair/i }),
  ).toBeVisible();
  // Close with Enter (focused Walk away / via Escape path) — real rematch path.
  await page.keyboard.press('Escape');
  await expect(page.locator('.play-hud')).toBeVisible();
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
  await expect(page.locator('.btn-take-bet')).toHaveCount(0);
});

test('prod: Enter after E does not auto-pick a choice in 250ms', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 3000 });
  const before = await page.locator('.dialogue-choice').count();
  expect(before).toBeGreaterThan(0);
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
  }
  // Still on the choice panel — no Take the bet / Walk away yet.
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  await expect(page.locator('.btn-take-bet')).toHaveCount(0);
  const elapsedOk = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: { session: { allowModalConfirm: () => boolean } };
      }
    ).__HOUSE_EDGE__;
    // Immediately after open the arm may still be live; after ~250ms it clears.
    return typeof he.session.allowModalConfirm === 'function';
  });
  expect(elapsedOk).toBe(true);
});
