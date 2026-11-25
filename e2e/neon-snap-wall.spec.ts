import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ART = path.resolve('artifacts/playtest');

test.beforeAll(() => {
  fs.mkdirSync(ART, { recursive: true });
});

/** Playtest #21: Shift-run the south street — must hit a solid wall. */
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
            };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.player.setPosition(20, 12);
    s.setRunHeld(true);
    let moved = 0;
    for (let i = 0; i < 40; i += 1) {
      const before = s.player.getStats();
      const ok = s.move(0, 1);
      const after = s.player.getStats();
      if (!ok || (after.x === before.x && after.y === before.y)) break;
      moved += 1;
    }
    const pos = s.player.getStats();
    const map = s.getMap();
    const wallSigns = map.signs.filter((sg) => /BARRICADE|NO PASS|WALL/i.test(sg.label));
    return {
      y: pos.y,
      moved,
      wallSigns: wallSigns.length,
      districtId: pos.districtId,
    };
  });

  expect(result.districtId).toBe('avenida-odds');
  expect(result.y).toBeLessThanOrEqual(14);
  expect(result.wallSigns).toBeGreaterThanOrEqual(2);

  // Frame the physical south wall + BARRICADE label for the playtest report.
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
    s.player.setPosition(12, 14);
  });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(ART, 'v19-neon-snap-barricade.png'),
    fullPage: true,
  });
});
