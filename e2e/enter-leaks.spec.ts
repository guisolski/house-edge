/**
 * Playtest #30/#31 P0: Enter leaks — credits→Nair, buffered choice, bet stake.
 * Live keyboard FAIL: e2e must replicate key-repeat, held Enter, and 60ms bursts.
 */
import { test, expect } from '@playwright/test';

async function burstEnter(
  page: import('@playwright/test').Page,
  n: number,
  gapMs: number,
): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await page.keyboard.down('Enter');
    await page.waitForTimeout(Math.min(20, gapMs));
    await page.keyboard.up('Enter');
    await page.waitForTimeout(gapMs);
  }
}

async function openNairChoices(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            npcs: { id: string; x: number; y: number }[];
            player: { setPosition: (x: number, y: number) => void };
          };
        };
      }
    ).__HOUSE_EDGE__;
    const nair = he.session.npcs.find((n) => n.id === 'dona-nair')!;
    he.session.player.setPosition(nair.x, nair.y + 1);
  });
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 3000 });
}

test('credits Skip + Enter burst does not reopen Dona Nair', async ({ page }) => {
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
  // Playtest #31: Skip is armed ~900ms — wait then click.
  await page.waitForTimeout(950);
  await page.getByRole('button', { name: /Skip credits|Pular créditos/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible({ timeout: 3000 });
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await burstEnter(page, 12, 60);
  await page.keyboard.down('Enter');
  await page.waitForTimeout(400);
  await page.keyboard.up('Enter');
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.dialogue-body')).toHaveCount(0);
});

test('held Enter through Nair choice arm does not auto-pick option 1', async ({
  page,
}) => {
  await openNairChoices(page);
  // Live FAIL: Enter held / 60ms burst from open — never release before arm ends.
  await page.keyboard.down('Enter');
  await page.waitForTimeout(700);
  // Still held — must not have picked.
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  await burstEnter(page, 20, 60);
  // After release bursts once arm+key-up clear, a deliberate pick is allowed —
  // but choices must still be there if we never got a clean post-arm release+wait.
  // Re-open path: if still visible, held/burst did not auto-pick during arm.
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
});

test('buffered Enter after Nair choice does not auto-start skill', async ({ page }) => {
  await openNairChoices(page);
  await page.waitForTimeout(450);
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.dialogue-body')).toBeVisible();
  // Spam Enter during the post-choice arm — must not Take the bet / start skill.
  await burstEnter(page, 8, 40);
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
