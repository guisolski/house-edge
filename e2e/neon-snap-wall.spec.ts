import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

/** Playtest #22: Shift-run the south asphalt strip — must hit solid barrier tiles. */
test('Shift-run south street is stopped by physical barricade', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const result = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            player: {
              setDistrict: (id: string) => void;
              setPosition: (x: number, y: number) => void;
              getStats: () => { x: number; y: number; districtId: string };
            };
            setRunHeld: (held: boolean) => void;
            move: (dx: number, dy: number) => boolean;
            getMap: () => {
              tiles: string[];
              width: number;
              signs: { x: number; y: number; label: string }[];
              props: { x: number; y: number; kind: string }[];
            };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    // South approach west of sealed strip (x12–34, y13–14).
    s.player.setPosition(11, 14);
    s.setRunHeld(true);
    let moved = 0;
    for (let i = 0; i < 40; i += 1) {
      const before = s.player.getStats();
      const ok = s.move(1, 0);
      const after = s.player.getStats();
      if (!ok || (after.x === before.x && after.y === before.y)) break;
      moved += 1;
    }
    const pos = s.player.getStats();
    const map = s.getMap();
    const wallSigns = map.signs.filter((sg) =>
      /BARRICADE|NO PASS|WALL|BARRIER|POLICE/i.test(sg.label),
    );
    const barriers = map.props.filter(
      (p) => p.kind === 'barrier' || p.kind === 'container',
    );
    return {
      x: pos.x,
      y: pos.y,
      moved,
      wallSigns: wallSigns.length,
      barriers: barriers.length,
      districtId: pos.districtId,
    };
  });

  expect(result.districtId).toBe('avenida-odds');
  expect(result.x).toBeLessThan(13);
  expect(result.barriers).toBeGreaterThan(10);
  expect(result.wallSigns).toBeGreaterThanOrEqual(2);

  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            player: { setPosition: (x: number, y: number) => void };
            setRunHeld: (held: boolean) => void;
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.setRunHeld(false);
    s.player.setPosition(11, 14);
  });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(ART, 'v19-neon-snap-barricade.png'),
    fullPage: true,
  });
});
