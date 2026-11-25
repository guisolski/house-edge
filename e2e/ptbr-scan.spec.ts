/**
 * Playtest #27: first district in pt-BR — scan visible HUD/dialog text for
 * English leftovers from a blocklist.
 */
import { test, expect } from '@playwright/test';

const ENGLISH_BLOCKLIST = [
  'WASD move ·', // not "WASD mover" (pt-BR)
  'Stake at risk',
  'Green zone',
  'Ready to roll',
  'Win chance',
  'Nobody in range',
  'Missed the pour',
  'Stop!',
  'Esc cancels',
  'Take the bet',
  'Walk away',
  'New Game',
  'Side Jobs',
  'Upgrades',
];

test('pt-BR first district: no English HUD/dialog leftovers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Português (Brasil)' }).click();
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });

  const blob = await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll(
        '.play-hud, .input-hints, .objective, .dialogue-panel, .toast, .tutorial-panel',
      ),
    ];
    return nodes.map((n) => n.textContent ?? '').join('\n');
  });
  const hits = ENGLISH_BLOCKLIST.filter((w) => blob.includes(w));
  expect(hits, `English leftovers in pt-BR UI:\n${blob}`).toEqual([]);
});
