import { describe, expect, it } from 'vitest';
import {
  resolveInteractPriority,
  shouldClearExitLatch,
  spawnClearOfExits,
} from '../../src/systems/interact-priority';
import { districtExits, EXIT_STAND_RANGE } from '../../src/systems/interaction';
import { DISTRICTS } from '../../src/content/districts';

describe('interact priority', () => {
  it('objective NPC beats travel pad', () => {
    expect(
      resolveInteractPriority({
        objectiveNpcInRange: true,
        unlockedExitInRange: true,
        lockedExitInRange: false,
        otherNpcInRange: true,
      }),
    ).toBe('objective');
  });

  it('travel pad beats non-objective NPCs', () => {
    expect(
      resolveInteractPriority({
        objectiveNpcInRange: false,
        unlockedExitInRange: true,
        lockedExitInRange: false,
        otherNpcInRange: true,
      }),
    ).toBe('travel');
  });

  it('clears to none when out of range', () => {
    expect(
      resolveInteractPriority({
        objectiveNpcInRange: false,
        unlockedExitInRange: false,
        lockedExitInRange: false,
        otherNpcInRange: false,
      }),
    ).toBe('none');
  });

  it('locked and plain npc branches', () => {
    expect(
      resolveInteractPriority({
        objectiveNpcInRange: false,
        unlockedExitInRange: false,
        lockedExitInRange: true,
        otherNpcInRange: true,
      }),
    ).toBe('locked');
    expect(
      resolveInteractPriority({
        objectiveNpcInRange: false,
        unlockedExitInRange: false,
        lockedExitInRange: false,
        otherNpcInRange: true,
      }),
    ).toBe('npc');
  });

  it('exit latch clears only after leaving every pad stand range', () => {
    const exits = [
      { x: 5, y: 12 },
      { x: 40, y: 12 },
    ];
    expect(shouldClearExitLatch({ x: 5, y: 12 }, exits, EXIT_STAND_RANGE)).toBe(false);
    expect(shouldClearExitLatch({ x: 16, y: 12 }, exits, EXIT_STAND_RANGE)).toBe(true);
  });

  it('every district spawn sits clear of its exit pads', () => {
    for (const d of DISTRICTS) {
      const pads = districtExits().filter((e) => e.districtId === d.id);
      expect(
        spawnClearOfExits(d.spawn, pads, EXIT_STAND_RANGE),
        `${d.id} spawn ${d.spawn.x},${d.spawn.y}`,
      ).toBe(true);
    }
  });
});
