import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

const PRE_DUEL_BEATS = [
  'boteco-nair',
  'side-morro-copper',
  'morro-antena',
  'luna-beco',
  'morro-fios',
  'seu-ze-banca',
  'feira-kiko',
  'feira-catador',
  'bia-set',
  'feira-dancer',
  'feira-forro',
  'feira-lockbox',
  'feira-radio',
  'feira-tipster',
  'feira-courier',
  'prova-luna',
  'avenida-twist',
  'avenida-checkpoint',
  'avenida-courier',
  'avenida-influencer',
  'avenida-drone',
  'avenida-radar',
  'avenida-server',
  'avenida-atm',
  'avenida-stealth',
  'avenida-betrayal',
  'lobby-margin',
  'morro-return-nair',
  'morro-return-fio',
  'torre-foyer',
  'torre-pit',
  'torre-elevator',
  'torre-vip',
  'torre-negotiate',
] as const;

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

type Obj = { text: string; targetName?: string };

async function seedPreDuel(page: Page, beats: readonly string[]): Promise<void> {
  await page.evaluate((ids) => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            story: {
              completeBeat: (id: string) => unknown;
              setFlag: (f: string, v: boolean) => void;
            };
            world: { unlock: (id: string) => boolean };
            player: {
              setDistrict: (id: string) => void;
              addCredits: (n: number) => number;
            };
            ui: { go: (s: string) => boolean };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) s.world.unlock(id);
    for (const id of ids) s.story.completeBeat(id);
    for (const f of ['pit_ok', 'elevator_ok', 'vip_ok', 'negotiate_ok']) {
      s.story.setFlag(f, true);
    }
    s.player.addCredits(5000);
    s.player.setDistrict('torre-casa');
    (s as unknown as { vipFloor: boolean }).vipFloor = true;
    s.ui.go('play');
  }, beats);
}

async function rideElevator(page: Page, npcId: string): Promise<string | null> {
  return page.evaluate(async (id) => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            floorNpcs: () => { id: string; x: number; y: number }[];
            player: { setPosition: (x: number, y: number) => void };
            interact: () => boolean;
            ui: { go: (s: string) => boolean };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    const pad = s.floorNpcs().find((n) => n.id === id);
    if (!pad) return `missing ${id}`;
    s.player.setPosition(pad.x, pad.y);
    s.interact();
    await new Promise((r) => setTimeout(r, 1300));
    s.ui.go('play');
    return null;
  }, npcId);
}

async function readObjective(page: Page): Promise<Obj & { vip: boolean }> {
  return page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            objective: () => Obj;
            isVipFloor: () => boolean;
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    return { ...s.objective(), vip: s.isVipFloor() };
  });
}

async function completeDuel(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            floorNpcs: () => { name: string; x: number; y: number }[];
            player: { setPosition: (x: number, y: number) => void };
            interact: () => boolean;
            ui: { is: (s: string) => boolean };
            acceptStoryBet: () => boolean;
            confirmBet: () => boolean;
            completeSkillPerfect: () => boolean;
            closeModal: () => void;
            story: { getCompleted: () => string[] };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    const ceo = s.floorNpcs().find((n) => n.name === 'Augusto Casa');
    if (!ceo) return false;
    s.player.setPosition(ceo.x, ceo.y);
    s.interact();
    await sleep(40);
    if (s.ui.is('dialogue')) {
      s.acceptStoryBet();
      await sleep(40);
    }
    if (s.ui.is('bet')) {
      s.confirmBet();
      await sleep(40);
    }
    while (s.ui.is('skill')) {
      s.completeSkillPerfect();
      await sleep(20);
    }
    s.closeModal();
    await sleep(40);
    return s.story.getCompleted().includes('torre-final');
  });
}

/** P0 regression: ride VIP ↓ to lobby, then ↑ and finish Augusto. */
test('VIP down then elevator up reaches and completes the duel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await seedPreDuel(page, PRE_DUEL_BEATS);

  expect(await rideElevator(page, 'elevator-vip')).toBeNull();
  const afterDown = await readObjective(page);
  expect(afterDown.text).not.toMatch(/missing target/i);
  expect(afterDown.vip).toBe(false);
  expect(afterDown.targetName).toBe('Elevator');
  await page.screenshot({ path: path.join(ART, 'v181-vip-down-lobby.png') });

  expect(await rideElevator(page, 'elevator')).toBeNull();
  const onVip = await readObjective(page);
  expect(onVip.vip).toBe(true);
  expect(onVip.targetName).toBe('Augusto Casa');
  await page.screenshot({ path: path.join(ART, 'v181-vip-up-duel-marker.png') });

  expect(await completeDuel(page)).toBe(true);
  await page.screenshot({
    path: path.join(ART, 'v181-vip-down-then-duel.png'),
    fullPage: true,
  });
});
