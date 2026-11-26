/**
 * Playtest #35: 60ms Enter mash at Contato Vira-Casaca must not auto-pick Culpar a Luna.
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

async function openContatoChoices(page: import('@playwright/test').Page): Promise<void> {
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
            offerBet: (id: string) => boolean;
            acceptStoryBet: () => boolean;
            runStoryBeat: (id: string) => boolean;
            ui: { go: (s: string) => boolean; is: (s: string) => boolean };
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
    he.session.story.setFlag('radar_ok', true);
    he.session.story.setFlag('avenida_ok', true);
    he.session.story.setFlag('stealth_ok', true);
    // Contato betrayal skill — Culpar a Luna is option 0 (wrong).
    he.session.runStoryBeat('avenida-betrayal');
    he.hud.syncScreen();
  });
  // Dialogue choice → Take bet → skill (Culpar a Luna / …)
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(500);
  await page.locator('.dialogue-choice').first().click();
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 3_000 });
  await page.locator('.btn-take-bet').click();
  await expect(page.locator('.skill-choice').first()).toBeVisible({ timeout: 8_000 });
}

test('Contato 30× Enter @60ms does not auto-pick Culpar a Luna', async ({ page }) => {
  await openContatoChoices(page);
  const choices = page.locator('.skill-choice');
  await expect(choices).toHaveCount(3);
  // Mash from open through arm + after focus — must not settle.
  await burstEnter(page, 30, 60);
  await expect(choices.first()).toBeVisible();
  await expect(page.locator('.skill-choice')).toHaveCount(3);
  const phase = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            getSkillProgress: () => { phaseIndex: number; misses: number } | null;
            ui: { get: () => string };
          };
        };
      }
    ).__HOUSE_EDGE__;
    const p = he.session.getSkillProgress();
    return {
      ui: he.session.ui.get(),
      phase: p?.phaseIndex ?? -1,
      misses: p?.misses ?? -1,
    };
  });
  expect(phase.ui).toBe('skill');
  expect(phase.phase).toBe(0);
});
