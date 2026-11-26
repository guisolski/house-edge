/**
 * Playtest #42: every sequence minigame must finish its memorize reveal and
 * accept the shown sequence via real keyboard input.
 */
import { test, expect } from '@playwright/test';

const SEQ_REVEAL_STEP_MS = 1400;
const SEQ_FULL_HOLD_MS = 2000;
/** Progressive glyphs + ≥2s full hold (playtest #45). */
const sequenceRevealTotalMs = (n: number): number =>
  Math.max(0, n - 1) * SEQ_REVEAL_STEP_MS + SEQ_FULL_HOLD_MS;

type SeqKey = '↑' | '→' | '↓' | '←' | 'R' | 'G' | 'B' | 'Y';

const KEY: Record<SeqKey, string> = {
  '↑': 'ArrowUp',
  '→': 'ArrowRight',
  '↓': 'ArrowDown',
  '←': 'ArrowLeft',
  R: 'KeyR',
  G: 'KeyG',
  B: 'KeyB',
  Y: 'KeyY',
};

/** Mirrors SKILL_PHASE_TABLE sequence bets (except in-world Neon Snap). */
const SEQUENCE_BETS: { id: string; seq: SeqKey[] }[] = [
  { id: 'antena-sinal', seq: ['R', 'G', 'B'] },
  { id: 'fio-corrida', seq: ['↑', '→', '↓', '←'] },
  { id: 'corrida-moto', seq: ['→', '→', '↓', '→'] },
  { id: 'feira-radio', seq: ['←', '→', '↑'] },
  { id: 'twist-vazamento', seq: ['B', 'Y', 'R'] },
  { id: 'avenida-atm', seq: ['↑', '↓', '←', '→'] },
  { id: 'avenida-stealth', seq: ['←', '↑', '→', '↑', '→'] },
  { id: 'morro-return-fio', seq: ['G', 'B', 'G'] },
  { id: 'courier-tip', seq: ['→', '↓', '←', '↑'] },
];

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

async function openSequenceBet(
  page: import('@playwright/test').Page,
  betId: string,
): Promise<void> {
  await page.evaluate((id) => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            world: { unlock: (d: string) => boolean };
            forceStorySkill: (betId: string) => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(500);
    for (const d of ['feira-central', 'avenida-odds', 'torre-casa'] as const) {
      he.session.world.unlock(d);
    }
    he.session.forceStorySkill(id);
    he.hud.syncScreen();
  }, betId);
  await expect(page.locator('.skill-pattern')).toBeVisible({ timeout: 8_000 });
}

test.describe('sequence reveal + keyboard win', () => {
  for (const { id, seq } of SEQUENCE_BETS) {
    test(`${id}: reveal ends and keyboard wins`, async ({ page }) => {
      test.setTimeout(90_000);
      await boot(page);
      await openSequenceBet(page, id);
      const budget = sequenceRevealTotalMs(seq.length) + 800;
      await expect
        .poll(
          async () => {
            const flash = await page.locator('.skill-seq-flash').count();
            const status =
              (await page
                .locator('.skill-seq')
                .filter({ hasText: /Match \d|Repete|próxim/i })
                .first()
                .textContent()
                .catch(() => '')) ?? '';
            return flash === 0 && /Match \d|Repete|próxim/i.test(status);
          },
          { timeout: budget },
        )
        .toBe(true);
      for (const key of seq) {
        await page.keyboard.press(KEY[key]!);
        await page.waitForTimeout(80);
      }
      await expect
        .poll(
          async () => {
            const result = await page
              .locator('.skill-result-body, .skill-result-win')
              .count();
            const pins = await page.locator('.skill-pattern').count();
            const play = await page.locator('.play-hud').isVisible();
            return result > 0 || (pins === 0 && play);
          },
          { timeout: 8_000 },
        )
        .toBe(true);
    });
  }

  test('reveal always finishes within budget (antena-sinal)', async ({ page }) => {
    await boot(page);
    await openSequenceBet(page, 'antena-sinal');
    // Allow one extra step of slack for slow CI timers.
    const budget = sequenceRevealTotalMs(3) + SEQ_REVEAL_STEP_MS;
    await expect(page.locator('.skill-pattern')).toContainText(/R/);
    await expect(page.locator('.skill-seq-flash')).toBeVisible();
    await expect(page.locator('.skill-seq-flash')).toHaveCount(0, { timeout: budget });
  });
});
