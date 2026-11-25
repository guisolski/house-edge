/** Playtest #26: exactly one visible name label per NPC in each district. */
import { test, expect } from '@playwright/test';

type LabelRow = { name: string; count: number };

type He = {
  session: {
    world: { unlock: (id: string) => boolean };
    player: {
      setDistrict: (id: string) => void;
      setPosition: (x: number, y: number) => void;
      getStats: () => { districtId: string; x: number; y: number };
    };
    floorNpcs: () => {
      id: string;
      name: string;
      x: number;
      y: number;
      districtId: string;
    }[];
    story: { setFlag: (f: string, v: boolean) => void };
  };
  countNpcLabels: () => LabelRow[];
};

const DISTRICTS: { id: string; unlock?: string[]; x: number; y: number }[] = [
  { id: 'morro-neon', x: 13, y: 16 },
  { id: 'feira-central', unlock: ['feira-central'], x: 18, y: 12 },
  { id: 'avenida-odds', unlock: ['feira-central', 'avenida-odds'], x: 20, y: 12 },
  {
    id: 'torre-casa',
    unlock: ['feira-central', 'avenida-odds', 'torre-casa'],
    x: 14,
    y: 14,
  },
];

test('each district shows exactly one label per visible NPC name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.play-hud')).toBeVisible();

  for (const d of DISTRICTS) {
    const rows = await page.evaluate((spec) => {
      const he = (window as unknown as { __HOUSE_EDGE__: He }).__HOUSE_EDGE__;
      for (const id of spec.unlock ?? []) he.session.world.unlock(id);
      he.session.player.setDistrict(spec.id);
      he.session.player.setPosition(spec.x, spec.y);
      // Stand near every floor NPC so nameplates arm.
      const npcs = he.session.floorNpcs().filter((n) => n.districtId === spec.id);
      const counts: LabelRow[] = [];
      const seen = new Set<string>();
      for (const npc of npcs) {
        if (!npc.name || npc.id.startsWith('elevator') || seen.has(npc.name)) continue;
        seen.add(npc.name);
        he.session.player.setPosition(npc.x, npc.y);
        const near = he.countNpcLabels().filter((r) => r.name === npc.name);
        counts.push(...near);
      }
      return counts;
    }, d);
    expect(rows.length, d.id).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.count, `${d.id}:${r.name}`).toBe(1);
    }
  }
});
