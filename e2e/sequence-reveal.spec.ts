/**
 * Playtest #41: sequence minigames must show a memorize reveal before input/timer.
 */
import { test, expect } from '@playwright/test';

async function openFeiraRadio(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => void;
            story: { setFlag: (f: string, v: boolean) => void };
            runStoryBeat: (id: string) => boolean;
            acceptStoryBet: () => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(300);
    he.session.world.unlock('feira-central');
    he.session.travelTo('feira-central');
    he.session.story.setFlag('lockbox_ok', true);
    he.session.runStoryBeat('feira-radio');
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });
  await expect(page.locator('.skill-pattern')).toBeVisible({ timeout: 8_000 });
}

test('feira-radio shows memorize reveal before input (not only dots)', async ({
  page,
}) => {
  await openFeiraRadio(page);
  const pattern = page.locator('.skill-pattern');
  const status = page.locator('.skill-seq').first();
  // Immediately after open: memorize copy + at least one real key visible.
  await expect(status).toContainText(/Memoriz|Memoriza/i);
  const early = await pattern.textContent();
  expect(early ?? '').toMatch(/[←→↑↓RGBY]/);
  expect(early ?? '').not.toMatch(/^Sequência:\s*(·\s*)+$/);
  // Timer must not be counting during the first beat of memorize.
  const timer = page.locator('.skill-seq-timer');
  await expect(timer).toHaveText('');
  // Mid-reveal: still flashing / building — never all-dots-only while memorizing.
  await page.waitForTimeout(900);
  const mid = await pattern.textContent();
  expect(mid ?? '').toMatch(/[←→↑↓RGBY]/);
  await expect(page.locator('.skill-seq-flash')).toBeVisible();
});

test('ATM sequence also reveals symbols before arming', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => void;
            offerBet: (id: string) => boolean;
            runStoryBeat: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            story: { setFlag: (f: string, v: boolean) => void };
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(400);
    for (const id of ['feira-central', 'avenida-odds'] as const) {
      he.session.world.unlock(id);
    }
    he.session.travelTo('avenida-odds');
    he.session.story.setFlag('unlocked_avenida', true);
    he.session.story.setFlag('server_ok', true);
    he.session.runStoryBeat('avenida-atm');
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });
  const pattern = page.locator('.skill-pattern');
  await expect(pattern).toBeVisible({ timeout: 8_000 });
  const text = await pattern.textContent();
  expect(text ?? '').toMatch(/[←→↑↓RGBY]/);
  await expect(page.locator('.skill-seq').first()).toContainText(/Memoriz|Memoriza/i);
});
