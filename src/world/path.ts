import { isWalkable, type MapDef } from './maps';

export type PathPoint = { x: number; y: number };

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function key(x: number, y: number): string {
  return `${x},${y}`;
}

type BfsState = {
  seen: Set<string>;
  came: Map<string, string>;
  q: PathPoint[];
};

function enqueueNeighbors(cur: PathPoint, map: MapDef, state: BfsState): void {
  for (const [dx, dy] of DIRS) {
    const nx = cur.x + dx;
    const ny = cur.y + dy;
    const k = key(nx, ny);
    if (state.seen.has(k) || !isWalkable(map, nx, ny)) continue;
    state.seen.add(k);
    state.came.set(k, key(cur.x, cur.y));
    state.q.push({ x: nx, y: ny });
  }
}

function rebuild(
  came: Map<string, string>,
  start: PathPoint,
  goal: PathPoint,
): PathPoint[] {
  const out: PathPoint[] = [goal];
  let cur = key(goal.x, goal.y);
  const startK = key(start.x, start.y);
  while (cur !== startK) {
    const prev = came.get(cur);
    if (!prev) break;
    const [x, y] = prev.split(',').map(Number) as [number, number];
    out.push({ x, y });
    cur = prev;
  }
  out.push(start);
  out.reverse();
  return out;
}

function bfsToGoal(map: MapDef, start: PathPoint, goal: PathPoint): PathPoint[] {
  const state: BfsState = {
    q: [start],
    came: new Map(),
    seen: new Set([key(start.x, start.y)]),
  };
  while (state.q.length) {
    const cur = state.q.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) return rebuild(state.came, start, goal);
    enqueueNeighbors(cur, map, state);
  }
  return [];
}

/** BFS shortest walkable path (4-connected). Empty if unreachable. */
export function findWalkablePath(
  map: MapDef,
  from: PathPoint,
  to: PathPoint,
): PathPoint[] {
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  const goal = { x: Math.round(to.x), y: Math.round(to.y) };
  if (!isWalkable(map, start.x, start.y) || !isWalkable(map, goal.x, goal.y)) {
    return [];
  }
  if (start.x === goal.x && start.y === goal.y) return [start];
  return bfsToGoal(map, start, goal);
}

/**
 * Next on-path waypoint for objective arrows — looks ahead so the marker
 * follows corridors instead of pointing through walls.
 */
export function nextPathWaypoint(
  map: MapDef,
  from: PathPoint,
  to: PathPoint,
  lookAhead = 4,
): PathPoint {
  const path = findWalkablePath(map, from, to);
  if (path.length < 2) return { x: Math.round(to.x), y: Math.round(to.y) };
  const idx = Math.min(lookAhead, path.length - 1);
  return path[idx]!;
}
