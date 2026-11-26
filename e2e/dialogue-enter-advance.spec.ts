/**
 * Playtest #40: open NPC dialogs via E, wait 300ms/1s/2s, then a single
 * page.keyboard.press('Enter') must advance (plain Close / Take bet / choice).
 */
import { test, expect } from '@playwright/test';

type HeSession = {
  world: { unlock: (id: string) => boolean };
  player: {
    setDistrict: (id: string) => void;
    setPosition: (x: number, y: number) => void;
    addCredits: (n: number) => void;
  };
  npcs: { id: string; x: number; y: number; districtId: string; floor?: string }[];
  story: { setFlag: (f: string, v: boolean) => void };
  runStoryBeat: (id: string) => boolean;
  travelTo: (id: string) => void;
  ui: { get: () => string; is: (s: string) => boolean };
  vipFloor?: boolean;
};

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 40, y: 40 } });
}

async function prepNpc(
  page: import('@playwright/test').Page,
  opts: {
    npcId: string;
    unlock: string[];
    flags: string[];
    beatId?: string;
    vip?: boolean;
  },
): Promise<void> {
  await page.evaluate((o) => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.addCredits(120);
    for (const d of o.unlock) s.world.unlock(d);
    for (const f of o.flags) s.story.setFlag(f, true);
    const npc = s.npcs.find((n) => n.id === o.npcId)!;
    s.player.setDistrict(npc.districtId);
    (s as { vipFloor: boolean }).vipFloor = Boolean(o.vip || npc.floor === 'vip');
    s.player.setPosition(npc.x, npc.y + 1);
    if (o.beatId) s.runStoryBeat(o.beatId);
  }, opts);
}

async function openWithE(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 200 } });
  await page.keyboard.press('KeyE');
  await expect(page.locator('.dialogue-panel')).toBeVisible({ timeout: 5000 });
}

async function enterAdvances(
  page: import('@playwright/test').Page,
  waitMs: number,
): Promise<void> {
  await page.waitForTimeout(waitMs);
  const before = await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    return {
      ui: s.ui.get(),
      body: document.querySelector('.dialogue-body')?.textContent ?? '',
    };
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    return {
      ui: s.ui.get(),
      body: document.querySelector('.dialogue-body')?.textContent ?? '',
      skill: Boolean(document.querySelector('.skill-panel')),
      bet: Boolean(document.querySelector('.bet-panel')),
      credits: Boolean(document.querySelector('.credits-line')),
    };
  });
  const advanced =
    after.ui !== before.ui ||
    after.body !== before.body ||
    after.skill ||
    after.bet ||
    after.credits ||
    after.ui === 'play';
  expect(
    advanced,
    `wait=${waitMs}ms before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  ).toBe(true);
}

for (const waitMs of [300, 1000, 2000]) {
  test(`DJ Forró: Enter advances after ${waitMs}ms`, async ({ page }) => {
    await boot(page);
    await prepNpc(page, {
      npcId: 'forro-dj',
      unlock: ['feira-central'],
      flags: ['dancer_ok', 'unlocked_feira'],
      beatId: 'feira-forro',
    });
    await expect(page.locator('.dialogue-panel')).toBeVisible({ timeout: 5000 });
    // Re-open via E after closing would need another beat — test the open panel.
    await enterAdvances(page, waitMs);
  });
}

test('Maquinista: Enter advances after 300ms', async ({ page }) => {
  await boot(page);
  await prepNpc(page, {
    npcId: 'stage-hand',
    unlock: ['feira-central'],
    flags: ['forro_ok', 'unlocked_feira'],
    beatId: 'feira-lockbox',
  });
  await expect(page.locator('.dialogue-panel')).toBeVisible({ timeout: 5000 });
  await enterAdvances(page, 300);
});

test('Antena Tech: Enter advances after E open (300ms / 1s)', async ({ page }) => {
  await boot(page);
  await prepNpc(page, {
    npcId: 'antena-tech',
    unlock: [],
    flags: ['falou_nair', 'copper_weighed'],
  });
  await openWithE(page);
  await enterAdvances(page, 300);
});

test('Antena Tech: single Enter after 1s advances Take bet', async ({ page }) => {
  await boot(page);
  await prepNpc(page, {
    npcId: 'antena-tech',
    unlock: [],
    flags: ['falou_nair', 'copper_weighed'],
    beatId: 'morro-antena',
  });
  await expect(page.locator('.btn-take-bet')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await expect(page.locator('.skill-pattern')).toBeVisible({ timeout: 5_000 });
});

test('Capitã Vespera: Enter advances after 1s (open via E)', async ({ page }) => {
  await boot(page);
  await prepNpc(page, {
    npcId: 'capita',
    unlock: ['feira-central', 'avenida-odds'],
    flags: ['twist_visto', 'unlocked_avenida'],
  });
  await openWithE(page);
  await enterAdvances(page, 1000);
});

test('Anfitrião (choices): Enter advances after 300ms', async ({ page }) => {
  await boot(page);
  await prepNpc(page, {
    npcId: 'vip-host',
    unlock: ['feira-central', 'avenida-odds', 'torre-casa'],
    flags: ['vip_ok', 'unlocked_torre', 'escandalo_aberto'],
    beatId: 'torre-negotiate',
    vip: true,
  });
  await expect(page.locator('.dialogue-choice').first()).toBeVisible({ timeout: 5000 });
  await enterAdvances(page, 300);
});

test('Epilogue Fechar: Enter advances after 500ms', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.addCredits(50);
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) {
      s.world.unlock(id);
    }
    s.story.setFlag('casa_quebrada', true);
    s.player.setDistrict('morro-neon');
    s.player.setPosition(14, 16);
    s.runStoryBeat('epilogue-laje');
  });
  await expect(page.locator('.dialogue-choice').first()).toBeVisible();
  await page.waitForTimeout(550);
  await page.locator('.dialogue-choice').first().click();
  const close = page.locator('.btn-closing-continue');
  await expect(close).toBeVisible();
  await expect(close).toBeEnabled({ timeout: 2000 });
  await close.focus();
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await expect(page.locator('.credits-line').first()).toBeVisible({ timeout: 3000 });
});

test('DJ Forró open via E then Enter at 300ms', async ({ page }) => {
  await boot(page);
  await prepNpc(page, {
    npcId: 'forro-dj',
    unlock: ['feira-central'],
    flags: ['dancer_ok', 'unlocked_feira'],
  });
  // Start the beat so the NPC is the live objective, then open with E.
  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.runStoryBeat('feira-forro');
  });
  // Close if beat already painted dialogue, then re-open with E.
  if (await page.locator('.dialogue-panel').isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  await openWithE(page);
  await enterAdvances(page, 300);
});
