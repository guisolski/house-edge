import { isWalkable, type MapDef, type TileKind } from './maps';
import { minPlayerTileY } from './camera';

/** One tile step with wall-slide / corner-slip. */
export function slideStep(
  map: MapDef,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number } | null {
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  if (!sx && !sy) return null;
  const minY = minPlayerTileY(48);
  const nx = clamp(x + sx, 0, map.width - 1);
  const ny = clamp(y + sy, minY, map.height - 1);
  if (nx === x && ny === y) return null;
  if (isWalkable(map, nx, ny)) return { x: nx, y: ny };
  return slideAround(map, x, y, sx, sy, nx, ny);
}

/**
 * Playtest #37: if the avatar sits inside a blocked tile, push to the nearest
 * walkable cell (BFS ring). Returns null when already free.
 */
export function nearestWalkable(
  map: MapDef,
  x: number,
  y: number,
): { x: number; y: number } | null {
  const minY = minPlayerTileY(48);
  const sx = clamp(Math.floor(x), 0, map.width - 1);
  const sy = clamp(Math.floor(y), minY, map.height - 1);
  if (isWalkable(map, sx, sy)) return null;
  for (let r = 1; r <= 12; r += 1) {
    const hit = walkableOnRing(map, sx, sy, r, minY);
    if (hit) return hit;
  }
  return null;
}

/**
 * Playtest #38: after holding into a wall, nudge into an open neighbor
 * (prefer sideways into the corridor, then forward-diagonal).
 */
export function unstuckAlongPush(
  map: MapDef,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number } | null {
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  // Prefer forward-diagonal into the open corridor before sideways retreat.
  const candidates: [number, number][] = [];
  if (sx !== 0) {
    candidates.push(
      [x + sx, y - 1],
      [x + sx, y + 1],
      [x, y - 1],
      [x, y + 1],
      [x + sx, y],
    );
  } else if (sy !== 0) {
    candidates.push(
      [x - 1, y + sy],
      [x + 1, y + sy],
      [x - 1, y],
      [x + 1, y],
      [x, y + sy],
    );
  }
  for (const [tx, ty] of candidates) {
    if (tx === x && ty === y) continue;
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
    if (isWalkable(map, tx, ty)) return { x: tx, y: ty };
  }
  return nearestWalkable(map, x + sx, y + sy);
}

function walkableOnRing(
  map: MapDef,
  sx: number,
  sy: number,
  r: number,
  minY: number,
): { x: number; y: number } | null {
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = sx + dx;
      const ty = sy + dy;
      if (tx < 0 || ty < minY || tx >= map.width || ty >= map.height) continue;
      if (isWalkable(map, tx, ty)) return { x: tx, y: ty };
    }
  }
  return null;
}

function slideAround(
  map: MapDef,
  x: number,
  y: number,
  sx: number,
  sy: number,
  nx: number,
  ny: number,
): { x: number; y: number } | null {
  // Diagonal: slide on one axis.
  if (sx !== 0 && sy !== 0) {
    if (nx !== x && isWalkable(map, nx, y)) return { x: nx, y };
    if (ny !== y && isWalkable(map, x, ny)) return { x, y: ny };
    return null;
  }
  return cornerSlip(map, x, y, sx, sy, nx, ny);
}

/** Playtest #39: forward-diagonal only (no wall-face Y-drift). */
function cornerSlip(
  map: MapDef,
  x: number,
  y: number,
  sx: number,
  sy: number,
  nx: number,
  ny: number,
): { x: number; y: number } | null {
  if (sx !== 0) {
    if (isWalkable(map, nx, y - 1)) return { x: nx, y: y - 1 };
    if (isWalkable(map, nx, y + 1)) return { x: nx, y: y + 1 };
    return null;
  }
  if (sy !== 0) {
    if (isWalkable(map, x - 1, ny)) return { x: x - 1, y: ny };
    if (isWalkable(map, x + 1, ny)) return { x: x + 1, y: ny };
  }
  return null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Tiny map for unit tests of corner slips (rows ≥ HUD minY). */
export function toySlideMap(): MapDef {
  const w = 5;
  const h = 8;
  const tiles = Array.from({ length: w * h }, () => 'asphalt' as TileKind);
  // Seal edges.
  for (let x = 0; x < w; x += 1) {
    tiles[x] = 'blocked';
    tiles[(h - 1) * w + x] = 'blocked';
  }
  for (let y = 0; y < h; y += 1) {
    tiles[y * w] = 'blocked';
    tiles[y * w + (w - 1)] = 'blocked';
  }
  // Block (3,5) so east from (2,5) needs a corner slip to (3,4) or (3,6).
  tiles[5 * w + 3] = 'blocked';
  return {
    districtId: 'morro-neon',
    width: w,
    height: h,
    tiles,
    buildings: [],
    signs: [],
    props: [],
    landmark: { x: 2, y: 4, kind: 'led-tower' },
  };
}
