import { DISTRICTS } from '../content/districts';
import type { DistrictId, StoryBeat } from '../core/types';
import type { WorldNpc, DistrictExit } from './interaction';

/** GD-1: always show the next concrete objective. */

export type Objective = {
  text: string;
  targetX?: number;
  targetY?: number;
  districtId?: string;
};

export type ObjectiveCtx = {
  beats: readonly StoryBeat[];
  completed: readonly string[];
  flags: (f: string) => boolean;
  districtId: string;
  npcs: readonly WorldNpc[];
  exits: readonly DistrictExit[];
  unlocked: (id: string) => boolean;
};

export function currentObjective(ctx: ObjectiveCtx): Objective {
  if (ctx.flags('casa_quebrada') || ctx.flags('free_roam')) {
    return freeRoamObjective(ctx);
  }
  const next = nextBeat(ctx);
  if (!next) return { text: 'Story complete — grind side jobs or explore.' };
  if (next.districtId !== ctx.districtId) return travelObjective(ctx, next);
  return npcObjective(ctx, next);
}

function freeRoamObjective(ctx: ObjectiveCtx): Objective {
  if (ctx.flags('epilogue_done')) {
    return { text: 'Story complete — grind side jobs or explore.' };
  }
  const epi = ctx.npcs.find((n) => n.extraBeatIds?.includes('epilogue-laje'));
  if (epi && epi.districtId === ctx.districtId) {
    return {
      text: 'Free roam — or talk to Dona Nair for the laje epilogue.',
      targetX: epi.x,
      targetY: epi.y,
      districtId: ctx.districtId,
    };
  }
  return {
    text: 'Free roam — grind side jobs, explore, or revisit the hill for the epilogue.',
  };
}

/** Public helper so NPCs can redirect the player to the live objective. */
export function nextBeat(ctx: ObjectiveCtx): StoryBeat | undefined {
  return ctx.beats.find(
    (b) =>
      !b.optional &&
      !ctx.completed.includes(b.id) &&
      !(b.skipIfFlag && ctx.flags(b.skipIfFlag)) &&
      b.requiredFlags.every((f) => ctx.flags(f)),
  );
}

function districtName(id: string): string {
  return DISTRICTS.find((d) => d.id === id)?.name ?? id;
}

function beatNpc(ctx: ObjectiveCtx, beat: StoryBeat): WorldNpc | undefined {
  return ctx.npcs.find((n) => n.beatId === beat.id || n.extraBeatIds?.includes(beat.id));
}

function travelExit(ctx: ObjectiveCtx, toDistrict: string): DistrictExit | undefined {
  return ctx.exits.find(
    (e) =>
      e.districtId === ctx.districtId &&
      e.toDistrict === toDistrict &&
      ctx.unlocked(e.toDistrict),
  );
}

function hopFromPath(
  via: Map<string, { from: DistrictId; exit: DistrictExit }>,
  dest: string,
  start: string,
): DistrictExit | undefined {
  let step: string = dest;
  while (via.get(step)?.from !== start) {
    const prev = via.get(step);
    if (!prev) return undefined;
    step = prev.from;
  }
  return via.get(step)?.exit;
}

/** First walkable hop toward dest; never routes through locked districts. */
export function firstHopExit(ctx: ObjectiveCtx, dest: string): DistrictExit | undefined {
  const direct = travelExit(ctx, dest);
  if (direct) return direct;

  const queue: DistrictId[] = [ctx.districtId as DistrictId];
  const seen = new Set<string>([ctx.districtId]);
  const via = new Map<string, { from: DistrictId; exit: DistrictExit }>();

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const exit of ctx.exits) {
      if (exit.districtId !== cur || !ctx.unlocked(exit.toDistrict)) continue;
      if (seen.has(exit.toDistrict)) continue;
      seen.add(exit.toDistrict);
      via.set(exit.toDistrict, { from: cur, exit });
      if (exit.toDistrict === dest) return hopFromPath(via, dest, ctx.districtId);
      queue.push(exit.toDistrict);
    }
  }
  return undefined;
}

function travelObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const place = districtName(next.districtId);
  const npc = beatNpc(ctx, next);
  const who = npc ? ` — talk to ${npc.name}` : '';
  const hop = firstHopExit(ctx, next.districtId);
  if (hop) {
    const hopPlace = districtName(hop.toDistrict);
    const text =
      hop.toDistrict === next.districtId
        ? `Go to ${place}${who} (${next.title})`
        : `Walk to ${hopPlace} exit → then ${place}${who}`;
    return { text, targetX: hop.x, targetY: hop.y, districtId: ctx.districtId };
  }
  if (ctx.unlocked(next.districtId)) {
    return { text: `Travel menu → ${place}${who}`, districtId: next.districtId };
  }
  return { text: `Unlock path to ${place} — finish the current bet.` };
}

function npcObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const npc = ctx.npcs.find(
    (n) =>
      n.districtId === ctx.districtId &&
      (n.beatId === next.id || n.extraBeatIds?.includes(next.id)),
  );
  if (npc) {
    return {
      text: `Talk to ${npc.name}: ${next.title}`,
      targetX: npc.x,
      targetY: npc.y,
      districtId: ctx.districtId,
    };
  }
  return {
    text: `${next.title} — look around ${districtName(ctx.districtId)}`,
    districtId: ctx.districtId,
  };
}

function sideBeatReady(ctx: ObjectiveCtx, beat: StoryBeat): boolean {
  if (!beat.optional || beat.districtId !== ctx.districtId) return false;
  if (ctx.completed.includes(beat.id)) return false;
  if (beat.skipIfFlag && ctx.flags(beat.skipIfFlag)) return false;
  return beat.requiredFlags.every((f) => ctx.flags(f));
}

/** Available optional side quests in the current district (for world markers). */
export function sideQuestMarkers(
  ctx: ObjectiveCtx,
): { x: number; y: number; label: string }[] {
  const out: { x: number; y: number; label: string }[] = [];
  for (const beat of ctx.beats) {
    if (!sideBeatReady(ctx, beat)) continue;
    const npc = beatNpc(ctx, beat);
    if (!npc) continue;
    out.push({ x: npc.x, y: npc.y, label: beat.title });
  }
  return out;
}
