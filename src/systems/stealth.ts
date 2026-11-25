/** In-world drone stealth for Odds Avenue (avenida-drone). */

export type Vec2 = { x: number; y: number };

export type DroneDef = {
  id: string;
  /** Patrol waypoints in tile space. */
  path: Vec2[];
  /** Tiles per second along the path. */
  speed: number;
  /** Sight cone half-angle in radians. */
  halfAngle: number;
  /** Cone length in tiles. */
  range: number;
};

export type StealthDef = {
  id: string;
  districtId: string;
  start: Vec2;
  checkpoint: Vec2;
  goal: Vec2;
  /** Goal reach radius in tiles. */
  goalRadius: number;
  drones: DroneDef[];
  /** Soft time budget (ms) for HUD; does not auto-fail. */
  targetMs: number;
};

export type StealthDroneState = {
  id: string;
  x: number;
  y: number;
  /** Facing radians (0 = east, π/2 = south). */
  facing: number;
  pathIndex: number;
  halfAngle: number;
  range: number;
  path: Vec2[];
  speed: number;
};

export type StealthProgress = {
  def: StealthDef;
  drones: StealthDroneState[];
  checkpoint: Vec2;
  spotted: number;
  startedAt: number;
  done: boolean;
  won: boolean;
};

/** Odds Avenue drone evade corridor (glass-shadow lane). */
export const AVENIDA_DRONE_STEALTH: StealthDef = {
  id: 'avenida-drone',
  districtId: 'avenida-odds',
  start: { x: 12, y: 12 },
  checkpoint: { x: 14, y: 12 },
  goal: { x: 34, y: 12 },
  goalRadius: 1.2,
  targetMs: 75_000,
  drones: [
    {
      id: 'drone-a',
      path: [
        { x: 18, y: 8 },
        { x: 18, y: 16 },
        { x: 18, y: 8 },
      ],
      speed: 2.2,
      halfAngle: Math.PI / 5,
      range: 4.2,
    },
    {
      id: 'drone-b',
      path: [
        { x: 24, y: 15 },
        { x: 24, y: 9 },
        { x: 28, y: 9 },
        { x: 28, y: 15 },
        { x: 24, y: 15 },
      ],
      speed: 2.0,
      halfAngle: Math.PI / 5.5,
      range: 4.0,
    },
    {
      id: 'drone-c',
      path: [
        { x: 31, y: 10 },
        { x: 31, y: 14 },
        { x: 31, y: 10 },
      ],
      speed: 1.8,
      halfAngle: Math.PI / 6,
      range: 3.6,
    },
  ],
};

function droneStateFromDef(d: DroneDef): StealthDroneState {
  const p0 = d.path[0]!;
  const p1 = d.path[1] ?? p0;
  return {
    id: d.id,
    x: p0.x,
    y: p0.y,
    facing: Math.atan2(p1.y - p0.y, p1.x - p0.x),
    pathIndex: 0,
    halfAngle: d.halfAngle,
    range: d.range,
    path: d.path,
    speed: d.speed,
  };
}

export function startStealth(def: StealthDef, now = Date.now()): StealthProgress {
  return {
    def,
    drones: def.drones.map(droneStateFromDef),
    checkpoint: { ...def.checkpoint },
    spotted: 0,
    startedAt: now,
    done: false,
    won: false,
  };
}

export type ConeQuery = {
  origin: Vec2;
  facing: number;
  halfAngle: number;
  range: number;
  point: Vec2;
};

/** Point-in-cone: player is spotted when inside a drone's forward sight wedge. */
export function pointInCone(q: ConeQuery): boolean {
  const dx = q.point.x - q.origin.x;
  const dy = q.point.y - q.origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > q.range || dist < 1e-6) return false;
  let ang = Math.atan2(dy, dx) - q.facing;
  while (ang > Math.PI) ang -= Math.PI * 2;
  while (ang < -Math.PI) ang += Math.PI * 2;
  return Math.abs(ang) <= q.halfAngle;
}

export function anyDroneSpots(progress: StealthProgress, player: Vec2): boolean {
  return progress.drones.some((d) =>
    pointInCone({
      origin: { x: d.x, y: d.y },
      facing: d.facing,
      halfAngle: d.halfAngle,
      range: d.range,
      point: player,
    }),
  );
}

export function reachedGoal(progress: StealthProgress, player: Vec2): boolean {
  return (
    Math.hypot(player.x - progress.def.goal.x, player.y - progress.def.goal.y) <=
    progress.def.goalRadius
  );
}

/** Advance drones along their paths by `dt` seconds. */
export function tickStealth(progress: StealthProgress, dt: number): StealthProgress {
  if (progress.done) return progress;
  const drones = progress.drones.map((d) => stepDrone(d, dt));
  return { ...progress, drones };
}

type Step = { x: number; y: number; idx: number; facing: number; remain: number };

function snapOrSlide(s: Step, target: Vec2, dist: number, pathLen: number): Step {
  const dx = target.x - s.x;
  const dy = target.y - s.y;
  const facing = Math.atan2(dy, dx);
  const t = Math.min(1, s.remain / dist);
  const reached = t >= 1;
  return {
    x: s.x + dx * t,
    y: s.y + dy * t,
    idx: reached ? (s.idx + 1) % pathLen : s.idx,
    facing,
    remain: reached ? s.remain - dist : 0,
  };
}

function stepDrone(d: StealthDroneState, dt: number): StealthDroneState {
  if (d.path.length < 2) return d;
  let s: Step = {
    x: d.x,
    y: d.y,
    idx: d.pathIndex,
    facing: d.facing,
    remain: d.speed * dt,
  };
  while (s.remain > 0) {
    const target = d.path[(s.idx + 1) % d.path.length]!;
    const dist = Math.hypot(target.x - s.x, target.y - s.y);
    s =
      dist < 1e-4
        ? { ...s, idx: (s.idx + 1) % d.path.length }
        : snapOrSlide(s, target, dist, d.path.length);
  }
  return { ...d, x: s.x, y: s.y, facing: s.facing, pathIndex: s.idx };
}

export function spotReset(progress: StealthProgress): StealthProgress {
  return {
    ...progress,
    spotted: progress.spotted + 1,
    checkpoint: { ...progress.def.checkpoint },
  };
}

export function winStealth(progress: StealthProgress): StealthProgress {
  return { ...progress, done: true, won: true };
}

export function stealthForBet(betId: string): StealthDef | null {
  if (betId === 'avenida-drone') return AVENIDA_DRONE_STEALTH;
  return null;
}
