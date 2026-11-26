/**
 * Playtest #43: needle gauge size, countdown ignore, pirateiro full reveal +
 * result card, Esc-cancel re-open Enter, title keyboard — at 1280×800.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.join('artifacts', 'playtest-43');
const SEQ_STEP = 1400;

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

test.use({ viewport: { width: 1280, height: 800 } });

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    (
      window as unknown as {
        __HOUSE_EDGE__: { session: { skipTutorialNow: () => void } };
      }
    ).__HOUSE_EDGE__.session.skipTutorialNow();
  });
}

test('needle meter is visible with non-zero size at 1280x800', async ({ page }) => {
  await boot(page);
  const opened = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { forceStorySkill: (id: string) => boolean };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    const ok =
      he.session.forceStorySkill('samba-odds') ||
      he.session.forceStorySkill('agua-gelada');
    he.hud.syncScreen();
    return ok;
  });
  expect(opened).toBe(true);
  const meter = page.locator('.skill-meter');
  await expect(meter).toBeVisible({ timeout: 5000 });
  const box = await meter.boundingBox();
  expect(box, 'meter bounding box').toBeTruthy();
  expect(box!.height, `meter height ${box!.height}`).toBeGreaterThanOrEqual(28);
  expect(box!.width, `meter width ${box!.width}`).toBeGreaterThanOrEqual(120);
  const zone = page.locator('.skill-zone');
  const z = await zone.boundingBox();
  expect(z!.height).toBeGreaterThanOrEqual(20);
  await page.screenshot({ path: path.join(ART, 'needle-gauge.png') });
});

test('E during needle countdown does not fail the phase', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { forceStorySkill: (id: string) => boolean };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.forceStorySkill('agua-gelada');
    he.hud.syncScreen();
  });
  await expect(page.locator('.skill-meter')).toBeVisible();
  await expect(page.locator('.skill-needle-ready')).toContainText(/Em|Ready/i);
  // Mash E during countdown.
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(40);
  }
  await expect(page.locator('.toast')).not.toContainText(/Errou|Missed|fase|phase/i);
  await expect(page.locator('.skill-meter')).toBeVisible();
  await expect(page.locator('.btn-needle-stop')).toBeVisible();
  // Wait for Já! then Stop should work.
  await expect(page.locator('.skill-needle-ready')).toContainText(/Já|Go/i, {
    timeout: 3000,
  });
});

test('pirateiro reveals every glyph then shows result card', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => void;
            story: { setFlag: (f: string, v: boolean) => void };
            forceStorySkill: (id: string) => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(300);
    he.session.world.unlock('feira-central');
    he.session.travelTo('feira-central');
    he.session.story.setFlag('lockbox_ok', true);
    he.session.forceStorySkill('feira-radio');
    he.hud.syncScreen();
  });
  const pattern = page.locator('.skill-pattern');
  await expect(pattern).toBeVisible();
  // Progressive reveal: eventually all three glyphs before input.
  await expect
    .poll(
      async () => {
        const t = (await pattern.textContent()) ?? '';
        const glyphs = t.match(/[←→↑↓]/g) ?? [];
        return glyphs.length;
      },
      { timeout: SEQ_STEP * 5 },
    )
    .toBe(3);
  const full = (await pattern.textContent()) ?? '';
  expect(full).toMatch(/←/);
  expect(full).toMatch(/→/);
  expect(full).toMatch(/↑/);
  // After full hold (≥2s), input arms — play the sequence.
  await expect(page.locator('.skill-seq-flash')).toHaveCount(0, {
    timeout: SEQ_STEP * 2 + 2500,
  });
  await expect(
    page.locator('.skill-seq').filter({ hasText: /Match 1|Repete|próxim/i }),
  ).toBeVisible();
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp'] as const) {
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.skill-result-panel')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: /Continuar|Continue/i })).toBeVisible();
});

test('Esc-cancel skill then re-open: first Enter advances Take bet', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: {
              addCredits: (n: number) => void;
              setPosition: (x: number, y: number) => void;
            };
            story: { setFlag: (f: string, v: boolean) => void };
            npcs: { id: string; x: number; y: number }[];
            interact: () => boolean;
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(120);
    he.session.story.setFlag('falou_nair', true);
    he.session.story.setFlag('copper_weighed', true);
    const npc = he.session.npcs.find((n) => n.id === 'antena-tech')!;
    he.session.player.setPosition(npc.x, npc.y + 1);
    he.session.interact();
  });
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect(page.locator('.skill-panel')).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.waitForTimeout(200);
  // Exact playtest repro: E to re-open, then a single Enter must Take the bet.
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.keyboard.press('KeyE');
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(350);
  await page.keyboard.press('Enter');
  await expect(page.locator('.skill-panel')).toBeVisible({ timeout: 5000 });
});

test('title screen ArrowDown + Enter starts New Game', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.title-screen button').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
  expect(focused).toMatch(/New Game|Novo jogo/i);
  await page.keyboard.press('Enter');
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 5000 });
});
