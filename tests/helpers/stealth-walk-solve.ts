/** Walk-speed Neon Snap solvability simulator (test-only). */
import {
  anyDroneSpots,
  MIN_SAFE_WINDOW_MS,
  startStealth,
  tickStealth,
  WALK_TILE_MS,
  type StealthDef,
  type StealthProgress,
  type Vec2,
} from '../../src/systems/stealth';

export type WalkSolveResult = {
  ok: boolean;
  maxSafeDwellMs: number;
  steps: number;
  elapsedMs: number;
};

type WalkSim = {
  walkable: (x: number, y: number) => boolean;
  walkTileMs: number;
  stepSec: number;
  reactSec: number;
  maxWaitMs: number;
  progress: StealthProgress;
  x: number;
  y: number;
  elapsedMs: number;
  maxSafeDwellMs: number;
  steps: number;
};

function tileSafe(p: StealthProgress, x: number, y: number): boolean {
  return !anyDroneSpots(p, { x, y });
}

function measureDwell(sim: WalkSim): number {
  let dwell = 0;
  let probe = sim.progress;
  while (dwell < sim.maxWaitMs && tileSafe(probe, sim.x, sim.y)) {
    probe = tickStealth(probe, 0.05);
    dwell += 50;
  }
  return dwell;
}

function tryStep(sim: WalkSim): boolean {
  const candidates: Vec2[] = [
    { x: sim.x + 1, y: sim.y },
    { x: sim.x, y: sim.y - 1 },
    { x: sim.x, y: sim.y + 1 },
    { x: sim.x - 1, y: sim.y },
  ];
  for (const n of candidates) {
    if (!sim.walkable(n.x, n.y)) continue;
    const future = tickStealth(sim.progress, sim.stepSec + sim.reactSec);
    const mid = tickStealth(sim.progress, sim.stepSec);
    if (!tileSafe(future, n.x, n.y) || !tileSafe(mid, sim.x, sim.y)) continue;
    sim.progress = mid;
    sim.x = n.x;
    sim.y = n.y;
    sim.elapsedMs += sim.walkTileMs;
    sim.steps += 1;
    return true;
  }
  return false;
}

function waitForGap(sim: WalkSim): boolean {
  let waited = 0;
  let gap = false;
  while (waited < sim.maxWaitMs) {
    if (!tileSafe(sim.progress, sim.x, sim.y)) break;
    sim.progress = tickStealth(sim.progress, 0.05);
    waited += 50;
    sim.elapsedMs += 50;
    const peek = tickStealth(sim.progress, sim.stepSec + sim.reactSec);
    gap = sim.walkable(sim.x + 1, sim.y) && tileSafe(peek, sim.x + 1, sim.y);
    if (gap) break;
  }
  sim.maxSafeDwellMs = Math.max(sim.maxSafeDwellMs, waited);
  return gap;
}

/** Simulate a WALK-speed clear with reaction margin. */
export function simulateWalkClear(
  def: StealthDef,
  walkable: (x: number, y: number) => boolean,
  opts?: {
    walkTileMs?: number;
    reactionMs?: number;
    maxWaitMs?: number;
    timeLimitMs?: number;
  },
): WalkSolveResult {
  const walkTileMs = opts?.walkTileMs ?? WALK_TILE_MS;
  const reactionMs = opts?.reactionMs ?? 180;
  const maxWaitMs = opts?.maxWaitMs ?? 4000;
  const timeLimitMs = opts?.timeLimitMs ?? 120_000;
  const sim: WalkSim = {
    walkable,
    walkTileMs,
    stepSec: walkTileMs / 1000,
    reactSec: reactionMs / 1000,
    maxWaitMs,
    progress: startStealth(def),
    x: Math.round(def.start.x),
    y: Math.round(def.start.y),
    elapsedMs: 0,
    maxSafeDwellMs: 0,
    steps: 0,
  };
  while (sim.elapsedMs < timeLimitMs) {
    if (Math.hypot(sim.x - def.goal.x, sim.y - def.goal.y) <= def.goalRadius) {
      return {
        ok: sim.maxSafeDwellMs >= MIN_SAFE_WINDOW_MS,
        maxSafeDwellMs: sim.maxSafeDwellMs,
        steps: sim.steps,
        elapsedMs: sim.elapsedMs,
      };
    }
    sim.maxSafeDwellMs = Math.max(sim.maxSafeDwellMs, measureDwell(sim));
    if (tryStep(sim)) continue;
    if (!waitForGap(sim)) {
      return {
        ok: false,
        maxSafeDwellMs: sim.maxSafeDwellMs,
        steps: sim.steps,
        elapsedMs: sim.elapsedMs,
      };
    }
  }
  return {
    ok: false,
    maxSafeDwellMs: sim.maxSafeDwellMs,
    steps: sim.steps,
    elapsedMs: sim.elapsedMs,
  };
}
