/**
 * Playtest #28: pt-BR — scan visible HUD/dialog (and a short story harness)
 * for English leftovers from a blocklist. Keep under eslint max-lines.
 */
import { test, expect, type Page } from '@playwright/test';

const ENGLISH_BLOCKLIST = [
  'WASD move ·',
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
  'Travel to',
  'Ride up',
  'Ride down',
  'Odd jobs',
  'SIDE HUSTLE',
  'Clue:',
  'Path locked',
  'Offer expires',
  'Ice-cold water',
];

async function visibleBlob(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll(
        '.play-hud, .input-hints, .objective, .dialogue-panel, .toast, .tutorial-panel, .menu-panel, .jobs-panel, .travel-panel',
      ),
    ];
    return nodes.map((n) => n.textContent ?? '').join('\n');
  });
}

function assertNoEnglish(blob: string): void {
  const hits = ENGLISH_BLOCKLIST.filter((w) => blob.includes(w));
  expect(hits, `English leftovers in pt-BR UI:\n${blob}`).toEqual([]);
}

test('pt-BR first district: no English HUD/dialog leftovers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Português (Brasil)' }).click();
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-body')).toBeVisible({ timeout: 3000 });
  assertNoEnglish(await visibleBlob(page));
});

test('pt-BR story harness: Morro → Fair prompts stay localized', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Português (Brasil)' }).click();
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            story: {
              setFlag: (k: string, v: boolean) => void;
              completeBeat: (id: string) => void;
            };
            player: { setPosition: (x: number, y: number) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.completeBeat('intro-laje');
    he.session.story.completeBeat('boteco-nair');
    he.session.story.setFlag('conheceu_rita', true);
    he.session.story.setFlag('agua_ok', true);
    he.session.world.unlock('feira-central');
    he.session.player.setPosition(37, 22);
  });
  await page.waitForTimeout(250);
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  assertNoEnglish(await visibleBlob(page));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Bicos|Side Jobs/i }).click().catch(() => undefined);
  await page.waitForTimeout(150);
  assertNoEnglish(await visibleBlob(page));
});
