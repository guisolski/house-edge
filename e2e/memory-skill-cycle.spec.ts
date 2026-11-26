/**
 * Playtest #36: travel + minigame open/Esc cycles must keep heap and DOM bounded.
 */
import { test, expect } from '@playwright/test';

test('skill open/Esc ×50 keeps DOM + heap bounded', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const report = await page.evaluate(async () => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => boolean;
            offerBet: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            cancelBet: () => void;
            bus: { totalListeners: () => number };
            ui: { is: (s: string) => boolean; get: () => string };
          };
          hud: { syncScreen: () => void; showHud: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(800);
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa'] as const) {
      he.session.world.unlock(id);
    }
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    const sample = (): number => perf.memory?.usedJSHeapSize ?? 0;
    const gc = (): void => {
      const g = (window as unknown as { gc?: () => void }).gc;
      if (typeof g === 'function') g();
    };
    const cycle = async (): Promise<void> => {
      he.session.travelTo('avenida-odds');
      he.session.offerBet('agua-gelada');
      he.hud.syncScreen();
      await new Promise((r) => setTimeout(r, 16));
      he.session.cancelBet();
      he.hud.showHud();
      he.session.travelTo('feira-central');
      he.session.offerBet('feira-lockbox');
      he.hud.syncScreen();
      await new Promise((r) => setTimeout(r, 16));
      he.session.cancelBet();
      he.hud.showHud();
    };
    // Warm caches + first skill paint.
    await cycle();
    await cycle();
    gc();
    await new Promise((r) => setTimeout(r, 80));
    const baselineHeap = sample();
    const baselineNodes = document.querySelectorAll('*').length;
    const baselineBus = he.session.bus.totalListeners();
    for (let i = 0; i < 50; i += 1) await cycle();
    gc();
    await new Promise((r) => setTimeout(r, 100));
    return {
      heapDelta: sample() - baselineHeap,
      nodeDelta: document.querySelectorAll('*').length - baselineNodes,
      busDelta: he.session.bus.totalListeners() - baselineBus,
      hasMemory: baselineHeap > 0,
      ui: he.session.ui.get(),
    };
  });

  expect(report.ui).toBe('play');
  expect(report.busDelta, JSON.stringify(report)).toBe(0);
  expect(report.nodeDelta, JSON.stringify(report)).toBeLessThan(80);
  expect(report.hasMemory).toBe(true);
  // 50 skill open/close cycles — allow modest GC noise, not multi‑MB growth.
  expect(report.heapDelta, JSON.stringify(report)).toBeLessThan(20 * 1024 * 1024);
});
