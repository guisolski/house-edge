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
    // Playtest #39: y14 approach tiles stay sealed; shoulders may corner-slip.
    s.player.setPosition(11, 14);
    s.setRunHeld(true);
    const first = s.move(1, 0);
    const afterFirst = s.player.getStats();
    const map = s.getMap();
    const w = map.width;
    const sealed = map.tiles[14 * w + 12] === 'blocked';
    const wallSigns = map.signs.filter((sg) =>
      /BARRICADE|NO PASS|WALL|BARRIER|POLICE/i.test(sg.label),
    );
    const barriers = map.props.filter(
      (p) => p.kind === 'barrier' || p.kind === 'container',
    );
    return {
      firstOk: first,
      landedY14: afterFirst.y === 14 && afterFirst.x >= 12,
      sealed,
      wallSigns: wallSigns.length,
      barriers: barriers.length,
      districtId: afterFirst.districtId,
    };
  });

  expect(result.districtId).toBe('avenida-odds');
  expect(result.sealed).toBe(true);
  expect(result.landedY14).toBe(false);
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
