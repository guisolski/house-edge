/**
 * Playtest #29 P0: every NPC cluster must allow walk-out in all 4 directions.
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
