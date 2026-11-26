import type { DistrictId, StoryBeat } from '../core/types';
import { t, tf } from '../i18n';
import { localizeDistrictName, localizeDistrictShort } from '../i18n/localize-district';
import { localizedNpcName } from '../i18n/localize-npc';
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
  if (!next) return { text: t('ui.obj.complete') };
  if (next.districtId !== ctx.districtId) return travelObjective(ctx, next);
  return npcObjective(ctx, next);
}

function epilogueNpc(ctx: ObjectiveCtx): WorldNpc | undefined {
  return (
    ctx.npcs.find((n) => n.extraBeatIds?.includes('epilogue-laje')) ??
    ctx.allNpcs?.find((n) => n.extraBeatIds?.includes('epilogue-laje'))
  );
}

function freeRoamTowardNair(ctx: ObjectiveCtx, epi: WorldNpc): Objective {
  const who = localizedNpcName(epi);
  if (epi.districtId === ctx.districtId) {
    return {
      text: tf('ui.obj.talkTo', { name: who, place: districtName(ctx.districtId) }),
      detail: t('ui.obj.epilogueDetail'),
      targetName: epi.name,
      targetX: epi.x,
      targetY: epi.y,
      districtId: ctx.districtId,
    };
  }
  const hop = firstHopExit(ctx, epi.districtId);
  if (!hop) {
    return {
      text: tf('ui.obj.travelTo', {
        place: districtName(epi.districtId),
        name: who,
      }),
      detail: t('ui.obj.epilogueHill'),
      districtId: epi.districtId,
    };
  }
  return {
    text: tf('ui.obj.exitTo', { place: districtName(hop.toDistrict), name: who }),
    detail: t('ui.obj.epilogueHill'),
    targetName: districtShortName(hop.toDistrict),
    targetX: hop.x,
    targetY: hop.y,
    districtId: ctx.districtId,
  };
}

function freeRoamObjective(ctx: ObjectiveCtx): Objective {
  if (ctx.flags('epilogue_done')) {
    return { text: t('ui.obj.complete') };
  }
  const epi = epilogueNpc(ctx);
  if (epi) return freeRoamTowardNair(ctx, epi);
  return {
    text: t('ui.obj.freeRoam'),
    detail: t('ui.obj.epilogueHill'),
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
  return localizeDistrictName(id);
}

/** Short marker labels so edge pointers stay readable (arrow-only when near EXIT signs). */
function districtShortName(id: string): string {
  return localizeDistrictShort(id);
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

function hopTravelObjective(
  ctx: ObjectiveCtx,
  next: StoryBeat,
  hop: NonNullable<ReturnType<typeof firstHopExit>>,
  npc: WorldNpc | undefined,
): Objective {
  const place = districtName(next.districtId);
  const hopPlace = districtName(hop.toDistrict);
  const direct = hop.toDistrict === next.districtId;
  const who = npc ? localizedNpcName(npc) : place;
  return {
    text: direct
      ? tf('ui.obj.talkTo', { name: who, place })
      : tf('ui.obj.exitTo', { place: hopPlace, name: place }),
    detail: t(`story.${next.id}.title`),
    targetName: districtShortName(hop.toDistrict),
    targetX: hop.x,
    targetY: hop.y,
    districtId: ctx.districtId,
  };
}

function travelObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const place = districtName(next.districtId);
  const npc = beatNpc(ctx, next);
  const hop = firstHopExit(ctx, next.districtId);
  if (hop) return hopTravelObjective(ctx, next, hop, npc);
  if (ctx.unlocked(next.districtId)) {
    return {
      text: tf('ui.obj.travelMenu', { place }),
      detail: npc
        ? tf('ui.obj.talkTo', { name: localizedNpcName(npc), place })
        : t(`story.${next.id}.title`),
      districtId: next.districtId,
    };
  }
  // Playtest #39: Torre unlocks after Margin's hearing — not Contato/Hacker.
  const detail =
    next.districtId === 'torre-casa'
      ? t('ui.obj.unlockTorreDetail')
      : t('ui.obj.unlockDetail');
  return {
    text: tf('ui.obj.unlockPath', { place }),
    detail,
  };
}

function npcObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const title = t(`story.${next.id}.title`);
  // Playtest #30: floor-hop first — never pin the VIP target while still in foyer.
  const floorHop = elevatorFloorObjective(ctx, next);
  if (floorHop) return floorHop;
  const npc = beatNpc(ctx, next);
  if (npc) {
    const verb =
      npc.id === 'elevator' || npc.id === 'elevator-vip'
        ? t('ui.verb.use')
        : t('ui.verb.talk');
    const place = districtName(ctx.districtId);
    return {
      text: tf('ui.obj.actOn', { verb, name: localizedNpcName(npc), place }),
      detail: title,
      targetName: npc.name,
      targetX: npc.x,
      targetY: npc.y,
      districtId: ctx.districtId,
    };
  }
  // Last resort: never surface a bug string to the player.
  return {
    text: tf('ui.obj.findLead', { place: districtName(ctx.districtId) }),
    detail: title,
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
  const title = t(`story.${next.id}.title`);
  return {
    text: wantVip
      ? t('ui.obj.elevatorVip')
      : tf('ui.obj.actOn', {
          verb: t('ui.verb.use'),
          name: target.name,
          place: t('ui.obj.elevatorFoyer'),
        }),
    detail: title,
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
