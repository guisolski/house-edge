import { test, expect, type Page } from '@playwright/test';

type ExitRow = {
  id: string;
  districtId: string;
  x: number;
  y: number;
  toDistrict: string;
  label: string;
};

type ExitReport = {
  id: string;
  from: string;
  to: string;
  arrived: string;
  ok: boolean;
  sign: string | null;
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

    const report = await page.evaluate(async (): Promise<ExitReport[]> => {
      type He = {
        session: {
          exits: ExitRow[];
          travelTo: (id: string) => boolean;
          move: (dx: number, dy: number) => boolean;
          getMap: () => {
            signs: { x: number; y: number; label: string }[];
          };
          player: {
            setPosition: (x: number, y: number) => void;
            setFacing: (dx: number, dy: number) => void;
            getStats: () => { districtId: string };
          };
        };
      };
      const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
      const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
      const results: ExitReport[] = [];
      for (const exit of he.session.exits) {
        he.session.travelTo(exit.districtId);
        const clearX = exit.x > 20 ? exit.x - 10 : exit.x + 10;
        he.session.player.setPosition(clearX, exit.y);
        he.session.move(0, 1);
        he.session.move(0, -1);
        await sleep(1700);
        const approachX = exit.x > 2 ? exit.x - 1 : exit.x + 1;
        he.session.player.setPosition(approachX, exit.y);
        const before = he.session.player.getStats().districtId;
        const dx = exit.x > approachX ? 1 : -1;
        // Playtest #29: prompt + E only — never walk-in auto-travel.
        he.session.player.setPosition(exit.x, exit.y);
        he.session.player.setFacing(dx, 0);
        he.session.move(0, 0);
        await sleep(50);
        const stillHere = he.session.player.getStats().districtId;
        const interacted = (
          he.session as unknown as { interact: () => boolean }
        ).interact();
        const after = he.session.player.getStats();
        he.session.travelTo(exit.districtId);
        he.session.player.setPosition(clearX, exit.y);
        he.session.move(0, 1);
        const sign =
          he.session
            .getMap()
            .signs.find(
              (s) =>
                (s.label.startsWith('>') || s.label.startsWith('EXIT')) &&
                Math.hypot(s.x - exit.x, s.y - exit.y) <= 3.5,
            )?.label ?? null;
        const word =
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
            stillHere === before &&
            interacted === true &&
            after.districtId === exit.toDistrict &&
            !!sign &&
            sign.includes(word),
          sign,
        });
      }
      return results;
    });

    for (const row of report) {
      expect(row.ok, `${row.id} E ${row.from}→${row.to} sign=${row.sign}`).toBe(true);
      expect(row.arrived).toBe(row.to);
      expect(row.sign).toMatch(/Central Fair|Morro Neon|Odds Avenue|Casa Tower/);
    }
  });
});
