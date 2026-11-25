/** Playtest #26: exactly one visible name label per NPC entity. */

import type { GameSession } from './session';
import type { WorldNpc } from './interaction';
import type { Objective } from './objectives';

export type NpcLabelCount = { name: string; count: number };

function npcIsObjective(npc: WorldNpc, obj: Objective): boolean {
  if (obj.targetName != null && npc.name === obj.targetName) return true;
  if (obj.targetX == null || obj.targetY == null) return false;
  return Math.hypot(npc.x - obj.targetX, npc.y - obj.targetY) < 0.6;
}

function shouldShowPlate(
  npc: WorldNpc,
  me: { x: number; y: number },
  obj: Objective,
): boolean {
  if (npcIsObjective(npc, obj)) return true;
  return Math.hypot(npc.x - me.x, npc.y - me.y) <= 1.5;
}

/**
 * Counts how many on-screen name sources would fire for each NPC name
 * in the current district (sprite nameplate + objective text if any).
 * Elevators are neon-only and excluded.
 */
export function countNpcLabels(session: GameSession): NpcLabelCount[] {
  const me = session.player.getStats();
  const obj = session.objective();
  const byName = new Map<string, number>();
  for (const npc of session.floorNpcs()) {
    if (npc.districtId !== me.districtId || !npc.name) continue;
    if (npc.id.startsWith('elevator')) continue;
    if (!shouldShowPlate(npc, me, obj)) continue;
    byName.set(npc.name, (byName.get(npc.name) ?? 0) + 1);
  }
  // Objective arrow never adds a second text label for NPC targets (arrow-only).
  return [...byName.entries()].map(([name, count]) => ({ name, count }));
}

/** True when every visible NPC name has exactly one label. */
export function npcLabelsUnique(session: GameSession): boolean {
  const rows = countNpcLabels(session);
  return rows.length > 0 && rows.every((r) => r.count === 1);
}
