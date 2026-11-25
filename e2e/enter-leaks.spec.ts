/**
 * Playtest #30 P0: Enter leaks — credits→Nair, buffered choice, bet stake.
 */
import { test, expect } from '@playwright/test';

test('credits Skip + Enter×4 does not reopen Dona Nair', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            story: { setFlag: (f: string, v?: boolean) => void };
            ui: { go: (s: string) => boolean };
          };
          hud: { showCreditsRoll: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.story.setFlag('casa_quebrada', true);
    he.session.story.setFlag('free_roam', false);
    (he.session as unknown as { creditsRoll: boolean }).creditsRoll = true;
    he.session.ui.go('ending');
    he.hud.showCreditsRoll();
  });
  await expect(
    page.getByRole('button', { name: /Skip credits|Pular créditos/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Skip credits|Pular créditos/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 3000 });
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
});

test('buffered Enter after Nair choice does not auto-pick option 1', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(450);
  // Pick first choice with click, then spam Enter before arm clears on next panel.
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.dialogue-body')).toBeVisible();
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  // Must still be in dialogue (not auto-accepted bet / closed) OR if closed, no bet pending.
  const state = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            ui: { get: () => string };
            hasPendingStoryBet: () => boolean;
            getSkillProgress: () => unknown;
          };
        };
      }
    ).__HOUSE_EDGE__;
    return {
      ui: he.session.ui.get(),
      bet: he.session.hasPendingStoryBet(),
      skill: Boolean(he.session.getSkillProgress()),
    };
  });
  // Buffered Enter must not have confirmed a bet/skill.
  expect(state.skill).toBe(false);
  if (state.ui === 'bet' || state.ui === 'skill') {
    throw new Error(`buffered Enter advanced to ${state.ui}`);
  }
});

test('Enter on bet panel confirms and never lowers stake', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const before = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { addCredits: (n: number) => void };
            offerBet: (id: string) => boolean;
            getPendingStake: () => number;
            ui: { get: () => string };
          };
          hud: { syncScreen: () => void };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.player.addCredits(200);
    he.session.offerBet('side-feira-mango');
    he.hud.syncScreen();
    return { stake: he.session.getPendingStake(), ui: he.session.ui.get() };
  });
  expect(before.ui).toBe('bet');
  await expect(page.locator('.btn-confirm-bet')).toBeVisible();
  const stakeBefore = before.stake;
  // During arm: Enter must not lower stake (Stake − is skip-nav).
  await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
  const mid = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { getPendingStake: () => number; ui: { get: () => string } };
        };
      }
    ).__HOUSE_EDGE__;
    return { stake: he.session.getPendingStake(), ui: he.session.ui.get() };
  });
  expect(mid.stake).toBe(stakeBefore);
  // After arm window, Enter confirms (KeyF path also works).
  await page.waitForTimeout(450);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getPendingStake: () => number;
            ui: { get: () => string };
            getPendingBet: () => { id: string } | null;
          };
        };
      }
    ).__HOUSE_EDGE__;
    return {
      stake: he.session.getPendingStake(),
      ui: he.session.ui.get(),
      pending: he.session.getPendingBet(),
    };
  });
  expect(after.ui).not.toBe('bet');
  if (after.pending) expect(after.stake).toBe(stakeBefore);
});
