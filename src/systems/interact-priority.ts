/** Pure E-prompt / interact priority rules (unit-tested). */

export type PromptKind = 'objective' | 'travel' | 'locked' | 'npc' | 'none';

export type PromptInputs = {
  objectiveNpcInRange: boolean;
  unlockedExitInRange: boolean;
  lockedExitInRange: boolean;
  otherNpcInRange: boolean;
};

/**
 * Priority:
 * 1. Objective NPC in interact range
 * 2. Travel pad (unlocked exit) — wins over non-objective NPCs
 * 3. Locked exit
 * 4. Other NPC
 * 5. None (prompt must clear)
 */
export function resolveInteractPriority(p: PromptInputs): PromptKind {
  if (p.objectiveNpcInRange) return 'objective';
  if (p.unlockedExitInRange) return 'travel';
  if (p.lockedExitInRange) return 'locked';
  if (p.otherNpcInRange) return 'npc';
  return 'none';
}

/** True once the player has left every exit pad’s stand range after arrival. */
export function shouldClearExitLatch(
  player: { x: number; y: number },
  exits: readonly { x: number; y: number }[],
  range: number,
): boolean {
  return exits.every((e) => Math.hypot(player.x - e.x, player.y - e.y) > range);
}

/** Spawn must sit outside every pad’s stand range. */
export function spawnClearOfExits(
  spawn: { x: number; y: number },
  exits: readonly { x: number; y: number }[],
  range: number,
): boolean {
  return shouldClearExitLatch(spawn, exits, range);
}
