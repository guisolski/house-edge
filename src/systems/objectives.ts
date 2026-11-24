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

function nextBeat(ctx: ObjectiveCtx): StoryBeat | undefined {
  return ctx.beats.find(
    (b) => !ctx.completed.includes(b.id) && b.requiredFlags.every((f) => ctx.flags(f)),
  );
}

function travelObjective(ctx: ObjectiveCtx, next: StoryBeat): Objective {
  const exit = ctx.exits.find(
    (e) =>
      e.districtId === ctx.districtId &&
      e.toDistrict === next.districtId &&
      ctx.unlocked(e.toDistrict),
  );
  if (exit) {
    return {
      text: `Travel to ${next.districtId} via exit (${exit.label})`,
      targetX: exit.x,
      targetY: exit.y,
      districtId: ctx.districtId,
    };
  }
  return { text: `Unlock path to ${next.districtId} — check Travel.` };
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
  return { text: next.title, districtId: next.districtId };
}
