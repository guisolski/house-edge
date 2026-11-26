import { describe, expect, it } from 'vitest';
import {
  districtExits,
  districtNpcs,
  INTERACT_RANGE,
} from '../../src/systems/interaction';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { slideStep } from '../../src/world/slide';
import { AVENIDA_DRONE_STEALTH, droneFreePathExists } from '../../src/systems/stealth';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';

describe('v1.20.0 Neon Snap sealed strips', () => {
  it('north and south approach strips stay sealed; shoulders stay clear', () => {
    const map = buildDistrictMap('avenida-odds');
    for (const x of [12, 20, 28, 34]) {
      expect(isWalkable(map, x, 9), `north ${x},9`).toBe(false);
      expect(isWalkable(map, x, 14), `south ${x},14`).toBe(false);
      // Playtest #39: y10/y13 are clear east-west (no pillar nubs).
      expect(isWalkable(map, x, 10), `shoulder ${x},10`).toBe(true);
      expect(isWalkable(map, x, 13), `shoulder ${x},13`).toBe(true);
    }
    // Center lane stays open for the cone path.
    expect(isWalkable(map, 20, 11)).toBe(true);
    expect(isWalkable(map, 20, 12)).toBe(true);
  });

  it('sealed y14 tiles themselves stay blocked (corner may slip to shoulder)', () => {
    const map = buildDistrictMap('avenida-odds');
    expect(isWalkable(map, 12, 14)).toBe(false);
    expect(slideStep(map, 11, 14, 1, 0)?.y).not.toBe(14);
  });

  it('sealed y9 tiles themselves stay blocked (corner may slip to shoulder)', () => {
    const map = buildDistrictMap('avenida-odds');
    expect(isWalkable(map, 12, 9)).toBe(false);
    expect(slideStep(map, 11, 9, 1, 0)?.y).not.toBe(9);
  });

  it('no drone-free bypass remains (center lane is cone-covered)', () => {
    const map = buildDistrictMap('avenida-odds');
    expect(
      droneFreePathExists(AVENIDA_DRONE_STEALTH, (x, y) => isWalkable(map, x, y)),
    ).toBe(false);
  });

  it('barrier / container props mark the sealed strips', () => {
    const map = buildDistrictMap('avenida-odds');
    const barriers = map.props.filter(
      (p) => p.kind === 'barrier' || p.kind === 'container',
    );
    expect(barriers.length).toBeGreaterThan(10);
  });

  it('Morro Fair pad is clear of Seu Zé', () => {
    const pad = districtExits().find((e) => e.id === 'morro-to-feira')!;
    const ze = districtNpcs().find((n) => n.id === 'seu-ze')!;
    expect(Math.hypot(pad.x - ze.x, pad.y - ze.y)).toBeGreaterThan(INTERACT_RANGE);
  });

  it('courier tip sequence has 4 distinct arrow keys', () => {
    const seq = SKILL_PHASE_TABLE['courier-tip']!.sequence!;
    expect(seq).toHaveLength(4);
    expect(new Set(seq).size).toBe(4);
  });

  it('elevator timing is late-game tight (widen only after 2+ misses)', () => {
    const phase = SKILL_PHASE_TABLE['torre-elevator']!;
    expect(phase.window ?? 1).toBeLessThanOrEqual(0.12);
    expect(phase.needleSpeed ?? 0).toBeGreaterThanOrEqual(0.9);
  });

  it('objective NPCs sit on walkable plaza tiles', () => {
    const ids = ['foyer-guard', 'mole-contact', 'luna'];
    for (const id of ids) {
      const npc = districtNpcs().find((n) => n.id === id)!;
      const map = buildDistrictMap(npc.districtId);
      expect(isWalkable(map, npc.x, npc.y), `${id} @ ${npc.x},${npc.y}`).toBe(true);
    }
  });
});
