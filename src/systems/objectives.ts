import { DISTRICTS } from '../content/districts';
import type { DistrictId, StoryBeat } from '../core/types';
import type { WorldNpc, DistrictExit } from './interaction';

/** GD-1: always show the next concrete objective with a world marker. */

export type Objective = {
  /** Primary HUD line — concrete target + district. */
  text: string;
  /** Flavour / beat title on a secondary line. */
  detail?: string;
  /** Name drawn on the world marker (NPC / exit / object). */
  targetName?: string;
  targetX?: number;
  targetY?: number;
  districtId?: string;
};

export type ObjectiveCtx = {
  beats: readonly StoryBeat[];
  completed: readonly string[];
  flags: (f: string) => boolean;
  districtId: string;
  /** NPCs visible on the active floor (VIP vs foyer). */
  npcs: readonly WorldNpc[];
  /** Full NPC roster — used to resolve targets on the other Casa floor. */
  allNpcs?: readonly WorldNpc[];
  /** True while Rita is on the VIP salon map. */
  vipFloor?: boolean;
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
      text: `Talk to ${epi.name} (${districtName(ctx.districtId)})`,
      detail: 'Optional laje epilogue — or keep grinding.',
      targetName: epi.name,
      targetX: epi.x,
      targetY: epi.y,
      districtId: ctx.districtId,
    };
  }
  return {
    text: 'Free roam — grind side jobs or explore',
    detail: 'Epilogue waits on the hill with Dona Nair.',
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

/** Short marker labels so edge pointers stay readable (arrow-only when near EXIT signs). */
function districtShortName(id: string): string {
  if (id === 'torre-casa') return 'Casa Tower';
  if (id === 'feira-central') return 'Central Fair';
  if (id === 'avenida-odds') return 'Odds Avenue';
  if (id === 'morro-neon') return 'Morro Neon';
  return districtName(id);
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
  const hop = firstHopExit(ctx, next.districtId);
  if (hop) {
    const hopPlace = districtName(hop.toDistrict);
    const hopShort = districtShortName(hop.toDistrict);
    const direct = hop.toDistrict === next.districtId;
    const who = npc?.name ?? place;
    return {
      text: direct
        ? `Go to ${place} — talk to ${who}`
        : `Exit → ${hopPlace}, then ${place}`,
      detail: next.title,
      // Name kept for walk e2e uniqueness; paint hides it when near EXIT neon.
      targetName: hopShort,
      targetX: hop.x,
      targetY: hop.y,
      districtId: ctx.districtId,
    };
  }
  if (ctx.unlocked(next.districtId)) {
    return {
      text: `Travel menu → ${place}`,
      detail: npc ? `Talk to ${npc.name} · ${next.title}` : next.title,
      districtId: next.districtId,
    };
  }
  return { text: `Unlock path to ${place}`, detail: 'Finish the current bet.' };
}

function npcObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const npc = beatNpc(ctx, next);
  if (npc) {
    const verb = npc.id === 'elevator' || npc.id === 'elevator-vip' ? 'Use' : 'Talk to';
    const place = districtName(ctx.districtId);
    return {
      text: `${verb} ${npc.name} (${place})`,
      detail: next.title,
      targetName: npc.name,
      targetX: npc.x,
      targetY: npc.y,
      districtId: ctx.districtId,
    };
  }
  // Same district, other Casa floor — point at the elevator, never "missing target".
  const floorHop = elevatorFloorObjective(ctx, next);
  if (floorHop) return floorHop;
  // Last resort: never surface a bug string to the player.
  return {
    text: `Find the next lead (${districtName(ctx.districtId)})`,
    detail: next.title,
    districtId: ctx.districtId,
  };
}

function beatNpcOnRoster(
  roster: readonly WorldNpc[],
  beatId: string,
): WorldNpc | undefined {
  return roster.find((n) => n.beatId === beatId || n.extraBeatIds?.includes(beatId));
}

function casaElevatorPad(
  ctx: ObjectiveCtx,
  roster: readonly WorldNpc[],
): WorldNpc | undefined {
  const elevId = ctx.vipFloor ? 'elevator-vip' : 'elevator';
  return ctx.npcs.find((n) => n.id === elevId) ?? roster.find((n) => n.id === elevId);
}

function needsCasaFloorHop(ctx: ObjectiveCtx, target: WorldNpc): boolean {
  const wantVip = (target.floor ?? 'foyer') === 'vip';
  return target.districtId === 'torre-casa' && Boolean(ctx.vipFloor) !== wantVip;
}

/** When Augusto (etc.) is upstairs/downstairs, route through the elevator pad. */
function elevatorFloorObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective | null {
  if (ctx.districtId !== 'torre-casa') return null;
  const roster = ctx.allNpcs ?? ctx.npcs;
  const target = beatNpcOnRoster(roster, next.id);
  if (!target || !needsCasaFloorHop(ctx, target)) return null;
  const elev = casaElevatorPad(ctx, roster);
  if (!elev) return null;
  const wantVip = (target.floor ?? 'foyer') === 'vip';
  return {
    text: wantVip
      ? `Ride elevator up — ${next.title}`
      : `Ride elevator down — then ${target.name}`,
    detail: next.title,
    // Must match WorldNpc.name so nearbyNpc / e2e uniqueness resolve.
    targetName: elev.name,
    targetX: elev.x,
    targetY: elev.y,
    districtId: ctx.districtId,
  };
}

function sideBeatReady(ctx: ObjectiveCtx, beat: StoryBeat): boolean {
  if (!beat.optional || beat.districtId !== ctx.districtId) return false;
  if (ctx.completed.includes(beat.id)) return false;
  if (beat.skipIfFlag && ctx.flags(beat.skipIfFlag)) return false;
  return beat.requiredFlags.every((f) => ctx.flags(f));
}

/** Optional side quests — dim dots only (never compete with the main marker). */
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
