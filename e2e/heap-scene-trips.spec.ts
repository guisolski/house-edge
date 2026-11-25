/**
 * Playtest #30: heap must not grow unboundedly across district round-trips.
 */
import { test, expect } from '@playwright/test';

test('heap growth stays bounded across 3 scene round trips', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const report = await page.evaluate(async () => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => boolean;
            player: { setDistrict: (id: string) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) {
      he.session.world.unlock(id);
    }
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    const sample = (): number => perf.memory?.usedJSHeapSize ?? 0;
    // Warm once so caches settle.
    he.session.travelTo('feira-central');
    await new Promise((r) => setTimeout(r, 200));
    he.session.travelTo('avenida-odds');
    await new Promise((r) => setTimeout(r, 200));
    if (typeof (window as unknown as { gc?: () => void }).gc === 'function') {
      (window as unknown as { gc: () => void }).gc();
    }
    await new Promise((r) => setTimeout(r, 100));
    const baseline = sample();
    const loop = ['morro-neon', 'feira-central', 'avenida-odds', 'torre-casa'] as const;
    for (let trip = 0; trip < 3; trip += 1) {
      for (const id of loop) {
        he.session.travelTo(id);
        await new Promise((r) => setTimeout(r, 120));
      }
    }
    if (typeof (window as unknown as { gc?: () => void }).gc === 'function') {
      (window as unknown as { gc: () => void }).gc();
    }
    await new Promise((r) => setTimeout(r, 150));
    const after = sample();
    return { baseline, after, delta: after - baseline, hasMemory: baseline > 0 };
  });

  // Chromium exposes performance.memory in Playwright — require bounded growth.
  expect(report.hasMemory).toBe(true);
  // 3 full district loops should stay under ~12MB growth after warm caches.
  expect(report.delta, JSON.stringify(report)).toBeLessThan(12 * 1024 * 1024);
});
