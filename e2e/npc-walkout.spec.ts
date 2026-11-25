/**
 * Playtest #29/#30 P0: walk-out from every NPC home + Fair→Odds arrival spawn.
 */
import { test, expect } from '@playwright/test';

test('every NPC home: player can walk out N/S/E/W', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const report = await page.evaluate(() => {
    type Npc = {
      id: string;
      districtId: string;
      x: number;
      y: number;
      homeX?: number;
      homeY?: number;
      floor?: string;
    };
    type He = {
      session: {
        npcs: Npc[];
        exits: {
          id: string;
          districtId: string;
          x: number;
          y: number;
          toDistrict: string;
        }[];
        world: { unlock: (id: string) => boolean };
        player: {
          setDistrict: (id: string) => void;
          setPosition: (x: number, y: number) => void;
          getStats: () => { x: number; y: number; districtId: string };
        };
        move: (dx: number, dy: number) => boolean;
        isVipFloor: () => boolean;
      } & { vipFloor?: boolean };
    };
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa']) {
      he.session.world.unlock(id);
    }
    const fails: string[] = [];
    for (const npc of he.session.npcs) {
      if (npc.id.startsWith('elevator')) continue;
      he.session.player.setDistrict(npc.districtId);
      (he.session as { vipFloor: boolean }).vipFloor = npc.floor === 'vip';
      const x = npc.homeX ?? npc.x;
      const y = npc.homeY ?? npc.y;
      for (const [dx, dy, dir] of [
        [0, -1, 'N'],
        [0, 1, 'S'],
        [-1, 0, 'W'],
        [1, 0, 'E'],
      ] as const) {
        he.session.player.setPosition(x, y);
        const ok = he.session.move(dx, dy);
        const s = he.session.player.getStats();
        if (!ok || s.x !== x + dx || s.y !== y + dy) {
          fails.push(`${npc.id} ${dir} from ${x},${y} -> ${s.x},${s.y} ok=${ok}`);
        }
      }
    }
    return fails;
  });

  expect(report, report.join('\n')).toEqual([]);
});

test('Fair→Odds arrival: cardinals + 2-tile east lane clear of NPC homes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const report = await page.evaluate(() => {
    type He = {
      session: {
        npcs: { id: string; districtId: string; x: number; y: number }[];
        world: { unlock: (id: string) => boolean };
        player: {
          setDistrict: (id: string) => void;
          setPosition: (x: number, y: number) => void;
          getStats: () => { x: number; y: number };
        };
        move: (dx: number, dy: number) => boolean;
        travelTo: (id: string) => boolean;
      };
    };
    const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
    he.session.world.unlock('feira-central');
    he.session.world.unlock('avenida-odds');
    // Arrive via real travel so spawn matches playtest arrival.
    he.session.player.setDistrict('feira-central');
    he.session.travelTo('avenida-odds');
    const s0 = he.session.player.getStats();
    const fails: string[] = [];
    if (s0.x !== 9 || s0.y !== 12) {
      fails.push(`arrival spawn ${s0.x},${s0.y} expected 9,12`);
    }
    const homes = new Set(
      he.session.npcs
        .filter((n) => n.districtId === 'avenida-odds')
        .map((n) => `${n.x},${n.y}`),
    );
    for (const dx of [1, 2]) {
      const tx = s0.x + dx;
      const ty = s0.y;
      if (homes.has(`${tx},${ty}`)) fails.push(`NPC home blocks east lane ${tx},${ty}`);
    }
    for (const [dx, dy, dir] of [
      [0, -1, 'N'],
      [0, 1, 'S'],
      [-1, 0, 'W'],
      [1, 0, 'E'],
    ] as const) {
      he.session.player.setPosition(s0.x, s0.y);
      const ok = he.session.move(dx, dy);
      const s = he.session.player.getStats();
      if (!ok || s.x !== s0.x + dx || s.y !== s0.y + dy) {
        fails.push(`arrival ${dir} from ${s0.x},${s0.y} -> ${s.x},${s.y} ok=${ok}`);
      }
    }
    // Straight D then another D (2-tile east corridor).
    he.session.player.setPosition(s0.x, s0.y);
    if (!he.session.move(1, 0) || !he.session.move(1, 0)) {
      fails.push('could not walk two tiles east from arrival');
    }
    const end = he.session.player.getStats();
    if (end.x !== s0.x + 2 || end.y !== s0.y) {
      fails.push(`two-east ended at ${end.x},${end.y}`);
    }
    return fails;
  });

  expect(report, report.join('\n')).toEqual([]);
});
