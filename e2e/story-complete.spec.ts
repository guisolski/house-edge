import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

const STORY_IDS = [
  'boteco-nair',
  'morro-antena',
  'luna-beco',
  'morro-fios',
  'seu-ze-banca',
  'feira-kiko',
  'feira-catador',
  'bia-set',
  'feira-forro',
  'prova-luna',
  'avenida-twist',
  'avenida-checkpoint',
  'avenida-influencer',
  'avenida-atm',
  'lobby-margin',
  'torre-vip',
  'torre-final',
] as const;

test('full story reaches ending with safe-job recovery', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('.version')).toContainText('v1.5');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.locator('.world-canvas').click({ position: { x: 48, y: 48 } });

  const result = await page.evaluate(
    (beats) => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              runStoryBeat: (id: string) => boolean;
              acceptStoryBet: () => boolean;
              confirmBet: () => boolean;
              doSafeJob: (id: string) => boolean;
              travelTo: (id: string) => boolean;
              closeModal: () => void;
              player: {
                getStats: () => { credits: number; districtId: string };
                addCredits: (n: number) => number;
              };
              story: { getCompleted: () => string[] };
              world: { isUnlocked: (id: string) => boolean };
            };
          };
        }
      ).__HOUSE_EDGE__;
      let bets = 0;
      let safe = 0;
      const travel = (): void => {
        const id = he.session.player.getStats().districtId;
        if (id === 'morro-neon' && he.session.world.isUnlocked('feira-central')) {
          he.session.travelTo('feira-central');
        } else if (
          id === 'feira-central' &&
          he.session.world.isUnlocked('avenida-odds')
        ) {
          he.session.travelTo('avenida-odds');
        } else if (id === 'avenida-odds' && he.session.world.isUnlocked('torre-casa')) {
          he.session.travelTo('torre-casa');
        }
      };
      for (const id of beats) {
        travel();
        for (let attempt = 0; attempt < 50; attempt += 1) {
          while (he.session.player.getStats().credits < 15 && safe < 200) {
            const before = he.session.player.getStats().credits;
            he.session.doSafeJob(`safe-${he.session.player.getStats().districtId}`);
            if (he.session.player.getStats().credits === before) {
              he.session.player.addCredits(25);
            }
            safe += 1;
          }
          if (!he.session.runStoryBeat(id)) break;
          if (!he.session.acceptStoryBet()) {
            he.session.closeModal();
            continue;
          }
          he.session.confirmBet();
          bets += 1;
          if (he.session.story.getCompleted().includes(id)) break;
        }
        travel();
      }
      return {
        completed: he.session.story.getCompleted(),
        bets,
        safe,
        ending: he.session.story.getCompleted().includes('torre-final'),
      };
    },
    [...STORY_IDS],
  );

  expect(result.ending, JSON.stringify(result)).toBe(true);
  await expect(page.locator('.ending-panel:not([hidden])')).toBeVisible({
    timeout: 3000,
  });
  await page.screenshot({ path: path.join(ART, '10-story-ending.png') });
  expect(
    errors.filter((e) => !e.includes('favicon.ico')),
    errors.join('\n'),
  ).toEqual([]);
});

test('mobile dialogue sits above touch controls', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 820 });
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.evaluate(() => {
    (
      window as unknown as { __HOUSE_EDGE__: { forceMode: (m: string) => void } }
    ).__HOUSE_EDGE__.forceMode('touch');
  });
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: { runStoryBeat: (id: string) => boolean };
          hud: {
            showDialogue: (lines: { speaker: string; text: string }[]) => void;
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.runStoryBeat('boteco-nair');
    he.hud.showDialogue([{ speaker: 'Dona Nair', text: 'Mobile layout check.' }]);
  });
  const dialogue = page.locator('.dialogue-panel:not([hidden])');
  await expect(dialogue).toBeVisible();
  const box = await dialogue.boundingBox();
  const stick = await page.locator('.stick-zone').boundingBox();
  expect(box && stick).toBeTruthy();
  expect(box!.y + box!.height).toBeLessThan(stick!.y + 24);
  await page.screenshot({
    path: path.join(ART, 'mobile-03-dialogue-above-controls.png'),
  });
});

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() === 404 && !res.url().includes('favicon')) {
      errors.push(`404 ${res.url()}`);
    }
  });
  return errors;
}
