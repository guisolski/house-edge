import { test, expect, type Page, type CDPSession } from '@playwright/test';

async function startAndWalk(page: Page): Promise<{
  avgFps: number;
  fps: number;
  avgFrameMs: number;
}> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    (
      window as unknown as {
        __HOUSE_EDGE__: { setShowFps: (on: boolean) => void };
      }
    ).__HOUSE_EDGE__.setShowFps(true);
  });
  for (let i = 0; i < 30; i += 1) {
    const key = i % 2 === 0 ? 'ArrowRight' : 'ArrowUp';
    await page.keyboard.down(key);
    await page.waitForTimeout(35);
    await page.keyboard.up(key);
    await page.waitForTimeout(15);
  }
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    type Sample = { avgFps: number; avgFrameMs: number; fps: number };
    return (
      window as unknown as { __HOUSE_EDGE__: { getFps: () => Sample } }
    ).__HOUSE_EDGE__.getFps();
  });
}

test.describe('Throttled mobile CPU budget', () => {
  test('avg FPS stays usable under 4x CPU slowdown', async ({ page }) => {
    const client: CDPSession = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const sample = await startAndWalk(page);
    // Owner budget: >= 50 FPS on throttled mobile.
    expect(sample.avgFps, `throttled avg FPS ${sample.avgFps}`).toBeGreaterThanOrEqual(
      50,
    );
    expect(sample.avgFrameMs).toBeLessThanOrEqual(24);
  });
});
