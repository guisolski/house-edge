import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  EXIT_CLEAR_RANGE,
  EXIT_COOLDOWN_MS,
  EXIT_DWELL_MS,
  EXIT_STAND_RANGE,
  arrivalSpawnFromPad,
  districtExits,
} from '../../src/systems/interaction';
import { shouldClearExitLatch } from '../../src/systems/interact-priority';
import { createSequenceKeyBuffer } from '../../src/ui/panels';
import { AVENIDA_DRONE_STEALTH, droneFreePathExists } from '../../src/systems/stealth';
import { buildDistrictMap } from '../../src/world/maps';
import {
  choiceClueIndirect,
  lockpickClueDeducible,
  skillForBet,
  startSkill,
  attemptSkill,
  SEQ_KEYS,
} from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import { isWalkable } from '../../src/world/maps';

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

describe('v1.18.0 pad arrival off-pad + leave/re-enter', () => {
  beforeEach(stubStorage);

  it('arrivalSpawnFromPad sits outside CLEAR range facing inward', () => {
    const pad = districtExits().find((e) => e.id === 'avenida-to-feira')!;
    const spawn = arrivalSpawnFromPad(pad);
    expect(Math.hypot(spawn.x - pad.x, spawn.y - pad.y)).toBeGreaterThan(
      EXIT_CLEAR_RANGE,
    );
    expect(spawn.dx).toBe(1);
  });

  it('travelTo spawns off-pad; 1.5s walks keep the same district', () => {
    vi.useFakeTimers();
    const s = new GameSession(8);
    s.startNew();
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    const pad = districtExits().find(
      (e) => e.districtId === 'avenida-odds' && e.toDistrict === 'feira-central',
    )!;
    const steps = Math.ceil(1500 / 28);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      // Fresh arrival each direction so cooldown matches a real walk-in.
      s.player.setDistrict('feira-central');
      expect(s.travelTo('avenida-odds')).toBe(true);
      const arrived = s.player.getStats();
      expect(arrived.districtId).toBe('avenida-odds');
      expect(Math.hypot(arrived.x - pad.x, arrived.y - pad.y)).toBeGreaterThan(
        EXIT_STAND_RANGE,
      );
      for (let i = 0; i < steps; i += 1) {
        vi.advanceTimersByTime(28);
        s.move(dx, dy);
      }
      expect(s.player.getStats().districtId).toBe('avenida-odds');
    }
    vi.useRealTimers();
  });

  it('pad re-arms only after clear + cooldown + re-enter step', () => {
    vi.useFakeTimers();
    const s = new GameSession(9);
    s.startNew();
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('feira-central');
    s.travelTo('avenida-odds');
    expect(s.nearbyExit()).toBeNull();
    const pad = districtExits().find(
      (e) => e.districtId === 'avenida-odds' && e.toDistrict === 'feira-central',
    )!;
    // Walk deep inland to clear + expire cooldown.
    s.player.setPosition(pad.x + 10, pad.y);
    s.move(1, 0);
    vi.advanceTimersByTime(EXIT_COOLDOWN_MS + 50);
    expect(
      shouldClearExitLatch(
        s.player.getStats(),
        districtExits().filter((e) => e.districtId === 'avenida-odds'),
        EXIT_CLEAR_RANGE,
      ),
    ).toBe(true);
    // Re-enter pad: first step arms dwell, second after dwell travels.
    s.player.setPosition(pad.x + 1, pad.y);
    expect(s.move(-1, 0)).toBe(true);
    expect(s.player.getStats().districtId).toBe('avenida-odds');
    vi.advanceTimersByTime(EXIT_DWELL_MS + 20);
    s.player.setPosition(pad.x, pad.y);
    s.player.setFacing(-1, 0);
    expect(s.move(-1, 0)).toBe(true);
    expect(s.player.getStats().districtId).toBe('feira-central');
    vi.useRealTimers();
  });
});

describe('v1.18.0 stealth corridor coverage', () => {
  it('no drone-free grid path from start to goal on Odds Avenue', () => {
    const map = buildDistrictMap('avenida-odds');
    const walkable = (x: number, y: number): boolean => isWalkable(map, x, y);
    expect(droneFreePathExists(AVENIDA_DRONE_STEALTH, walkable)).toBe(false);
  });
});

