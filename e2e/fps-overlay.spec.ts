import { test, expect } from '@playwright/test';

test('F3 toggles the FPS overlay on the HUD', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('.world-canvas').click({ position: { x: 40, y: 40 } });

  await expect(page.locator('.fps-meter')).toBeHidden();

  await page.keyboard.press('F3');
  await expect(page.locator('.fps-meter')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.fps-meter')).toContainText(/FPS \d+/);

  const sample = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: { getFps: () => { fps: number; avgFps: number } };
      }
    ).__HOUSE_EDGE__;
    return he.getFps();
  });
  expect(sample.fps).toBeGreaterThan(0);

  await page.keyboard.press('F3');
  await expect(page.locator('.fps-meter')).toBeHidden();
});
