import { describe, expect, it } from 'vitest';
import {
  boxesIntersect,
  estimateSignBox,
  estimateSpriteBox,
  estimateTagBox,
  labelOffsetForSigns,
} from '../../src/rendering/label-layout';
import { buildDistrictMap, buildTorreVip } from '../../src/world/maps';
import { districtNpcs } from '../../src/systems/interaction';
import type { DistrictId } from '../../src/core/types';
import type { MapDef } from '../../src/world/maps';
import type { WorldNpc } from '../../src/systems/interaction';
import type { ScreenBox } from '../../src/rendering/label-layout';

const DISTRICTS: DistrictId[] = [
  'morro-neon',
  'feira-central',
  'avenida-odds',
  'torre-casa',
];

function assertNpcClearOfSigns(opts: {
  id: string;
  vip: boolean;
  npc: WorldNpc;
  signs: ScreenBox[];
  mapSigns: MapDef['signs'];
}): void {
  const { id, vip, npc, signs, mapSigns } = opts;
  const avoid = labelOffsetForSigns({
    tileX: npc.x,
    tileY: npc.y,
    signs: mapSigns,
    tagText: npc.name,
  });
  const sprite = estimateSpriteBox({ tileX: npc.x, tileY: npc.y });
  const tag = avoid.hideLabel
    ? null
    : estimateTagBox({
        tileX: npc.x,
        tileY: npc.y,
        text: npc.name,
        dy: avoid.dy,
      });
  const where = `${id}${vip ? '-vip' : ''}: "${npc.name}" @(${npc.x},${npc.y})`;
  for (const sign of signs) {
    expect(boxesIntersect(sprite, sign), `${where} sprite overlaps sign`).toBe(false);
    if (tag) {
      expect(boxesIntersect(tag, sign), `${where} tag overlaps sign`).toBe(false);
    }
  }
}

describe('label / sign / sprite / prompt bounding boxes', () => {
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

  it('every district + VIP: visible NPC tags/sprites miss every sign', () => {
    const maps = [
      ...DISTRICTS.map((id) => ({ id, map: buildDistrictMap(id), vip: false })),
      { id: 'torre-casa' as DistrictId, map: buildTorreVip(), vip: true },
    ];
    for (const { id, map, vip } of maps) {
      const npcs = districtNpcs().filter(
        (n) =>
          n.districtId === id &&
          (vip ? n.floor === 'vip' : n.floor !== 'vip') &&
          !n.id.startsWith('elevator') &&
          n.name,
      );
      const signs = map.signs.map((s) =>
        estimateSignBox({ tileX: s.x, tileY: s.y, label: s.label }),
      );
      for (const npc of npcs) {
        assertNpcClearOfSigns({ id, vip, npc, signs, mapSigns: map.signs });
      }
    }
  });

  it('hides tags that sit on ODDS / CASA / EXIT pads', () => {
    const near = labelOffsetForSigns({
      tileX: 16,
      tileY: 5,
      signs: [{ x: 16, y: 5, label: 'ODDS 24h' }],
      tagText: 'Mole Contact',
    });
    expect(near.hideLabel).toBe(true);
  });

  it('VIP floor has a visible elevator exit pad + sign', () => {
    const vip = buildTorreVip();
    expect(vip.signs.some((s) => /ELEVATOR/i.test(s.label))).toBe(true);
    const elev = districtNpcs().find((n) => n.id === 'elevator-vip');
    expect(elev).toBeTruthy();
    expect(elev!.floor).toBe('vip');
  });
});
