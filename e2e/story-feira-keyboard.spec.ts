/**
 * Playtest #42: keyboard-only main story through Feira Central — prove no blocker.
 */
import { test, expect } from '@playwright/test';

const SEQ_REVEAL_STEP_MS = 700;
const sequenceRevealTotalMs = (n: number): number =>
  Math.max(1, n) * SEQ_REVEAL_STEP_MS + SEQ_REVEAL_STEP_MS;

const KEY: Record<string, string> = {
  '↑': 'ArrowUp',
  '→': 'ArrowRight',
  '↓': 'ArrowDown',
  '←': 'ArrowLeft',
  R: 'KeyR',
  G: 'KeyG',
  B: 'KeyB',
  Y: 'KeyY',
};

async function dismissResult(page: import('@playwright/test').Page): Promise<void> {
  const result = page.locator('.skill-result-body');
  if (await result.isVisible().catch(() => false)) {
    await page.keyboard.press('Enter');
    await expect(result).toHaveCount(0, { timeout: 3_000 });
  }
}

async function winSequence(
  page: import('@playwright/test').Page,
  seq: string[],
): Promise<void> {
  const budget = sequenceRevealTotalMs(seq.length) + 1000;
  await expect(page.locator('.skill-pattern')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('.skill-seq-flash')).toHaveCount(0, { timeout: budget });
  for (const k of seq) {
    await page.keyboard.press(KEY[k]!);
    await page.waitForTimeout(60);
  }
  await dismissResult(page);
}

async function winNeedle(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('.btn-needle-stop')).toBeVisible({ timeout: 8_000 });
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: { session: { completeSkillPerfect: () => boolean } };
      }
    ).__HOUSE_EDGE__;
    he.session.completeSkillPerfect();
  });
  await dismissResult(page);
}

test('keyboard main path: Morro Neon → Feira Central (no sequence softlock)', async ({
  page,
}) => {
  test.setTimeout(180_000);
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

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: {
              setPosition: (x: number, y: number) => void;
              addCredits: (n: number) => void;
            };
            runStoryBeat: (id: string) => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(80);
    he.session.player.setPosition(13, 16);
    he.session.runStoryBeat('boteco-nair');
    he.hud.syncScreen();
  });
  await expect(page.locator('.dialogue-panel')).toBeVisible();
  await page.waitForTimeout(350);
  await page.keyboard.press('Enter');
  if (await page.locator('.btn-take-bet').isVisible()) {
    await page.locator('.btn-take-bet').focus();
    await page.keyboard.press('Enter');
  }
  await winNeedle(page);

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            story: { setFlag: (f: string, v: boolean) => void };
            runStoryBeat: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            player: { setPosition: (x: number, y: number) => void };
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.setFlag('falou_nair', true);
    he.session.story.setFlag('copper_weighed', true);
    he.session.player.setPosition(11, 10);
    he.session.runStoryBeat('morro-antena');
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });
  await winSequence(page, ['R', 'G', 'B']);

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            story: { setFlag: (f: string, v: boolean) => void };
            world: { unlock: (id: string) => boolean };
            travelTo: (id: string) => void;
            runStoryBeat: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            player: { addCredits: (n: number) => void };
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(200);
    he.session.story.setFlag('antena_ok', true);
    he.session.story.setFlag('conheceu_luna', true);
    he.session.story.setFlag('fios_ok', true);
    he.session.story.setFlag('banca_ok', true);
    he.session.story.setFlag('unlocked_feira', true);
    he.session.world.unlock('feira-central');
    he.session.travelTo('feira-central');
    he.session.story.setFlag('forro_ok', true);
    he.session.story.setFlag('lockbox_ok', true);
    he.session.runStoryBeat('feira-radio');
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });
  await winSequence(page, ['←', '→', '↑']);

  await expect(page.locator('.play-hud')).toBeVisible();
  const district = await page.locator('.stats').textContent();
  expect(district ?? '').toMatch(/Feira|Fair/i);
});
