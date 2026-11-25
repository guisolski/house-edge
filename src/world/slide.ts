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

function slideAround(
  map: MapDef,
  x: number,
  y: number,
  sx: number,
  sy: number,
  nx: number,
  ny: number,
): { x: number; y: number } | null {
  if (sx !== 0 && sy !== 0) {
    if (nx !== x && isWalkable(map, nx, y)) return { x: nx, y };
    if (ny !== y && isWalkable(map, x, ny)) return { x, y: ny };
    return null;
  }
  const slips: [number, number][] =
    sx !== 0
      ? [
          [nx, y - 1],
          [nx, y + 1],
        ]
      : [
          [x - 1, ny],
          [x + 1, ny],
        ];
  return firstOpen(map, x, y, slips);
}

function firstOpen(
  map: MapDef,
  x: number,
  y: number,
  cells: [number, number][],
): { x: number; y: number } | null {
  for (const [tx, ty] of cells) {
    if (tx === x && ty === y) continue;
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
    if (isWalkable(map, tx, ty)) return { x: tx, y: ty };
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
