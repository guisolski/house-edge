import { test, expect, type Page, type CDPSession } from '@playwright/test';

async function enableFps(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as unknown as {
        __HOUSE_EDGE__: { setShowFps: (on: boolean) => void };
      }
    ).__HOUSE_EDGE__.setShowFps(true);
  });
}

async function sampleFps(page: Page): Promise<{
  avgFps: number;
  fps: number;
  avgFrameMs: number;
}> {
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    type Sample = { avgFps: number; avgFrameMs: number; fps: number };
    return (
      window as unknown as { __HOUSE_EDGE__: { getFps: () => Sample } }
    ).__HOUSE_EDGE__.getFps();
  });
}

async function startAndWalk(page: Page): Promise<{
  avgFps: number;
  fps: number;
  avgFrameMs: number;
}> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await enableFps(page);
  // Let sprite bake + first frames settle before sampling under throttle.
  await page.waitForTimeout(900);
  for (let i = 0; i < 30; i += 1) {
    const key = i % 2 === 0 ? 'ArrowRight' : 'ArrowUp';
    await page.keyboard.down(key);
    await page.waitForTimeout(35);
    await page.keyboard.up(key);
    await page.waitForTimeout(15);
  }
  return sampleFps(page);
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

  test('Odds Avenue dialog open stays >=50 FPS under 4x throttle', async ({ page }) => {
    const client: CDPSession = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.locator('.play-hud')).toBeVisible();
    await enableFps(page);
    await page.evaluate(() => {
      const s = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              world: { unlock: (id: string) => boolean };
              player: {
                setDistrict: (id: string) => void;
                setPosition: (x: number, y: number) => void;
                addCredits: (n: number) => void;
              };
              story: { setFlag: (f: string, v: boolean) => void };
              runStoryBeat: (id: string) => boolean;
            };
          };
        }
      ).__HOUSE_EDGE__.session;
      s.player.addCredits(200);
      s.world.unlock('feira-central');
      s.world.unlock('avenida-odds');
      s.player.setDistrict('avenida-odds');
      s.player.setPosition(16, 12);
      s.story.setFlag('unlocked_avenida', true);
      s.runStoryBeat('avenida-twist');
    });
    await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(900);
    const sample = await sampleFps(page);
    expect(
      sample.avgFps,
      `Odds dialog throttled avg FPS ${sample.avgFps}`,
    ).toBeGreaterThanOrEqual(50);
  });
});