describe('v1.18.0 sequence keydown buffer', () => {
  it('buffers rapid keydowns without dropping taps', () => {
    const seen: number[] = [];
    const buf = createSequenceKeyBuffer((k) => {
      seen.push(k);
      // Nested push while draining must still flush in order.
      if (k === 0) buf.push(1);
    });
    buf.push(0);
    buf.push(2);
    expect(seen).toEqual([0, 1, 2]);
  });

  it('rapid correct sequence advances without frame gaps', () => {
    const def = skillForBet('antena-sinal', 'hack')!;
    let p = startSkill(def);
    const seq = def.phases[0]!.sequence!;
    for (const key of seq) {
      p = attemptSkill(p, {
        phaseIndex: 0,
        value: SEQ_KEYS.indexOf(key),
      });
    }
    expect(p.phaseIndex).toBeGreaterThan(0);
  });
});

describe('v1.18.0 clue re-audit + hush chip', () => {
  beforeEach(stubStorage);

  it('Cage lockpick + Pit Dealer clues stay deducible without leaks', () => {
    expect(lockpickClueDeducible(SKILL_PHASE_TABLE['avenida-server']!)).toBe(true);
    expect(choiceClueIndirect(SKILL_PHASE_TABLE['torre-pit']!)).toBe(true);
    expect(SKILL_PHASE_TABLE['torre-pit']!.clue!.toLowerCase()).not.toMatch(
      /\bdog|\bear/,
    );
  });

  it('hush chip cheapens Augusto stake and injects dialogue', () => {
    const s = new GameSession(11);
    s.startNew();
    s.story.setFlag('negotiate_ok', true);
    s.story.setFlag('neg_hush', true);
    s.world.unlock('torre-casa');
    s.player.setDistrict('torre-casa');
    s.player.addCredits(500);
    expect(s.runStoryBeat('torre-final')).toBe(true);
    expect(s.getDialogue()[0]!.text).toMatch(/hush chip/i);
    expect(s.acceptStoryBet()).toBe(true);
    expect(s.getPendingBet()!.id).toBe('duelo-casa');
    const full = new GameSession(12);
    full.startNew();
    full.story.setFlag('negotiate_ok', true);
    full.world.unlock('torre-casa');
    full.player.setDistrict('torre-casa');
    full.player.addCredits(500);
    full.runStoryBeat('torre-final');
    full.acceptStoryBet();
    const bet = s.getPendingBet()!;
    expect(s.getPendingStake()).toBe(
      Math.max(bet.stakeMin ?? 1, Math.floor(full.getPendingStake() * 0.8)),
    );
  });
});

describe('v1.18.0 elevator fade + VIP exit', () => {
  beforeEach(stubStorage);

  it('elevator ride holds transition ~1.2s with VIP floor', () => {
    vi.useFakeTimers();
    const s = new GameSession(12);
    s.startNew();
    for (const id of [
      'boteco-nair',
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
      'torre-foyer',
      'torre-pit',
    ]) {
      s.story.completeBeat(id);
    }
    for (const f of [
      'conheceu_rita',
      'falou_nair',
      'antena_ok',
      'conheceu_luna',
      'fios_ok',
      'unlocked_feira',
      'unlocked_avenida',
      'unlocked_torre',
      'escandalo_aberto',
      'morro_return_ok',
      'foyer_ok',
      'pit_ok',
      'drone_ok',
      'stealth_ok',
      'lockbox_ok',
      'server_ok',
      'betrayal_ok',
    ]) {
      s.story.setFlag(f, true);
    }
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.world.unlock('torre-casa');
    s.player.setDistrict('torre-casa');
    s.player.addCredits(500);
    expect(s.runStoryBeat('torre-elevator')).toBe(true);
    expect(s.acceptStoryBet()).toBe(true);
    if (s.ui.is('skill')) s.completeSkillPerfect();
    expect(s.isVipFloor()).toBe(true);
    expect(s.ui.is('transition')).toBe(true);
    vi.advanceTimersByTime(1100);
    expect(s.ui.is('transition')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(s.ui.is('play')).toBe(true);
    const elev = s.sideMarkers().find((m) => m.label.startsWith('Elevator'));
    expect(elev).toBeTruthy();
    vi.useRealTimers();
  });
});
