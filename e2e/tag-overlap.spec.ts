/**
 * Playtest #32/#33: name tags must not have intersecting boxes in every district.
 */
import { test, expect } from '@playwright/test';

const DISTRICTS = [
  { id: 'morro-neon', x: 14, y: 16 },
  { id: 'feira-central', x: 20, y: 14 },
  { id: 'avenida-odds', x: 12, y: 12 },
  { id: 'torre-casa', x: 20, y: 14 },
] as const;

for (const d of DISTRICTS) {
  test(`${d.id} name tags do not intersect`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /New Game|Novo jogo/i }).click();
    await expect(page.locator('.play-hud')).toBeVisible();

    const boxes = await page.evaluate(
      ({ id, x, y }) => {
        const he = (
          window as unknown as {
            __HOUSE_EDGE__: {
              session: {
                world: { unlock: (d: string) => boolean };
                player: {
                  setDistrict: (d: string) => void;
                  setPosition: (x: number, y: number) => void;
                };
                floorNpcs: () => { id: string; x: number; y: number; name: string }[];
              };
            };
          }
        ).__HOUSE_EDGE__;
        for (const dist of ['feira-central', 'avenida-odds', 'torre-casa']) {
          he.session.world.unlock(dist);
        }
        he.session.player.setDistrict(id);
        he.session.player.setPosition(x, y);
        const me = { x, y };
        const npcs = he.session
          .floorNpcs()
          .filter((n) => n.name && !n.id.startsWith('elevator'));
        // Match v1.22.7 policy: at most one nameplate (nearest).
        const rows = npcs
          .map((n) => ({
            id: n.id,
            name: n.name,
            d: Math.hypot(n.x - me.x, n.y - me.y),
          }))
          .filter((r) => r.d <= 2.2)
          .sort((a, b) => a.d - b.d)
          .slice(0, 1);
        const TILE = 32;
        return rows.map((r, i) => {
          const npc = npcs.find((n) => n.id === r.id)!;
          const w = Math.max(48, r.name.length * 7);
          const h = 18;
          const cx = npc.x * TILE + 16;
          const cy = npc.y * TILE - (i === 0 ? 78 : 118);
          return {
            id: r.id,
            left: cx - w / 2,
            right: cx + w / 2,
            top: cy - h,
            bottom: cy,
          };
        });
      },
      { id: d.id, x: d.x, y: d.y },
    );

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
}
