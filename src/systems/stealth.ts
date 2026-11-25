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
  /** Cover props — stand within coverRadius to hide from cones. */
  cover?: Vec2[];
  coverRadius?: number;
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

/**
 * Odds Avenue Neon Snap — alternating vertical patrols (no lane-wide sweepers).
 * Barriers already seal north/south bypass; cones stay readable with steady fill.
 * Cover crates + slower patrols → ≥1.4s safe dwell (first-timer ~3–6 attempts).
 */
export const AVENIDA_DRONE_STEALTH: StealthDef = {
  id: 'avenida-drone',
  districtId: 'avenida-odds',
  start: { x: 12, y: 12 },
  checkpoint: { x: 12, y: 11 },
  goal: { x: 34, y: 12 },
  goalRadius: 1.1,
  targetMs: 90_000,
  coverRadius: 0.48,
  cover: [
    { x: 15, y: 12 },
    { x: 20, y: 11 },
    { x: 26, y: 12 },
    { x: 31, y: 11 },
  ],
  drones: [
    {
      // West gate — modestly harder than v1.21 (playtest #26: ~15s first clear).
      id: 'drone-a',
      path: [
        { x: 17, y: 8 },
        { x: 17, y: 16 },
        { x: 17, y: 8 },
      ],
      speed: 0.98,
      halfAngle: Math.PI / 6.2,
      range: 3.1,
    },
    {
      // Mid — opposite phase; slightly faster so gaps stay tight.
      id: 'drone-b',
      path: [
        { x: 23, y: 16 },
        { x: 23, y: 8 },
        { x: 23, y: 16 },
      ],
      speed: 1.0,
      halfAngle: Math.PI / 6.2,
      range: 3.1,
    },
    {
      // East gate — no free sprint at the finish.
      id: 'drone-c',
      path: [
        { x: 29, y: 8 },
        { x: 29, y: 16 },
        { x: 29, y: 8 },
      ],
      speed: 0.94,
      halfAngle: Math.PI / 6.8,
      range: 2.95,
    },
  ],
};

/** Matches game walk cadence (src/game/app.ts WALK_MS). */
export const WALK_TILE_MS = 52;
/** Minimum guaranteed safe dwell a human can use between dashes. */
export const MIN_SAFE_WINDOW_MS = 1200;

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

export function inCover(def: StealthDef, player: Vec2): boolean {
  const r = def.coverRadius ?? 0.65;
  return (def.cover ?? []).some((c) => Math.hypot(c.x - player.x, c.y - player.y) <= r);
}

export function anyDroneSpots(progress: StealthProgress, player: Vec2): boolean {
  if (inCover(progress.def, player)) return false;
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

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Mark every tile a drone cone covers in its current pose. */
function markConeCoverage(covered: Set<string>, d: StealthDroneState): void {
  const r = Math.ceil(d.range);
  const y0 = Math.floor(d.y) - r;
  const y1 = Math.ceil(d.y) + r;
  const x0 = Math.floor(d.x) - r;
  const x1 = Math.ceil(d.x) + r;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const hit = pointInCone({
        origin: { x: d.x, y: d.y },
        facing: d.facing,
        halfAngle: d.halfAngle,
        range: d.range,
        point: { x: x + 0.5, y: y + 0.5 },
      });
      if (hit) covered.add(tileKey(x, y));
    }
  }
}

function clearCoverTiles(def: StealthDef, covered: Set<string>): void {
  for (const c of def.cover ?? []) {
    covered.delete(tileKey(Math.round(c.x), Math.round(c.y)));
  }
}

/** Union of cone tiles across a sampled patrol cycle. */
export function coneCoverageOverCycle(
  def: StealthDef,
  opts?: { sampleDt?: number; cycleSec?: number },
): Set<string> {
  const sampleDt = opts?.sampleDt ?? 0.25;
  const cycleSec = opts?.cycleSec ?? 12;
  const covered = new Set<string>();
  let p = startStealth(def);
  const samples = Math.ceil(cycleSec / sampleDt);
  for (let i = 0; i < samples; i += 1) {
    for (const d of p.drones) markConeCoverage(covered, d);
    p = tickStealth(p, sampleDt);
  }
  clearCoverTiles(def, covered);
  return covered;
}

/**
 * True if a grid path from start→goal exists on tiles that are NEVER covered
 * by any drone cone across a sampled patrol cycle (a drone-free bypass).
 */
export function droneFreePathExists(
  def: StealthDef,
  walkable: (x: number, y: number) => boolean,
  opts?: { sampleDt?: number; cycleSec?: number },
): boolean {
  const covered = coneCoverageOverCycle(def, opts);
  const start = { x: Math.round(def.start.x), y: Math.round(def.start.y) };
  const goal = { x: Math.round(def.goal.x), y: Math.round(def.goal.y) };
  covered.delete(tileKey(start.x, start.y));
  covered.delete(tileKey(goal.x, goal.y));
  return bfsUncovered(start, goal, walkable, covered);
}

const BFS_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function bfsUncovered(
  start: Vec2,
  goal: Vec2,
  walkable: (x: number, y: number) => boolean,
  covered: Set<string>,
): boolean {
  const q: Vec2[] = [start];
  const seen = new Set<string>([tileKey(start.x, start.y)]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) return true;
    pushUncoveredNeighbors(cur, { walkable, covered, seen, q });
  }
  return false;
}

function pushUncoveredNeighbors(
  cur: Vec2,
  ctx: {
    walkable: (x: number, y: number) => boolean;
    covered: Set<string>;
    seen: Set<string>;
    q: Vec2[];
  },
): void {
  for (const d of BFS_DIRS) {
    const nx = cur.x + d[0];
    const ny = cur.y + d[1];
    const k = tileKey(nx, ny);
    if (ctx.seen.has(k) || !ctx.walkable(nx, ny) || ctx.covered.has(k)) continue;
    ctx.seen.add(k);
    ctx.q.push({ x: nx, y: ny });
  }
}
