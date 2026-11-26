import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

type HeSession = {
  startNew: () => void;
  story: { setFlag: (f: string, v: boolean) => void };
  world: { unlock: (id: string) => void };
  travelTo: (id: string) => boolean;
  runStoryBeat: (id: string) => boolean;
  acceptStoryBet: () => boolean;
  getSkillProgress: () => {
    phaseIndex: number;
    misses: number;
    cleared: number;
    done: boolean;
  } | null;
  submitSkill: (v: number) => boolean;
  ui: { is: (s: string) => boolean };
  player: {
    addCredits: (n: number) => number;
    getStats: () => { credits: number };
  };
};

async function bootDuelSkill(page: Page): Promise<{ skill: boolean; phase: number }> {
  return page.evaluate(() => {
    const session = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    session.startNew();
    session.player.addCredits(500);
    for (const f of [
      'conheceu_rita',
      'falou_nair',
      'antena_ok',
      'feira_ok',
      'avenida_ok',
      'vazamento_ok',
      'vip_ok',
      'negotiate_ok',
    ]) {
      session.story.setFlag(f, true);
    }
    session.world.unlock('feira-central');
    session.world.unlock('avenida-odds');
    session.world.unlock('torre-casa');
    session.travelTo('torre-casa');
    session.runStoryBeat('torre-final');
    session.acceptStoryBet();
    return {
      skill: session.ui.is('skill'),
      phase: session.getSkillProgress()?.phaseIndex ?? -1,
    };
  });
}

async function missOutsideZone(page: Page): Promise<{
  credits: number;
  before: number;
  phase: number | undefined;
  misses: number | undefined;
  done: boolean | undefined;
}> {
  // Playtest #46: wait until Stop is armed — unarmed submitSkill is a no-op.
  await expect(page.locator('.btn-needle-stop')).toBeEnabled({ timeout: 5500 });
  return page.evaluate(() => {
    const session = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: HeSession & {
            clearNeedleArm?: () => void;
            retrySkillMiss?: () => void;
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    session.clearNeedleArm?.();
    const before = session.player.getStats().credits;
    session.submitSkill(0.05);
    const p = session.getSkillProgress();
    return {
      credits: session.player.getStats().credits,
      before,
      phase: p?.phaseIndex,
      misses: p?.misses,
      done: p?.done,
    };
  });
}

/**
 * Stop on the first frame the visible needle is inside the drawn zone.
 * No DOM mutation — samples player-visible styles, then clicks Stop same tick.
 */
async function stopWhenNeedleInDrawnZone(page: Page): Promise<boolean> {
  // Playtest #38: wait out the ready countdown before Stop can count.
  await expect(page.locator('.skill-needle-ready')).toContainText(/Go|Já/i, {
    timeout: 5500,
  });
  await expect(page.locator('.btn-needle-stop')).toBeEnabled({ timeout: 1000 });
  return page.evaluate(async () => {
    const deadline = performance.now() + 12_000;
    while (performance.now() < deadline) {
      const zone = document.querySelector('.skill-zone') as HTMLElement | null;
      const needle = document.querySelector('.skill-needle') as HTMLElement | null;
      const btn = document.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
      if (zone && needle && btn && !btn.disabled) {
        const left = parseFloat(zone.style.left);
        const width = parseFloat(zone.style.width);
        const at = parseFloat(needle.style.left);
        if (
          [left, width, at].every(Number.isFinite) &&
          at >= left &&
          at <= left + width
        ) {
          btn.click();
          return true;
        }
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return false;
  });
}

/**
 * P0 regression: duel phase-1 Stop must judge the drawn green zone
 * (needle position at input), not an inverted / delayed window.
 */
test('duel needle Stop inside drawn zone advances phase', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const setup = await bootDuelSkill(page);
  expect(setup.skill).toBe(true);
  expect(setup.phase).toBe(0);

  await expect(page.locator('.skill-panel')).toBeVisible();
  await expect(page.locator('.skill-zone')).toBeVisible();

  const miss = await missOutsideZone(page);
  expect(miss.credits).toBe(miss.before);
  expect(miss.phase).toBe(0);
  expect(miss.misses).toBeGreaterThan(0);
  expect(miss.done).toBe(false);

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { retrySkillMiss?: () => void; getSkillMissCard?: () => unknown };
          hud: { showSkill: () => void; syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    if (he.session.getSkillMissCard?.()) he.session.retrySkillMiss?.();
    he.hud.syncScreen();
    he.hud.showSkill();
  });
  await expect(page.locator('.skill-zone')).toBeVisible();

  // Playtest #33: judge from live needle + zone (not DOM mutation / internal state).
  const stopped = await stopWhenNeedleInDrawnZone(page);
  expect(stopped).toBe(true);
  await page.screenshot({ path: path.join(ART, '14-duel-needle-in-zone.png') });

  const after = await page.evaluate(() => {
    const session = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    const p = session.getSkillProgress();
    return {
      phase: p?.phaseIndex ?? -1,
      cleared: p?.cleared ?? -1,
    };
  });
  expect(after.cleared, JSON.stringify(after)).toBeGreaterThanOrEqual(1);
  expect(after.phase, JSON.stringify(after)).toBeGreaterThanOrEqual(1);
});
