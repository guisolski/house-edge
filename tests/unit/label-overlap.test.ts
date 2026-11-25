import { describe, expect, it } from 'vitest';
import {
  boxesIntersect,
  estimateSignBox,
  estimateTagBox,
  labelOffsetForSigns,
} from '../../src/rendering/label-layout';
import { buildDistrictMap } from '../../src/world/maps';
import { districtNpcs } from '../../src/systems/interaction';
import type { DistrictId } from '../../src/core/types';

const DISTRICTS: DistrictId[] = [
  'morro-neon',
  'feira-central',
  'avenida-odds',
  'torre-casa',
];

describe('label / sign bounding boxes', () => {
  it('boxesIntersect detects overlap and separation', () => {
    expect(
      boxesIntersect(
        { left: 0, top: 0, width: 20, height: 10 },
        { left: 15, top: 5, width: 20, height: 10 },
      ),
    ).toBe(true);
    expect(
      boxesIntersect(
        { left: 0, top: 0, width: 10, height: 10 },
        { left: 20, top: 0, width: 10, height: 10 },
      ),
    ).toBe(false);
  });

  it('every district: visible NPC tags do not intersect neon/EXIT signs', () => {
    for (const id of DISTRICTS) {
      const map = buildDistrictMap(id);
      const npcs = districtNpcs().filter((n) => n.districtId === id);
      const signs = map.signs.map((s) =>
        estimateSignBox({ tileX: s.x, tileY: s.y, label: s.label }),
      );
      for (const npc of npcs) {
        const avoid = labelOffsetForSigns({
          tileX: npc.x,
          tileY: npc.y,
          signs: map.signs,
        });
        if (avoid.hideLabel) continue;
        const tag = estimateTagBox({
          tileX: npc.x,
          tileY: npc.y,
          text: npc.name,
          dy: avoid.dy,
        });
        for (const sign of signs) {
          expect(
            boxesIntersect(tag, sign),
            `${id}: "${npc.name}" @(${npc.x},${npc.y}) overlaps a sign`,
          ).toBe(false);
        }
      }
    }
  });

  it('hides tags that sit on ODDS / CASA / EXIT pads', () => {
    const near = labelOffsetForSigns({
      tileX: 16,
      tileY: 5,
      signs: [{ x: 16, y: 5 }],
    });
    expect(near.hideLabel).toBe(true);
  });
});
