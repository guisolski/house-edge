import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  districtExits,
  districtNpcs,
  type WorldNpc,
} from '../../src/systems/interaction';
import { STORY_BEATS } from '../../src/content/story';
import { currentObjective, nextBeat } from '../../src/systems/objectives';
import { AVENIDA_DRONE_STEALTH, droneFreePathExists } from '../../src/systems/stealth';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { choiceClueIndirect, skillForBet } from '../../src/systems/minigame';
import { DISTRICTS } from '../../src/content/districts';

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

const PRE_DUEL = [
  'intro-laje',
  'boteco-nair',
  'side-morro-copper',
  'morro-antena',
  'luna-beco',
  'morro-fios',
  'seu-ze-banca',
  'feira-kiko',
  'feira-catador',
  'bia-set',
  'feira-dancer',
  'feira-forro',
  'feira-lockbox',
  'feira-radio',
  'feira-tipster',
  'feira-courier',
  'prova-luna',
  'avenida-twist',
  'avenida-checkpoint',
  'avenida-courier',
  'avenida-influencer',
  'avenida-drone',
  'avenida-radar',
  'avenida-server',
  'avenida-atm',
  'avenida-stealth',
  'avenida-betrayal',
  'lobby-margin',
  'morro-return-nair',
  'morro-return-fio',
  'torre-foyer',
  'torre-pit',
  'torre-elevator',
  'torre-vip',
  'torre-negotiate',
] as const;

/** Advance story to post-negotiate, still needing the Augusto duel. */
function prepDuelReady(s: GameSession): void {
  s.startNew();
  for (const id of ['feira-central', 'avenida-odds', 'torre-casa'] as const) {
    s.world.unlock(id);
  }
  for (const id of PRE_DUEL) {
    if (!s.story.getCompleted().includes(id)) s.story.completeBeat(id);
  }
  for (const f of ['pit_ok', 'elevator_ok', 'vip_ok', 'negotiate_ok'] as const) {
    s.story.setFlag(f, true);
  }
  s.player.setDistrict('torre-casa');
}

function floorNpcsFor(
  npcs: readonly WorldNpc[],
  districtId: string,
  floor: 'foyer' | 'vip' | null,
): WorldNpc[] {
  if (districtId !== 'torre-casa' || !floor) return [...npcs];
  return npcs.filter(
    (n) => n.districtId !== 'torre-casa' || (n.floor ?? 'foyer') === floor,
  );
}

function assertObjectiveSane(
  label: string,
  obj: ReturnType<typeof currentObjective>,
  districtId: string,
): void {
  expect(obj.text, label).not.toMatch(/missing target/i);
  if (obj.districtId !== districtId) return;
  if (
    obj.text.startsWith('Story complete') ||
    obj.text.startsWith('Free roam') ||
    obj.text.startsWith('Unlock path') ||
    obj.text.startsWith('Travel menu') ||
    obj.text.startsWith('Find the next lead')
  ) {
    return;
  }
  expect(obj.targetX, `no marker ${obj.text} @ ${label}`).toBeTypeOf('number');
  expect(obj.targetY).toBeTypeOf('number');
  expect(obj.targetName).toBeTruthy();
}

