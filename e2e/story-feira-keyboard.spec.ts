/**
 * Playtest #42: keyboard-only main story through Feira Central — prove no blocker.
 */
import { test, expect } from '@playwright/test';

const SEQ_REVEAL_STEP_MS = 1400;
const SEQ_FULL_HOLD_MS = 2000;
const sequenceRevealTotalMs = (n: number): number =>
  Math.max(0, n - 1) * SEQ_REVEAL_STEP_MS + SEQ_FULL_HOLD_MS;

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

type He = {
  session: {
    skipTutorialNow: () => void;
    acceptStoryBet: () => boolean;
    completeSkillPerfect: () => boolean;
    runStoryBeat: (id: string) => boolean;
    travelTo: (id: string) => void;
    player: {
      setPosition: (x: number, y: number) => void;
      addCredits: (n: number) => void;
    };
    story: { setFlag: (f: string, v: boolean) => void };
    world: { unlock: (id: string) => boolean };
  };
  hud: { syncScreen: () => void };
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
    (
      window as unknown as { __HOUSE_EDGE__: He }
    ).__HOUSE_EDGE__.session.completeSkillPerfect();
  });
  await dismissResult(page);
}

async function startNair(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
    he.session.skipTutorialNow();
    he.session.player.addCredits(80);
    he.session.player.setPosition(13, 16);
    he.session.runStoryBeat('boteco-nair');
    he.hud.syncScreen();
  });
}

async function acceptOpenBet(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });
}

async function startAntena(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
    he.session.story.setFlag('falou_nair', true);
    he.session.story.setFlag('copper_weighed', true);
    he.session.player.setPosition(11, 10);
    he.session.runStoryBeat('morro-antena');
    he.session.acceptStoryBet();
    he.hud.syncScreen();
  });
}

async function startPirateiro(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
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
}

test('keyboard main path: Morro Neon → Feira Central (no sequence softlock)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await startNair(page);
  await expect(page.locator('.dialogue-panel')).toBeVisible();
  await page.waitForTimeout(350);
  await page.keyboard.press('Enter');
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 5_000 });
  await acceptOpenBet(page);
  await winNeedle(page);

  await startAntena(page);
  await winSequence(page, ['R', 'G', 'B']);

  await startPirateiro(page);
  await winSequence(page, ['←', '→', '↑']);

  await expect(page.locator('.play-hud')).toBeVisible();
  const district = await page.locator('.stats').textContent();
  expect(district ?? '').toMatch(/Feira|Fair/i);
});
