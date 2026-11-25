/**
 * Prod-build Neon Snap clear with REAL keyboard timing — no completeSkillPerfect.
 */
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
    getStats: () => { x: number; y: number };
  };
  story: { setFlag: (f: string, v: boolean) => void; getFlag: (f: string) => boolean };
  runStoryBeat: (id: string) => boolean;
  pickDialogueChoice: (id: string, label: string) => void;
  acceptStoryBet: () => boolean;
  isStealthActive: () => boolean;
  isStealthSafe: () => boolean;
  getStealthProgress: () => {
    done: boolean;
    won: boolean;
    spotted: number;
  } | null;
};

async function bootNeonSnap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();
  await page.locator('canvas.world-canvas').click({ position: { x: 40, y: 40 } });
  await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: { session: HeSession; hud: { showHud: () => void } };
      }
    ).__HOUSE_EDGE__;
    const s = he.session;
    s.player.addCredits(200);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.story.setFlag('influencer_ok', true);
    s.runStoryBeat('avenida-drone');
    s.pickDialogueChoice('drone_low', 'ok');
    s.acceptStoryBet();
    // Force play HUD so a leftover dialogue panel can't swallow input.
    he.hud.showHud();
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
  await page.locator('canvas.world-canvas').click({ position: { x: 80, y: 80 } });
}

/** Adaptive walk: only step east while the tile is cone-safe. */
async function walkClear(page: import('@playwright/test').Page): Promise<void> {
  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    const st = await page.evaluate(() => {
      const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
        .__HOUSE_EDGE__.session;
      const prog = s.getStealthProgress?.();
      // finishSkill clears stealthProgress after a win — drone_ok is the lasting signal.
      const won =
        Boolean(prog?.won && prog?.done) || Boolean(s.story.getFlag?.('drone_ok'));
      return {
        won,
        active: Boolean(s.isStealthActive?.()),
        safe: Boolean(s.isStealthSafe?.()),
        x: s.player.getStats().x,
        spotted: prog?.spotted ?? 0,
      };
    });
    if (st.won) return;
    if (!st.active) {
      throw new Error(
        `Neon Snap stealth dropped before clear (x=${st.x}, spotted=${st.spotted})`,
      );
    }
    if (st.safe) {
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(70);
      await page.keyboard.up('KeyD');
      await page.waitForTimeout(30);
    } else {
      await page.waitForTimeout(70);
    }
  }
}

test('prod: Neon Snap clears with real walk inputs (no debug skip)', async ({ page }) => {
  test.setTimeout(90_000);
  await bootNeonSnap(page);
  await page.screenshot({
    path: path.join(ART, 'v202-neon-snap-start.png'),
    fullPage: true,
  });
  await walkClear(page);
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const s = (window as unknown as { __HOUSE_EDGE__: { session: HeSession } })
            .__HOUSE_EDGE__.session;
          return Boolean(s.story.getFlag('drone_ok'));
        }),
      { timeout: 5_000 },
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(ART, 'v202-neon-snap-cleared-prod.png'),
    fullPage: true,
  });
});
