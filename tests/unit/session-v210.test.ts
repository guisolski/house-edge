import { beforeEach, describe, expect, it, vi } from 'vitest';
import { districtNpcs, INTERACT_RANGE } from '../../src/systems/interaction';
import {
  AVENIDA_DRONE_STEALTH,
  MIN_SAFE_WINDOW_MS,
  stealthForBet,
} from '../../src/systems/stealth';
import { simulateWalkClear } from '../helpers/stealth-walk-solve';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { GameSession } from '../../src/systems/session';
import {
  assistAfterMiss,
  skillForBet,
  startSkill,
  attemptSkill,
  timingZone,
} from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
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

/** Lane interior used by Neon Snap (sealed N/S; walkable y11–12 x12–34). */
function inDroneLane(x: number, y: number): boolean {
  return x >= 12 && x <= 34 && (y === 11 || y === 12);
}

describe('v1.21.0 Neon Snap completed + lane clear of NPCs', () => {
  beforeEach(stubStorage);

  it('after drone_ok, Neon Snap gives a completed line — never re-offers stealth', () => {
    const session = new GameSession(210);
    session.startNew();
    session.world.unlock('feira-central');
    session.world.unlock('avenida-odds');
    session.player.setDistrict('avenida-odds');
    session.story.setFlag('influencer_ok', true);
    session.story.setFlag('drone_ok', true);
    session.story.completeBeat('avenida-drone');
    const neon = session.npcs.find((n) => n.id === 'neon-snap')!;
    session.player.setPosition(neon.x, neon.y);
    expect(session.interact(false)).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
    const text = session
      .getDialogue()
      .map((l) => l.text)
      .join(' ');
    expect(text.toLowerCase()).toMatch(/already|done|cleared|owed|owed you|photo/);
    expect(session.hasPendingStoryBet()).toBe(false);
    expect(session.isStealthActive()).toBe(false);
    // Closing must not leave a stealth restart pending.
    session.closeModal();
    expect(session.isStealthActive()).toBe(false);
    expect(stealthForBet('avenida-drone')).toBeTruthy();
  });

  it('jobBet path cannot restart avenida-drone stealth once drone_ok', () => {
    const session = new GameSession(211);
    session.startNew();
    session.world.unlock('avenida-odds');
    session.player.setDistrict('avenida-odds');
    session.story.setFlag('drone_ok', true);
    expect(session.offerBet('avenida-drone')).toBe(false);
    expect(session.isStealthActive()).toBe(false);
  });

  it('Odds NPCs stay outside the drone lane tiles', () => {
    const odds = districtNpcs().filter((n) => n.districtId === 'avenida-odds');
    for (const n of odds) {
      expect(inDroneLane(n.x, n.y), `${n.id} @ ${n.x},${n.y}`).toBe(false);
    }
  });

  it('walk solvability still holds with ≥1.2s safe dwell (slightly longer windows)', () => {
    const map = buildDistrictMap('avenida-odds');
    const r = simulateWalkClear(AVENIDA_DRONE_STEALTH, (x, y) => isWalkable(map, x, y));
    expect(r.ok).toBe(true);
    expect(r.maxSafeDwellMs).toBeGreaterThanOrEqual(MIN_SAFE_WINDOW_MS);
    // Target a slightly longer human-friendly dwell for first-timers.
    expect(r.maxSafeDwellMs).toBeGreaterThanOrEqual(1400);
  });
});

describe('v1.21.0 interact gate — held-key only + short arm', () => {
  beforeEach(stubStorage);

  it('close gate: held key blocked until release even after 500ms', () => {
    const session = new GameSession(212);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    session.noteInteractPressed();
    session.closeModal();
    expect(session.allowInteractInput()).toBe(false);
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 550);
    // Still held — blocked.
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    expect(session.allowInteractInput()).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('after arm expires with key up, first E works (mouse/Space finished skill)', () => {
    const session = new GameSession(214);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    session.closeModal(); // arms rematch; key was never pressed
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 550);
    expect(session.allowInteractInput()).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('modal confirm ignores Interact held at open; fresh press after 250ms ok', () => {
    const session = new GameSession(213);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    session.noteModalOpened(true);
    expect(session.allowModalConfirm()).toBe(false);
    session.noteInteractRelease();
    // Released but still inside 250ms arm.
    expect(session.allowModalConfirm()).toBe(false);
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 260);
    expect(session.allowModalConfirm()).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
  });
});

describe('v1.21.0 late-game needle curve', () => {
  it('Casa elevator + Augusto timing are tighter than early bets', () => {
    const elev = SKILL_PHASE_TABLE['torre-elevator']!;
    const early = SKILL_PHASE_TABLE['agua-gelada']!;
    expect(elev.window ?? 1).toBeLessThan(early.window ?? 0);
    expect(elev.window ?? 1).toBeLessThanOrEqual(0.12);
    const duel = skillForBet('duelo-casa', 'duel')!;
    const p0 = duel.phases[0]!;
    expect(p0.window ?? 1).toBeLessThanOrEqual(0.08);
    const zone = timingZone(p0);
    expect(zone.hi - zone.lo).toBeLessThanOrEqual(0.16);
  });

  it('assistAfterMiss widens only after 2+ misses on a phase', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    const base = p.def.phases[0]!.window ?? 0;
    p = attemptSkill(p, { phaseIndex: 0, value: 0 });
    expect(p.misses).toBe(1);
    p = assistAfterMiss(p);
    expect(p.def.phases[0]!.window).toBe(base);
    p = attemptSkill(p, { phaseIndex: 0, value: 0 });
    expect(p.misses).toBe(2);
    p = assistAfterMiss(p);
    expect(p.def.phases[0]!.window).toBeGreaterThan(base);
  });
});

