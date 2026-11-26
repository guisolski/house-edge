/**
 * Playtest #48: sequence memorize hold shows ALL glyphs for ≥2s (× 1/timescale)
 * with a visible Memorize bar; input timer starts only after hold ends.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.join('artifacts', 'panels-v1.22.24');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

async function openHack(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('house-edge-locale', 'pt-BR');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/?minigame=hack&timescale=1');
  await page.evaluate(() => {
    (
      window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
    ).__HOUSE_EDGE__.forceMode('keyboard');
  });
  await expect(page.locator('.skill-panel:not([hidden])')).toBeVisible({
    timeout: 12_000,
  });
}

test('sequence hold keeps all glyphs ≥2s with Memorize bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHack(page);

  // Wait until hold phase (full glyphs, no ·).
  await page.waitForFunction(
    () => {
      const panel = document.querySelector(
        '.skill-panel:not([hidden])',
      ) as HTMLElement | null;
      if (!panel || panel.dataset.seqPhase !== 'hold') return false;
      const pat = panel.querySelector('.skill-pattern') as HTMLElement | null;
      const text = pat?.textContent ?? '';
      return text.length > 0 && !text.includes('·');
    },
    { timeout: 20_000 },
  );

  const bar = page.locator('.skill-memorize-bar');
  await expect(bar).toBeVisible();

  // Sample for ≥2s wall-clock that glyphs stay complete during hold.
  const samples: string[] = [];
  const start = Date.now();
  while (Date.now() - start < 2000) {
    const phase = await page.evaluate(() => {
      const panel = document.querySelector(
        '.skill-panel:not([hidden])',
      ) as HTMLElement | null;
      const pat = panel?.querySelector('.skill-pattern') as HTMLElement | null;
      return {
        phase: panel?.dataset.seqPhase ?? '',
        text: pat?.textContent ?? '',
        timer: (panel?.querySelector('.skill-seq-timer') as HTMLElement | null)
          ?.textContent,
      };
    });
    if (phase.phase === 'hold') {
      samples.push(phase.text);
      expect(phase.text).not.toContain('·');
      // Timer must not be counting during hold.
      expect(phase.timer ?? '').not.toMatch(/Timer\s+\d/);
    }
    await page.waitForTimeout(100);
  }
  expect(samples.length).toBeGreaterThanOrEqual(8);

  await page.screenshot({ path: path.join(ART, 'sequence-hold-desktop.png') });

  // After hold, input arms (dots for remaining).
  await page.waitForFunction(
    () =>
      (document.querySelector('.skill-panel:not([hidden])') as HTMLElement | null)
        ?.dataset.seqPhase === 'input',
    { timeout: 8_000 },
  );
  await expect(page.locator('.skill-seq-timer')).toContainText(/Timer/i);
});
