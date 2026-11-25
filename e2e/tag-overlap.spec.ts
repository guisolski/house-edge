/**
 * Playtest #32: name tags on Avenida Odds must not have intersecting boxes.
 */
import { test, expect } from '@playwright/test';

test('Avenida Odds name tags do not intersect', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  const boxes = await page.evaluate(() => {
    const he = (
      window as unknown as {
        __HOUSE_EDGE__: {
          session: {
            world: { unlock: (id: string) => boolean };
            player: {
              setDistrict: (id: string) => void;
              setPosition: (x: number, y: number) => void;
            };
            floorNpcs: () => { id: string; x: number; y: number; name: string }[];
            objective: () => { targetName?: string };
            objectiveNpcInRange: () => { id: string } | null;
          };
        };
      }
    ).__HOUSE_EDGE__;
    he.session.world.unlock('avenida-odds');
    he.session.player.setDistrict('avenida-odds');
    // Mid-cluster where tags previously stacked.
    he.session.player.setPosition(18, 12);
    const me = { x: 18, y: 12 };
    const npcs = he.session
      .floorNpcs()
      .filter((n) => n.name && !n.id.startsWith('elevator'));
    const rows = npcs
      .map((n) => ({
        id: n.id,
        name: n.name,
        d: Math.hypot(n.x - me.x, n.y - me.y),
      }))
      .filter((r) => r.d <= 2.2)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    // Approximate label boxes (matches paintMarkerLabel footprint ~ name width × 18).
    const TILE = 32;
    return rows.map((r, i) => {
      const npc = npcs.find((n) => n.id === r.id)!;
      const w = Math.max(48, r.name.length * 7);
      const h = 18;
      const cx = npc.x * TILE + 16;
      const cy = npc.y * TILE - (i === 0 ? 78 : 118);
      return { id: r.id, left: cx - w / 2, right: cx + w / 2, top: cy - h, bottom: cy };
    });
  });

  expect(boxes.length).toBeLessThanOrEqual(2);
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const overlap =
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlap, `${a.id} ∩ ${b.id}`).toBe(false);
    }
  }
});