describe('v1.21.0 foyer objective is a fixed Guard target', () => {
  beforeEach(stubStorage);

  it('torre-foyer objective points at Foyer Guard coords, not the elevator pad', () => {
    const session = new GameSession(214);
    session.startNew();
    session.world.unlock('feira-central');
    session.world.unlock('avenida-odds');
    session.world.unlock('torre-casa');
    // Complete every earlier main beat so nextBeat resolves to torre-foyer.
    for (const b of STORY_BEATS) {
      if (b.optional || b.id === 'torre-foyer') continue;
      if (
        [
          'torre-pit',
          'torre-elevator',
          'torre-vip',
          'torre-negotiate',
          'torre-final',
          'epilogue-laje',
        ].includes(b.id)
      ) {
        continue;
      }
      session.story.completeBeat(b.id);
      for (const f of b.setsFlags ?? []) session.story.setFlag(f, true);
    }
    session.story.setFlag('unlocked_torre', true);
    session.story.setFlag('escandalo_aberto', true);
    session.story.setFlag('morro_return_ok', true);
    session.player.setDistrict('torre-casa');
    session.player.setPosition(14, 14);
    const guard = session.npcs.find((n) => n.id === 'foyer-guard')!;
    const elev = session.npcs.find((n) => n.id === 'elevator')!;
    const obj = session.objective();
    expect(obj.targetName).toBe('Foyer Guard');
    expect(obj.targetX).toBe(guard.x);
    expect(obj.targetY).toBe(guard.y);
    expect(obj.targetX).not.toBe(elev.x);
    expect(obj.targetY).not.toBe(elev.y);
  });
});

describe('v1.21.0 quest NPC home leash', () => {
  it('quest NPCs expose a home + wander radius ≤ 1.25 (objective ≤ 0.35)', () => {
    const quest = ['dona-nair', 'kiko', 'neon-snap', 'foyer-guard', 'mole-contact'];
    for (const id of quest) {
      const n = districtNpcs().find((x) => x.id === id)!;
      expect(n.homeX ?? n.x).toBeDefined();
      expect(n.homeY ?? n.y).toBeDefined();
      expect(n.wanderRadius ?? 0).toBe(0);
    }
  });

  it('tickNpcWander leashes, freezes tiny radius, and refuses the drone lane', async () => {
    const { tickNpcWander, inNeonSnapLane } =
      await import('../../src/systems/interaction');
    const frozen = {
      id: 'x',
      name: 'X',
      districtId: 'morro-neon' as const,
      x: 10,
      y: 10,
      homeX: 10,
      homeY: 10,
      wanderRadius: 0,
      color: '#fff',
    };
    tickNpcWander(frozen, 1, 3);
    expect(frozen.x).toBe(10);
    expect(frozen.y).toBe(10);
    const ambient = {
      id: 'y',
      name: 'Y',
      districtId: 'feira-central' as const,
      x: 16,
      y: 14,
      homeX: 16,
      homeY: 14,
      wanderRadius: 1.1,
      color: '#fff',
    };
    tickNpcWander(ambient, 1, 12.5);
    expect(Math.hypot(ambient.x - 16, ambient.y - 14)).toBeLessThanOrEqual(1.1 + 1e-6);
    const laneProbe = {
      id: 'z',
      name: 'Z',
      districtId: 'avenida-odds' as const,
      x: 20,
      y: 11,
      homeX: 20,
      homeY: 11,
      wanderRadius: 2,
      color: '#fff',
    };
    // Force a wander step; if it would enter lane tiles, snap home.
    for (let i = 0; i < 20; i += 1) tickNpcWander(laneProbe, 1, i * 1.7);
    expect(inNeonSnapLane(laneProbe.x, laneProbe.y)).toBe(false);
  });

  it('objective NPC still wins E-prompt when a nearer neighbour faces away', () => {
    const session = new GameSession(215);
    session.startNew();
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    const ze = session.npcs.find((n) => n.id === 'seu-ze')!;
    nair.x = 14;
    nair.y = 16;
    ze.x = 12.5;
    ze.y = 16;
    session.player.setPosition(12.8, 16);
    session.player.setFacing(-1, 0); // facing away from Nair toward Ze
    expect(Math.hypot(ze.x - 12.8, ze.y - 16)).toBeLessThan(
      Math.hypot(nair.x - 12.8, nair.y - 16),
    );
    expect(session.objectiveNpcInRange()?.id).toBe('dona-nair');
    expect(session.nearbyNpc()?.id).toBe('dona-nair');
    expect(INTERACT_RANGE).toBeGreaterThan(0);
  });
});
