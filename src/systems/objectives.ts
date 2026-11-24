import { DISTRICTS } from '../content/districts';
import type { StoryBeat } from '../core/types';
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
  const next = nextBeat(ctx);
  if (!next) {
    return { text: 'Story complete — grind side jobs or explore.' };
  }
  if (next.districtId !== ctx.districtId) {
    return travelObjective(ctx, next);
  }
  return npcObjective(ctx, next);
}

/** Public helper so NPCs can redirect the player to the live objective. */
export function nextBeat(ctx: ObjectiveCtx): StoryBeat | undefined {
  return ctx.beats.find(
    (b) => !ctx.completed.includes(b.id) && b.requiredFlags.every((f) => ctx.flags(f)),
  );
}

function districtName(id: string): string {
  return DISTRICTS.find((d) => d.id === id)?.name ?? id;
}

function beatNpc(ctx: ObjectiveCtx, beat: StoryBeat): WorldNpc | undefined {
  return ctx.npcs.find((n) => n.beatId === beat.id);
}

function travelExit(ctx: ObjectiveCtx, next: StoryBeat): DistrictExit | undefined {
  return ctx.exits.find(
    (e) =>
      e.districtId === ctx.districtId &&
      e.toDistrict === next.districtId &&
      ctx.unlocked(e.toDistrict),
  );
}

function travelObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const place = districtName(next.districtId);
  const npc = beatNpc(ctx, next);
  const who = npc ? ` — talk to ${npc.name}` : '';
  const exit = travelExit(ctx, next);
  if (exit) {
    return {
      text: `Go to ${place}${who} (${next.title})`,
      targetX: exit.x,
      targetY: exit.y,
      districtId: ctx.districtId,
    };
  }
  if (ctx.unlocked(next.districtId)) {
    return { text: `Travel menu → ${place}${who}`, districtId: next.districtId };
  }
  return { text: `Unlock path to ${place} — finish the current bet.` };
}

function npcObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const npc = ctx.npcs.find(
    (n) => n.beatId === next.id && n.districtId === ctx.districtId,
  );
  if (npc) {
    return {
      text: `Talk to ${npc.name}: ${next.title}`,
      targetX: npc.x,
      targetY: npc.y,
      districtId: ctx.districtId,
    };
  }
  // Beat is here but NPC tagged elsewhere — point at district spawn goal text.
  return {
    text: `${next.title} — look around ${districtName(next.districtId)}`,
    districtId: next.districtId,
  };
}
