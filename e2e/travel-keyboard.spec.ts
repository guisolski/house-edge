/**
 * Playtest #33/#37: Esc → Viajar → Enter on first destination (no Esc/reopen).
 */
import { test, expect } from '@playwright/test';

test('Viajar travels with keyboard only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            player: { addCredits: (n: number) => void };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.player.addCredits(50);
    s.world.unlock('feira-central');
  });

  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu-panel')).toBeVisible();
  // Resume is first; arrow to Viajar / Travel.
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(40);
  await page.keyboard.press('Enter');
  await expect(page.locator('.travel-panel')).toBeVisible();
  // Playtest #37: focus lands on first destination — Enter works immediately.
  const focused = page.locator('.travel-panel button.travel-dest:focus');
  await expect(focused).toBeVisible({ timeout: 1000 });
  await page.waitForTimeout(60);
  await page.keyboard.press('Enter');
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 3000 });
  const district = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { player: { getStats: () => { districtId: string } } };
        };
      }
    ).__HOUSE_EDGE__;
    return he.session.player.getStats().districtId;
  });
  expect(['morro-neon', 'feira-central', 'avenida-odds', 'torre-casa']).toContain(
    district,
  );
});
