/**
 * Playtest #28: after Nair needle, Enter spam (twice) must not reopen + bet;
 * KeyE on beaten Nair shows done dialogue; Luna E still works.
 */
import { test, expect } from '@playwright/test';

test('prod: Enter×4×2 after needle no bet; KeyE Nair done; Luna E works', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(450);
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.btn-take-bet')).toBeVisible();
  await page.locator('.btn-take-bet').click();
  await expect(page.locator('.btn-needle-stop')).toBeVisible({ timeout: 3000 });
  // rAF needle — Stop on the first frame the visible needle is in the drawn zone
  // (DOM style writes no longer drive sampleNeedle).
  const stopped = await page.evaluate(async () => {
    const deadline = performance.now() + 12_000;
    while (performance.now() < deadline) {
      const zone = document.querySelector('.skill-zone') as HTMLElement | null;
      const needle = document.querySelector('.skill-needle') as HTMLElement | null;
      const btn = document.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
      if (zone && needle && btn) {
        const left = parseFloat(zone.style.left);
        const width = parseFloat(zone.style.width);
        const at = parseFloat(needle.style.left);
        if (
          [left, width, at].every(Number.isFinite) &&
          at >= left &&
          at <= left + width
        ) {
          btn.click();
          return true;
        }
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return false;
  });
  expect(stopped).toBe(true);
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1200);
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
  await expect(page.locator('.btn-take-bet')).toHaveCount(0);
  await expect(page.locator('.skill-body')).toHaveCount(0);

  // KeyE on beaten Nair → done dialogue, not rematch bet.
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { setPosition: (x: number, y: number) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.setPosition(13, 16);
  });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.btn-take-bet')).toHaveCount(0);
  await expect(page.locator('.skill-body')).toHaveCount(0);
  const doneText = (await page.locator('.dialogue-body').textContent()) ?? '';
  expect(doneText.length).toBeGreaterThan(8);
  await page.keyboard.press('Escape');
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 3000 });

  // Unlock Luna + stand on her tile — first E must open (not eaten by rematch arm).
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { setPosition: (x: number, y: number) => void };
            story: { setFlag: (k: string, v: boolean) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.setFlag('antena_ok', true);
    he.session.player.setPosition(22, 16);
  });
  await page.waitForTimeout(750);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });
});
