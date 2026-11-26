import { beforeEach, describe, expect, it, vi } from 'vitest';
import { districtNpcs, INTERACT_RANGE } from '../../src/systems/interaction';
import {
  AVENIDA_DRONE_STEALTH,
  MIN_SAFE_WINDOW_MS,
  coneCoverageOverCycle,
  inCover,
  anyDroneSpots,
  startStealth,
  pointInCone,
} from '../../src/systems/stealth';
import { simulateWalkClear } from '../helpers/stealth-walk-solve';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { DISTRICTS } from '../../src/content/districts';
import { GameSession } from '../../src/systems/session';

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

describe('v1.20.2 real spawn E-prompt', () => {
  beforeEach(stubStorage);

  it('at real Morro spawn, prompt prefers Dona Nair over Antena Tech', () => {
    const session = new GameSession(24);
    session.startNew();
    const spawn = DISTRICTS.find((d) => d.id === 'morro-neon')!.spawn;
    const pos = session.player.getStats();
    expect(pos.x).toBe(spawn.x);
    expect(pos.y).toBe(spawn.y);
    expect(session.objective().targetName).toBe('Dona Nair');
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    const antena = session.npcs.find((n) => n.id === 'antena-tech')!;
    expect(Math.hypot(nair.x - pos.x, nair.y - pos.y)).toBeLessThanOrEqual(
      INTERACT_RANGE,
    );
    expect(Math.hypot(antena.x - pos.x, antena.y - pos.y)).toBeGreaterThan(
      INTERACT_RANGE,
    );
    expect(session.nearbyNpc()?.id).toBe('dona-nair');
    expect(session.objectiveNpcInRange()?.id).toBe('dona-nair');
  });

  it('clustered objective still beats a nearer neighbour', () => {
    const session = new GameSession(25);
    session.startNew();
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    const antena = session.npcs.find((n) => n.id === 'antena-tech')!;
    nair.x = 14;
    nair.y = 16;
    antena.x = 12.2;
    antena.y = 16;
    session.player.setPosition(12.5, 16);
    expect(session.nearbyNpc()?.id).toBe('dona-nair');
  });

  it('Fair DJ and Odds Mole stay clear of prompt stealers', () => {
    const dj = districtNpcs().find((n) => n.id === 'forro-dj')!;
    const dancer = districtNpcs().find((n) => n.id === 'dancer-feira')!;
    const mole = districtNpcs().find((n) => n.id === 'mole-contact')!;
    const margin = districtNpcs().find((n) => n.id === 'margin')!;
    expect(Math.hypot(dj.x - dancer.x, dj.y - dancer.y)).toBeGreaterThan(INTERACT_RANGE);
    expect(Math.hypot(mole.x - margin.x, mole.y - margin.y)).toBeGreaterThan(
      INTERACT_RANGE,
    );
  });
});

describe('v1.20.2 Neon Snap solvability', () => {
  it('walk-speed simulation clears with ≥1.2s safe dwell', () => {
    const map = buildDistrictMap('avenida-odds');
    const r = simulateWalkClear(AVENIDA_DRONE_STEALTH, (x, y) => isWalkable(map, x, y));
    expect(r.ok).toBe(true);
    expect(r.maxSafeDwellMs).toBeGreaterThanOrEqual(MIN_SAFE_WINDOW_MS);
  });

  it('checkpoint stays outside all cones; barriers seal bypass not corridor', () => {
    const covered = coneCoverageOverCycle(AVENIDA_DRONE_STEALTH);
    const cp = AVENIDA_DRONE_STEALTH.checkpoint;
    expect(covered.has(`${Math.round(cp.x)},${Math.round(cp.y)}`)).toBe(false);
    const map = buildDistrictMap('avenida-odds');
    expect(isWalkable(map, 20, 11)).toBe(true);
    expect(isWalkable(map, 20, 12)).toBe(true);
    expect(isWalkable(map, 20, 9)).toBe(false);
    expect(isWalkable(map, 20, 14)).toBe(false);
    // Playtest #39: shoulders clear; approach strips still seal N/S bypass.
    expect(isWalkable(map, 20, 10)).toBe(true);
    expect(isWalkable(map, 20, 13)).toBe(true);
  });

  it('cover hides the player from cones; blocked map fails the walk solve', () => {
    const cover = AVENIDA_DRONE_STEALTH.cover![0]!;
    expect(inCover(AVENIDA_DRONE_STEALTH, cover)).toBe(true);
    expect(inCover({ ...AVENIDA_DRONE_STEALTH, cover: [] }, cover)).toBe(false);
    const p = startStealth(AVENIDA_DRONE_STEALTH);
    expect(anyDroneSpots(p, cover)).toBe(false);
    const session = new GameSession(27);
    session.startNew();
    expect(session.isStealthSafe()).toBe(true);
    session.world.unlock('avenida-odds');
    session.player.setDistrict('avenida-odds');
    session.story.setFlag('influencer_ok', true);
    session.runStoryBeat('avenida-drone');
    session.pickDialogueChoice('drone_low', 'ok');
    session.acceptStoryBet();
    expect(session.isStealthActive()).toBe(true);
    session.player.setPosition(cover.x, cover.y);
    expect(session.isStealthSafe()).toBe(true);
    const d = p.drones[0]!;
    void pointInCone({
      origin: { x: d.x, y: d.y },
      facing: d.facing,
      halfAngle: d.halfAngle,
      range: d.range,
      point: cover,
    });
    const fail = simulateWalkClear(AVENIDA_DRONE_STEALTH, () => false, {
      maxWaitMs: 200,
      timeLimitMs: 800,
    });
    expect(fail.ok).toBe(false);
  });

  it('reaching the goal without a ≥1.2s dwell fails the solve', () => {
    const def = {
      ...AVENIDA_DRONE_STEALTH,
      start: { x: 12, y: 12 },
      checkpoint: { x: 12, y: 12 },
      goal: { x: 14, y: 12 },
      goalRadius: 0.5,
      cover: [],
      drones: [],
    };
    const r = simulateWalkClear(def, () => true, { maxWaitMs: 100 });
    expect(r.steps).toBeGreaterThan(0);
    expect(r.maxSafeDwellMs).toBeLessThan(MIN_SAFE_WINDOW_MS);
    expect(r.ok).toBe(false);
  });

  it('already-at-goal with no dwell window is not ok', () => {
    const def = {
      ...AVENIDA_DRONE_STEALTH,
      start: { x: 20, y: 12 },
      checkpoint: { x: 20, y: 12 },
      goal: { x: 20, y: 12 },
      goalRadius: 0.5,
      cover: [],
      drones: [],
    };
    const r = simulateWalkClear(def, () => true, { maxWaitMs: 50 });
    expect(r.ok).toBe(false);
    expect(r.steps).toBe(0);
  });
});

describe('v1.20.2 interact input gate', () => {
  beforeEach(stubStorage);

  it('allowInteractInput requires release after close + 400ms', () => {
    const session = new GameSession(26);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    session.noteInteractPressed();
    session.closeModal();
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    expect(session.allowInteractInput()).toBe(false);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 500);
    // Release during lock was pending — clears once the timer expires.
    expect(session.allowInteractInput()).toBe(true);
    // Fresh close while still holding Interact — blocked until release even after arm.
    session.noteInteractPressed();
    session.closeModal();
    expect(session.allowInteractInput()).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(now + 1200);
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    expect(session.allowInteractInput()).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
  });
});
