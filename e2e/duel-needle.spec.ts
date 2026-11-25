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
  return page.evaluate(() => {
    const session = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
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

async function placeNeedleInDrawnZone(
  page: Page,
): Promise<{ ok: true; left: number; width: number } | { ok: false; reason: string }> {
  return page.evaluate(() => {
    const meter = document.querySelector('.skill-meter') as HTMLElement | null;
    const zone = document.querySelector('.skill-zone') as HTMLElement | null;
    const needle = document.querySelector('.skill-needle') as HTMLElement | null;
    if (!zone || !needle) return { ok: false as const, reason: 'missing-dom' };
    const tickId = Number(meter?.dataset.needleTick ?? '');
    if (Number.isFinite(tickId)) window.clearInterval(tickId);
    const left = parseFloat(zone.style.left);
    const width = parseFloat(zone.style.width);
    needle.style.left = `${left + width / 2}%`;
    return { ok: true as const, left, width };
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
    (
      window as unknown as { __HOUSE_EDGE__: { hud: { showSkill: () => void } } }
    ).__HOUSE_EDGE__.hud.showSkill();
  });
  await expect(page.locator('.skill-zone')).toBeVisible();

  const stopResult = await placeNeedleInDrawnZone(page);
  expect(stopResult.ok, JSON.stringify(stopResult)).toBe(true);

  await page.screenshot({ path: path.join(ART, '14-duel-needle-in-zone.png') });
  await page.getByRole('button', { name: 'Stop!' }).click();

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
