import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { nearestWalkable, slideStep } from '../../src/world/slide';
import {
  attemptSkill,
  skillForBet,
  startSkill,
  timingZone,
} from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';

function stubStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

describe('v1.22.11 unstuck + Avenida + Torre aisles', () => {
  beforeEach(stubStorage);

  it('nearestWalkable nudges out of a blocked Avenida approach strip', () => {
    const map = buildDistrictMap('avenida-odds');
    // Playtest #39: sealed approach is y9/y14 (shoulders y10/y13 are clear).
    expect(isWalkable(map, 20, 9)).toBe(false);
    const free = nearestWalkable(map, 20, 9);
    expect(free).not.toBeNull();
    expect(isWalkable(map, free!.x, free!.y)).toBe(true);
    expect(Math.hypot(free!.x - 20, free!.y - 9)).toBeLessThanOrEqual(2);
    // Already free → null; OOB clamps into a searchable ring.
    expect(nearestWalkable(map, 20, 11)).toBeNull();
    expect(nearestWalkable(map, -2, 10)).not.toBeNull();
  });

  it('session.unstuckIfNeeded frees a player planted in a solid', () => {
    const session = new GameSession();
    session.startNew();
    session.world.unlock('avenida-odds');
    session.travelTo('avenida-odds');
    expect(session.unstuckIfNeeded()).toBe(false);
    session.player.setPosition(20, 9);
    expect(session.unstuckIfNeeded()).toBe(true);
    const s = session.player.getStats();
    expect(isWalkable(session.getMap(), s.x, s.y)).toBe(true);
    // move() also unstucks when starting inside a solid.
    session.player.setPosition(12, 9);
    expect(session.move(1, 0)).toBe(true);
    expect(
      isWalkable(
        session.getMap(),
        session.player.getStats().x,
        session.player.getStats().y,
      ),
    ).toBe(true);
  });

  it('Avenida center lanes stay continuous asphalt', () => {
    const map = buildDistrictMap('avenida-odds');
    for (let x = 2; x <= 43; x += 1) {
      expect(isWalkable(map, x, 11), `lane ${x},11`).toBe(true);
      expect(isWalkable(map, x, 12), `lane ${x},12`).toBe(true);
    }
  });

  it('Torre foyer plaza strip is walkable end-to-end', () => {
    const map = buildDistrictMap('torre-casa');
    for (let x = 5; x <= 34; x += 1) {
      expect(isWalkable(map, x, 11), `plaza ${x},11`).toBe(true);
      expect(isWalkable(map, x, 12), `plaza ${x},12`).toBe(true);
    }
    // No corner-snag walking east along the aisle.
    let x = 6;
    const y = 12;
    for (let i = 0; i < 28; i += 1) {
      const next = slideStep(map, x, y, 1, 0);
      expect(next, `step from ${x}`).not.toBeNull();
      x = next!.x;
    }
    expect(x).toBeGreaterThanOrEqual(30);
  });
});

describe('v1.22.11 needle first-try window + VIP confirm arm', () => {
  beforeEach(stubStorage);

  it('first timing attempt is wider than post-miss window', () => {
    const phase = SKILL_PHASE_TABLE['torre-vip']!;
    const first = timingZone(phase, 0);
    const later = timingZone(phase, 1);
    const base = timingZone(phase);
    expect(first.half).toBeGreaterThan(later.half);
    expect(later.half).toBe(phase.window);
    expect(base.half).toBe(phase.window);
  });

  it('edge stop that only fits the first-try bonus fails after a miss', () => {
    const def = skillForBet('torre-vip', 'timing')!;
    let p = startSkill(def);
    const zone0 = timingZone(def.phases[0]!, 0);
    const edge = zone0.lo + 0.001;
    expect(zone0.lo).toBeLessThan(timingZone(def.phases[0]!, 1).lo);
    p = attemptSkill(p, { phaseIndex: 0, value: edge });
    expect(p.won || !p.justMissed).toBe(true);
    // Miss once with a far value, then the same edge should fail.
    p = startSkill(def);
    p = attemptSkill(p, { phaseIndex: 0, value: 0 });
    expect(p.misses).toBe(1);
    p = attemptSkill(p, { phaseIndex: 0, value: edge });
    expect(p.justMissed).toBe(true);
  });

  it('skill modal arm blocks confirm until key-up after Aceitar', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(500);
    session.story.setFlag('elevator_ok', true);
    expect(session.runStoryBeat('torre-vip')).toBe(true);
    expect(session.hasPendingStoryBet()).toBe(true);
    session.noteInteractPressed('Enter');
    session.acceptStoryBet();
    expect(session.ui.is('skill')).toBe(true);
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    // Simulate showSkill arm (held Interact across Aceitar).
    session.noteModalOpened(true);
    expect(session.allowModalConfirm()).toBe(false);
    // Playtest #43: open no longer marks heldThroughArm — after arm expiry, release is free.
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 450);
    session.noteInteractRelease();
    expect(session.allowModalConfirm()).toBe(true);
  });
});
