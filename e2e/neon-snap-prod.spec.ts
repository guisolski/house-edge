import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

type HeSession = {
  world: { unlock: (id: string) => boolean };
  player: {
    setDistrict: (id: string) => void;
    setPosition: (x: number, y: number) => void;
    addCredits: (n: number) => void;
    getStats: () => { x: number; y: number; districtId: string };
  };
  story: { setFlag: (f: string, v: boolean) => void };
  runStoryBeat: (id: string) => boolean;
  pickDialogueChoice: (id: string, label: string) => void;
  acceptStoryBet: () => boolean;
  isStealthActive: () => boolean;
  getStealthProgress: () => { done: boolean; won: boolean } | null;
};

async function bootNeonSnap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 40, y: 40 } });
  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.addCredits(200);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.story.setFlag('influencer_ok', true);
    s.runStoryBeat('avenida-drone');
    s.pickDialogueChoice('drone_low', 'ok');
    s.acceptStoryBet();
  });
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Boolean(
          (
            window as unknown as { __HOUSE_EDGE__: { session: HeSession } }
          ).__HOUSE_EDGE__.session.isStealthActive?.(),
        ),
      ),
    )
    .toBe(true);
}

/** Hold Shift+direction for durationMs; return final player x/y + stealth state. */
async function shiftRun(
  page: import('@playwright/test').Page,
  key: 'KeyD' | 'KeyA',
  durationMs: number,
): Promise<{ x: number; y: number; won: boolean; done: boolean; elapsedMs: number }> {
  const t0 = Date.now();
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down(key);
  await page.waitForTimeout(durationMs);
  await page.keyboard.up(key);
  await page.keyboard.up('ShiftLeft');
  const elapsedMs = Date.now() - t0;
  const pos = await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    const st = s.getStealthProgress?.();
    const p = s.player.getStats();
    return { x: p.x, y: p.y, won: Boolean(st?.won), done: Boolean(st?.done) };
  });
  return { ...pos, elapsedMs };
}

test('prod: Shift+Right on south street stops at police barrier', async ({ page }) => {
  await bootNeonSnap(page);
  // South approach just west of the sealed strip (x12–34, y13–14).
  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.setPosition(11, 14);
  });
  await page.waitForTimeout(120);
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 80 } });
  const before = await page.evaluate(
    () =>
      (
        window as unknown as { __HOUSE_EDGE__: { session: HeSession } }
      ).__HOUSE_EDGE__.session.player.getStats().x,
  );
  const after = await shiftRun(page, 'KeyD', 4000);
  expect(after.won, 'south run must not clear Neon Snap').toBe(false);
  expect(after.x, 'must stop before drone corridor / barrier').toBeLessThan(13);
  expect(after.x).toBeGreaterThanOrEqual(before - 0.1);
  expect(after.elapsedMs).toBeGreaterThanOrEqual(3900);

  fs.writeFileSync(
    path.join(ART, 'v20-south-walk-time.json'),
    JSON.stringify(
      {
        strip: 'south',
        holdMs: 4000,
        elapsedMs: after.elapsedMs,
        startX: before,
        endX: after.x,
        endY: after.y,
        won: after.won,
      },
      null,
      2,
    ),
  );

  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.setPosition(11, 14);
  });
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(ART, 'v20-neon-snap-south-barrier.png'),
    fullPage: true,
  });
});

test('prod: Shift+Right on north strip stops at barrier', async ({ page }) => {
  await bootNeonSnap(page);
  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.setPosition(11, 9);
  });
  await page.waitForTimeout(120);
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 80 } });
  const after = await shiftRun(page, 'KeyD', 4000);
  expect(after.won, 'north run must not clear Neon Snap').toBe(false);
  expect(after.x, 'must stop at north barrier').toBeLessThan(13);

  fs.writeFileSync(
    path.join(ART, 'v20-north-walk-time.json'),
    JSON.stringify(
      {
        strip: 'north',
        holdMs: 4000,
        elapsedMs: after.elapsedMs,
        endX: after.x,
        endY: after.y,
        won: after.won,
      },
      null,
      2,
    ),
  );

  await page.evaluate(() => {
    const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
      .__HOUSE_EDGE__.session;
    s.player.setPosition(11, 9);
  });
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(ART, 'v20-neon-snap-north-barrier.png'),
    fullPage: true,
  });
});
