import { test, expect, type Page } from '@playwright/test';

type ExitRow = {
  id: string;
  districtId: string;
  x: number;
  y: number;
  toDistrict: string;
  label: string;
};

async function unlockAll(page: Page): Promise<void> {
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
          };
        };
      }
    ).__HOUSE_EDGE__.session;
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) {
      s.world.unlock(id);
    }
  });
}

test.describe('District exits', () => {
  test('every exit walks into a new district; signs name destinations', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.locator('.play-hud')).toBeVisible();
    await unlockAll(page);

    const report = await page.evaluate(() => {
      const he = (
        window as unknown as {
          __HOUSE_EDGE__: {
            session: {
              exits: ExitRow[];
              travelTo: (id: string) => boolean;
              move: (dx: number, dy: number) => boolean;
              nearbyExit: () => ExitRow | null;
              getMap: () => {
                districtId: string;
                signs: { x: number; y: number; label: string }[];
                tiles: string[];
                width: number;
              };
              player: {
                setPosition: (x: number, y: number) => void;
                getStats: () => { x: number; y: number; districtId: string };
              };
            };
          };
        }
      ).__HOUSE_EDGE__;
      const results: {
        id: string;
        from: string;
        to: string;
        arrived: string;
        ok: boolean;
        sign: string | null;
      }[] = [];

      for (const exit of he.session.exits) {
        he.session.travelTo(exit.districtId);
        // Approach from one tile west (or east if at west edge).
        const approachX = exit.x > 2 ? exit.x - 1 : exit.x + 1;
        he.session.player.setPosition(approachX, exit.y);
        const before = he.session.player.getStats().districtId;
        const stepped = he.session.move(exit.x > approachX ? 1 : -1, 0);
        const after = he.session.player.getStats();
        // Re-read sign from the origin map (may have traveled).
        he.session.travelTo(exit.districtId);
        const originMap = he.session.getMap();
        const sign =
          originMap.signs.find(
            (s) =>
              (s.label.startsWith('>') || s.label.startsWith('EXIT')) &&
              Math.hypot(s.x - exit.x, s.y - exit.y) <= 3.5,
          )?.label ?? null;
        const destWord =
          exit.toDistrict === 'feira-central'
            ? 'Central Fair'
            : exit.toDistrict === 'morro-neon'
              ? 'Morro Neon'
              : exit.toDistrict === 'avenida-odds'
                ? 'Odds Avenue'
                : 'Casa Tower';
        results.push({
          id: exit.id,
          from: before,
          to: exit.toDistrict,
          arrived: after.districtId,
          ok:
            stepped === true &&
            after.districtId === exit.toDistrict &&
            !!sign &&
            sign.includes(destWord),
          sign,
        });
      }
      return results;
    });

    for (const row of report) {
      expect(row.ok, `${row.id} walk ${row.from}→${row.to} sign=${row.sign}`).toBe(true);
      expect(row.arrived).toBe(row.to);
      expect(row.sign).toMatch(/Central Fair|Morro Neon|Odds Avenue|Casa Tower/);
    }
    expect(report.length).toBeGreaterThanOrEqual(6);
  });
});
