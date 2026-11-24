import type { DistrictId } from '../core/types';

/** Tile kinds — LD-1 paths/edges, LD-3 pathway flooring. */
export type TileKind =
  'asphalt' | 'sidewalk' | 'alley' | 'plaza' | 'grass' | 'blocked' | 'exit';

export type MapDef = {
  districtId: DistrictId;
  width: number;
  height: number;
  tiles: TileKind[];
  buildings: { x: number; y: number; w: number; h: number; style: number }[];
  signs: { x: number; y: number; label: string; color: string }[];
  landmark: { x: number; y: number; kind: string };
};

export function tileAt(map: MapDef, x: number, y: number): TileKind {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'blocked';
  return map.tiles[y * map.width + x] ?? 'blocked';
}

export function isWalkable(map: MapDef, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  return t !== 'blocked';
}

export function buildDistrictMap(id: DistrictId): MapDef {
  const size = sizes[id];
  const tiles = carveCity(size.w, size.h, id);
  return {
    districtId: id,
    width: size.w,
    height: size.h,
    tiles,
    buildings: placeBuildings(size.w, size.h, tiles),
    signs: placeSigns(id),
    landmark: landmarks[id],
  };
}

const sizes: Record<DistrictId, { w: number; h: number }> = {
  'morro-neon': { w: 42, h: 30 },
  'feira-central': { w: 44, h: 32 },
  'avenida-odds': { w: 46, h: 30 },
  'torre-casa': { w: 36, h: 28 },
};

const landmarks: Record<DistrictId, { x: number; y: number; kind: string }> = {
  'morro-neon': { x: 20, y: 6, kind: 'led-tower' },
  'feira-central': { x: 22, y: 14, kind: 'calcadao' },
  'avenida-odds': { x: 24, y: 8, kind: 'glass-corp' },
  'torre-casa': { x: 18, y: 6, kind: 'casa-tower' },
};

function carveCity(w: number, h: number, id: DistrictId): TileKind[] {
  const tiles: TileKind[] = Array.from({ length: w * h }, () => 'blocked');
  paintBorderGrass(tiles, w, h);
  paintRoads(tiles, w, h);
  paintPlaza(tiles, w, h, id);
  return tiles;
}

function paintBorderGrass(tiles: TileKind[], w: number, h: number): void {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tiles[y * w + x] = 'grass';
      }
    }
  }
}

function paintRoads(tiles: TileKind[], w: number, h: number): void {
  const midY = Math.floor(h / 2);
  const midX = Math.floor(w / 2);
  paintHRoad(tiles, w, midY);
  paintVRoad(tiles, w, h, midX);
  paintAlleys(tiles, w, h);
}

function paintHRoad(tiles: TileKind[], w: number, midY: number): void {
  for (let x = 1; x < w - 1; x += 1) {
    setRoad(tiles, w, x, midY);
    setRoad(tiles, w, x, midY - 1);
    setSide(tiles, w, x, midY - 2);
    setSide(tiles, w, x, midY + 1);
  }
}

function paintVRoad(tiles: TileKind[], w: number, h: number, midX: number): void {
  for (let y = 1; y < h - 1; y += 1) {
    setRoad(tiles, w, midX, y);
    setRoad(tiles, w, midX - 1, y);
    setSide(tiles, w, midX - 2, y);
    setSide(tiles, w, midX + 1, y);
  }
}

function paintAlleys(tiles: TileKind[], w: number, h: number): void {
  for (let y = 2; y < h - 2; y += 3) {
    for (let x = 2; x < w - 2; x += 1) {
      if (tiles[y * w + x] === 'blocked') tiles[y * w + x] = 'alley';
    }
  }
}

function paintPlaza(tiles: TileKind[], w: number, h: number, id: DistrictId): void {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let y = cy - 2; y <= cy + 2; y += 1) {
    for (let x = cx - 3; x <= cx + 3; x += 1) {
      tiles[y * w + x] = id === 'feira-central' ? 'plaza' : 'asphalt';
    }
  }
  // Exit approach tiles stay asphalt/sidewalk (walkable).
  tiles[cy * w + (w - 2)] = 'exit';
  tiles[cy * w + 1] = 'exit';
}

function setRoad(tiles: TileKind[], w: number, x: number, y: number): void {
  if (y < 0 || x < 0) return;
  tiles[y * w + x] = 'asphalt';
}

function setSide(tiles: TileKind[], w: number, x: number, y: number): void {
  if (y < 0 || x < 0) return;
  const i = y * w + x;
  if (tiles[i] === 'blocked' || tiles[i] === 'grass') tiles[i] = 'sidewalk';
}

function placeBuildings(
  w: number,
  h: number,
  tiles: TileKind[],
): { x: number; y: number; w: number; h: number; style: number }[] {
  const out: { x: number; y: number; w: number; h: number; style: number }[] = [];
  let style = 0;
  for (let y = 3; y < h - 4; y += 5) {
    for (let x = 3; x < w - 5; x += 6) {
      if (tiles[y * w + x] !== 'blocked') continue;
      out.push({ x, y: y - 1, w: 3, h: 3, style: style % 4 });
      style += 1;
      blockFootprint(tiles, w, { x, y: y - 1, bw: 3, bh: 2 });
    }
  }
  return out;
}

function blockFootprint(
  tiles: TileKind[],
  stride: number,
  box: { x: number; y: number; bw: number; bh: number },
): void {
  for (let yy = box.y; yy < box.y + box.bh; yy += 1) {
    for (let xx = box.x; xx < box.x + box.bw; xx += 1) {
      tiles[yy * stride + xx] = 'blocked';
    }
  }
}

type Sign = { x: number; y: number; label: string; color: string };

const SIGNS: Record<DistrictId, Sign[]> = {
  'morro-neon': [
    { x: 12, y: 13, label: 'BOTECO NAIR', color: '#b8ff2b' },
    { x: 28, y: 14, label: 'ODDS 24h', color: '#ff2bd6' },
  ],
  'feira-central': [
    { x: 14, y: 15, label: 'PASTEL & ODD', color: '#ffdf00' },
    { x: 30, y: 12, label: 'FORRÓ FM', color: '#ff6eb4' },
  ],
  'avenida-odds': [
    { x: 10, y: 14, label: 'ODDSCORP', color: '#2bfff2' },
    { x: 32, y: 14, label: 'CASA ATM', color: '#ff3b5c' },
  ],
  'torre-casa': [{ x: 16, y: 18, label: 'CASA SUPREMA', color: '#ff2bd6' }],
};

function placeSigns(id: DistrictId): Sign[] {
  return SIGNS[id];
}
