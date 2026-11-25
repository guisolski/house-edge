import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  districtExits,
  districtNpcs,
  INTERACT_RANGE,
} from '../../src/systems/interaction';
import { AVENIDA_DRONE_STEALTH, droneFreePathExists } from '../../src/systems/stealth';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { slideStep } from '../../src/world/slide';
import { findWalkablePath, nextPathWaypoint } from '../../src/world/path';
import {
  attemptSkill,
  choiceClueIndirect,
  judgePhase,
  lockpickClueDeducible,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, String(v));
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

function stubStorage(): void {
  vi.stubGlobal('localStorage', new MemoryStorage());
}

describe('v1.19.0 Neon Snap solid walls', () => {
  it('avenida wall buildings use integer sprite styles', () => {
    const map = buildDistrictMap('avenida-odds');
    for (const b of map.buildings) {
      expect(Number.isInteger(b.style)).toBe(true);
      expect(b.style).toBeGreaterThanOrEqual(0);
      expect(b.style).toBeLessThan(8);
    }
  });

  it('full-width south/north walls block slideStep (incl. edge lanes)', () => {
    const map = buildDistrictMap('avenida-odds');
    for (const x of [2, 10, 20, 35, 42]) {
      expect(isWalkable(map, x, 15), `south ${x},15`).toBe(false);
      expect(isWalkable(map, x, 7), `north ${x},7`).toBe(false);
      expect(slideStep(map, x, 14, 0, 1)).toBeNull();
      expect(slideStep(map, x, 9, 0, -1)).toBeNull();
    }
    const walkable = (x: number, y: number): boolean => isWalkable(map, x, y);
    expect(droneFreePathExists(AVENIDA_DRONE_STEALTH, walkable)).toBe(false);
  });

  it('Shift-run south corridor cannot leave the asphalt band', () => {
    const map = buildDistrictMap('avenida-odds');
    let x = 20;
    let y = 12;
    // Simulate many run steps south — must stop at the wall.
    for (let i = 0; i < 30; i += 1) {
      const step = slideStep(map, x, y, 0, 1);
      if (!step) break;
      x = step.x;
      y = step.y;
    }
    expect(y).toBeLessThanOrEqual(14);
    expect(isWalkable(map, x, y + 1)).toBe(false);
  });
});

describe('v1.19.0 path waypoints + free roam pointer', () => {
  it('Fair→Morro waypoint stays on walkable tiles', () => {
    const map = buildDistrictMap('feira-central');
    const exit = districtExits().find(
      (e) => e.districtId === 'feira-central' && e.toDistrict === 'morro-neon',
    )!;
    const from = { x: 30, y: 13 };
    const wp = nextPathWaypoint(map, from, { x: exit.x, y: exit.y }, 6);
    expect(isWalkable(map, wp.x, wp.y)).toBe(true);
    const path = findWalkablePath(map, from, { x: exit.x, y: exit.y });
    expect(path.length).toBeGreaterThan(2);
  });

  it('free roam after duel points at Nair (or hop toward her)', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const away = currentObjective({
      beats: STORY_BEATS,
      completed: ['torre-final'],
      flags: (f) => f === 'casa_quebrada' || f === 'free_roam',
      districtId: 'torre-casa',
      npcs: npcs.filter((n) => (n.floor ?? 'foyer') === 'foyer'),
      allNpcs: npcs,
      exits,
      unlocked: () => true,
    });
    expect(away.text).not.toBe('Free roam — grind side jobs or explore');
    expect(away.text + (away.detail ?? '')).toMatch(/Nair|Morro|Epilogue|hill/i);
    expect(away.targetX).toBeTypeOf('number');
  });
});

describe('v1.19.0 lockpick / negotiate / lockbox clue', () => {
  beforeEach(stubStorage);

  it('feira lockbox clue is deducible', () => {
    expect(lockpickClueDeducible(SKILL_PHASE_TABLE['feira-lockbox']!)).toBe(true);
  });

  it('negotiate accepts hush chip (any offer wins)', () => {
    const phase = skillForBet('torre-negotiate', 'negotiate')!.phases[0]!;
    expect(judgePhase(phase, 0)).toBe(true);
    expect(judgePhase(phase, 1)).toBe(true);
    expect(judgePhase(phase, 2)).toBe(true);
    expect(choiceClueIndirect(phase)).toBe(true);
    let p = startSkill(skillForBet('torre-negotiate', 'negotiate')!);
    p = attemptSkill(p, { phaseIndex: 0, value: 0 });
    expect(p.won || p.done).toBe(true);
    expect(p.won).toBe(true);
  });

  it('Odds Fair pad sits on the district edge away from Mensageiro', () => {
    const pad = districtExits().find((e) => e.id === 'avenida-to-feira')!;
    const msg = districtNpcs().find((n) => n.id === 'mensageiro-avenida')!;
    expect(pad.x).toBeLessThanOrEqual(3);
    expect(Math.hypot(pad.x - msg.x, pad.y - msg.y)).toBeGreaterThan(8);
  });

  it('ATM Hacker stays clear of avenida-to-torre interact radius', () => {
    const pad = districtExits().find((e) => e.id === 'avenida-to-torre')!;
    const atm = districtNpcs().find((n) => n.id === 'atm-hacker')!;
    expect(isWalkable(buildDistrictMap('avenida-odds'), atm.x, atm.y)).toBe(true);
    expect(Math.hypot(pad.x - atm.x, pad.y - atm.y)).toBeGreaterThan(INTERACT_RANGE);
  });
});