describe('v1.18.1 P0 duel target across floors', () => {
  beforeEach(stubStorage);

  it('foyer after VIP descent points at elevator — never missing target', () => {
    vi.useFakeTimers();
    const s = new GameSession(7);
    prepDuelReady(s);
    (s as unknown as { vipFloor: boolean }).vipFloor = true;
    const elev = s.floorNpcs().find((n) => n.id === 'elevator-vip')!;
    s.player.setPosition(elev.x, elev.y);
    expect(s.interact()).toBe(true);
    vi.advanceTimersByTime(1200);
    s.ui.go('play');
    expect(s.isVipFloor()).toBe(false);
    const obj = s.objective();
    expect(obj.text).not.toMatch(/missing target/i);
    expect(obj.targetName).toBe('Elevator');
    expect(obj.text).toMatch(/Ride elevator up|Elevator/i);
    vi.useRealTimers();
  });

  it('foyer elevator re-rides up to Augusto after VIP beats', () => {
    vi.useFakeTimers();
    const s = new GameSession(11);
    prepDuelReady(s);
    (s as unknown as { vipFloor: boolean }).vipFloor = false;
    s.player.setDistrict('torre-casa');
    const elev = s.floorNpcs().find((n) => n.id === 'elevator')!;
    s.player.setPosition(elev.x, elev.y);
    expect(s.interact()).toBe(true);
    expect(s.ui.is('transition')).toBe(true);
    vi.advanceTimersByTime(1200);
    expect(s.isVipFloor()).toBe(true);
    const obj = s.objective();
    expect(obj.targetName).toBe('Augusto Casa');
    expect(obj.text).not.toMatch(/missing target/i);
    vi.useRealTimers();
  });

  it('elevator down transition label names pit foyer Floor 1', () => {
    const s = new GameSession(13);
    prepDuelReady(s);
    (s as unknown as { vipFloor: boolean }).vipFloor = true;
    const labels: string[] = [];
    s.bus.on('world:transition', (p) => {
      if (p.label) labels.push(p.label);
    });
    const elev = s.floorNpcs().find((n) => n.id === 'elevator-vip')!;
    s.player.setPosition(elev.x, elev.y);
    s.interact();
    expect(labels.some((l) => /▼/.test(l) && /Floor 1/.test(l))).toBe(true);
    expect(labels.some((l) => /Floor 42/.test(l) && /▼/.test(l))).toBe(false);
  });
});

describe('v1.18.1 objective invariant — every step / district / floor', () => {
  beforeEach(stubStorage);

  it('never emits missing target; every ready step has a reachable marker', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const completed: string[] = ['intro-laje'];
    const flags = new Map<string, boolean>();
    const flagOf = (f: string): boolean => flags.get(f) === true;

    for (let step = 0; step < STORY_BEATS.length + 2; step += 1) {
      const next = nextBeat({
        beats: STORY_BEATS,
        completed,
        flags: flagOf,
        districtId: 'morro-neon',
        npcs,
        exits,
        unlocked: () => true,
      });
      for (const d of DISTRICTS) {
        const floorOpts: Array<'foyer' | 'vip' | null> =
          d.id === 'torre-casa' ? ['foyer', 'vip'] : [null];
        for (const floor of floorOpts) {
          const obj = currentObjective({
            beats: STORY_BEATS,
            completed,
            flags: flagOf,
            districtId: d.id,
            npcs: floorNpcsFor(npcs, d.id, floor),
            allNpcs: npcs,
            vipFloor: floor === 'vip',
            exits,
            unlocked: () => true,
          });
          assertObjectiveSane(`${d.id}/${floor}@${completed.at(-1)}`, obj, d.id);
        }
      }
      if (!next) break;
      completed.push(next.id);
      for (const f of next.setsFlags) flags.set(f, true);
    }
  });
});

describe('v1.18.1 Neon Snap collision + run latch + clues', () => {
  beforeEach(stubStorage);

  it('south barricade tiles are blocked on the real avenida collision map', () => {
    const map = buildDistrictMap('avenida-odds');
    for (let x = 12; x <= 34; x += 1) {
      expect(isWalkable(map, x, 15), `south wall ${x},15`).toBe(false);
      expect(isWalkable(map, x, 16), `south wall ${x},16`).toBe(false);
    }
    const walkable = (x: number, y: number): boolean => isWalkable(map, x, y);
    expect(droneFreePathExists(AVENIDA_DRONE_STEALTH, walkable)).toBe(false);
  });

  it('holding run through arrival blocks the next district until release', () => {
    const s = new GameSession(19);
    s.startNew();
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.setRunHeld(true);
    s.travelTo('feira-central');
    const morroPad = districtExits().find(
      (e) => e.districtId === 'feira-central' && e.toDistrict === 'morro-neon',
    )!;
    s.player.setPosition(morroPad.x, morroPad.y);
    expect(s.nearbyExit()).toBeNull();
    s.setRunHeld(false);
    s.player.setPosition(morroPad.x, morroPad.y);
    expect(s.nearbyExit()?.toDistrict).toBe('morro-neon');
  });

  it('influencer clue stays indirect (no Bought likes leak)', () => {
    const phase = skillForBet('influencer-duelo', 'choice')!.phases[0]!;
    expect(phase.options?.[0]).not.toMatch(/Bought likes/i);
    expect(choiceClueIndirect(phase)).toBe(true);
    expect(phase.clue?.toLowerCase()).not.toMatch(/\bbought\b|\blikes\b/);
  });
});
