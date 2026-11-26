/**
 * Playtest #35: Augusto Fase 2 — Enter must submit the focused option's index.
 */
import { test, expect } from '@playwright/test';

test('Augusto Fase 2 Enter submits focused Livro nervoso / Ledger twitch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            startNew: () => void;
            player: { addCredits: (n: number) => void };
            story: { setFlag: (f: string, v: boolean) => void };
            world: { unlock: (id: string) => void };
            travelTo: (id: string) => boolean;
            runStoryBeat: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            submitSkill: (v: number) => boolean;
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    const s = he.session;
    s.startNew();
    s.player.addCredits(500);
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
      s.story.setFlag(f, true);
    }
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.world.unlock('torre-casa');
    s.travelTo('torre-casa');
    s.runStoryBeat('torre-final');
    s.acceptStoryBet();
    // Clear phase 1 timing with a forced hit (listener must die on repaint).
    // Playtest #46: drop needle arm so harness submitSkill is not a no-op.
    (s as unknown as { clearNeedleArm?: () => void }).clearNeedleArm?.();
    s.submitSkill(0.5);
    he.hud.syncScreen();
  });

  await expect(page.locator('.skill-choice').first()).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(500);
  const focused = page.locator('.skill-choice').nth(1);
  await focused.focus();
  await expect(focused).toBeFocused();
  expect(await focused.getAttribute('data-choice-index')).toBe('1');
  await page.evaluate(() => {
    (
      window as unknown as {
        __HOUSE_EDGE__: { session: { clearModalConfirmGate: () => void } };
      }
    ).__HOUSE_EDGE__.session.clearModalConfirmGate();
  });
  await page.keyboard.press('Enter');

  const after = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getSkillProgress: () => {
              phaseIndex: number;
              cleared: number;
              misses: number;
            } | null;
          };
        };
      }
    ).__HOUSE_EDGE__;
    const p = he.session.getSkillProgress();
    return {
      phase: p?.phaseIndex ?? -1,
      cleared: p?.cleared ?? -1,
      misses: p?.misses ?? -1,
    };
  });
  expect(after.misses, JSON.stringify(after)).toBe(0);
  expect(after.phase, JSON.stringify(after)).toBeGreaterThanOrEqual(2);
  expect(after.cleared, JSON.stringify(after)).toBeGreaterThanOrEqual(2);
});
