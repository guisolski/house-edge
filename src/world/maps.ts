import type { DistrictId } from '../core/types';

/** Tile kinds — night city. */
export type TileKind =
  | 'asphalt'
  | 'sidewalk'
  | 'alley'
  | 'plaza'
  | 'grass'
  | 'stairs'
  | 'interior'
  | 'blocked'
  | 'exit';

export type BuildingStyle = 'morro' | 'feira' | 'avenida' | 'torre';

export type MapDef = {
  districtId: DistrictId;
  width: number;
  height: number;
  tiles: TileKind[];
  buildings: {
    x: number;
    y: number;
    w: number;
    h: number;
    style: number;
    kind: BuildingStyle;
  }[];
  signs: { x: number; y: number; label: string; color: string }[];
  props: { x: number; y: number; kind: 'moto' | 'kiosk' | 'wire' }[];
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
  if (id === 'morro-neon') return buildMorro();
  if (id === 'feira-central') return buildFeira();
  if (id === 'avenida-odds') return buildAvenida();
  return buildTorre();
}

function fill(w: number, h: number, kind: TileKind): TileKind[] {
  return Array.from({ length: w * h }, () => kind);
}

function set(tiles: TileKind[], w: number, x: number, y: number, kind: TileKind): void {
  if (x < 0 || y < 0) return;
  tiles[y * w + x] = kind;
}

function hStrip(
  tiles: TileKind[],
  w: number,
  y: number,
  x0: number,
  x1: number,
  kind: TileKind,
): void {
  for (let x = x0; x <= x1; x += 1) set(tiles, w, x, y, kind);
}

function vStrip(
  tiles: TileKind[],
  w: number,
  x: number,
  y0: number,
  y1: number,
  kind: TileKind,
): void {
  for (let y = y0; y <= y1; y += 1) set(tiles, w, x, y, kind);
}

/** Outer ring is blocked so players cannot walk off the map. */
function sealEdges(tiles: TileKind[], w: number, h: number): void {
  for (let x = 0; x < w; x += 1) {
    set(tiles, w, x, 0, 'blocked');
    set(tiles, w, x, h - 1, 'blocked');
  }
  for (let y = 0; y < h; y += 1) {
    set(tiles, w, 0, y, 'blocked');
    set(tiles, w, w - 1, y, 'blocked');
  }
}

/** Favela hillside: stairs, stacked houses, winding alleys. */
function buildMorro(): MapDef {
  const w = 40;
  const h = 28;
  const tiles = fill(w, h, 'grass');
  // main laje road
  for (let y = 13; y <= 16; y += 1) hStrip(tiles, w, y, 1, w - 2, 'asphalt');
  hStrip(tiles, w, 12, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 17, 1, w - 2, 'sidewalk');
  // vertical alley spine
  for (let x = 18; x <= 20; x += 1) vStrip(tiles, w, x, 2, h - 3, 'alley');
  // hillside stairs climbing north
  for (let y = 2; y <= 11; y += 1) {
    hStrip(
      tiles,
      w,
      y,
      8 + Math.floor((11 - y) / 2),
      12 + Math.floor((11 - y) / 2),
      'stairs',
    );
  }
  // boteco plaza pocket
  for (let y = 13; y <= 16; y += 1) hStrip(tiles, w, y, 10, 16, 'plaza');
  sealEdges(tiles, w, h);
  // exits (inside the sealed ring)
  set(tiles, w, w - 2, 14, 'exit');
  set(tiles, w, w - 2, 15, 'exit');
  return {
    districtId: 'morro-neon',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 3, y: 8, w: 3, h: 3, style: 0, kind: 'morro' },
      { x: 6, y: 6, w: 3, h: 3, style: 1, kind: 'morro' },
      { x: 12, y: 7, w: 3, h: 3, style: 2, kind: 'morro' },
      { x: 22, y: 8, w: 3, h: 3, style: 3, kind: 'morro' },
      { x: 26, y: 6, w: 3, h: 3, style: 0, kind: 'morro' },
      { x: 30, y: 8, w: 3, h: 3, style: 1, kind: 'morro' },
      { x: 4, y: 18, w: 3, h: 3, style: 2, kind: 'morro' },
      { x: 24, y: 18, w: 3, h: 3, style: 3, kind: 'morro' },
      { x: 32, y: 18, w: 3, h: 3, style: 0, kind: 'morro' },
    ],
    signs: [
      { x: 11, y: 12, label: 'BOTECO NAIR', color: '#b8ff2b' },
      { x: 26, y: 12, label: 'ODDS 24h', color: '#ff2bd6' },
      { x: 6, y: 17, label: 'LAJE BET', color: '#ffdf00' },
    ],
    props: [
      { x: 15, y: 15, kind: 'moto' },
      { x: 28, y: 14, kind: 'kiosk' },
      { x: 10, y: 8, kind: 'wire' },
      { x: 22, y: 10, kind: 'wire' },
    ],
    landmark: { x: 19, y: 3, kind: 'led-tower' },
  };
}

/** Market fair: calçadão plaza, stalls, wave paving. */
function buildFeira(): MapDef {
  const w = 42;
  const h = 28;
  const tiles = fill(w, h, 'sidewalk');
  // big plaza
  for (let y = 8; y <= 20; y += 1) hStrip(tiles, w, y, 6, 34, 'plaza');
  // ring road
  for (let y = 6; y <= 7; y += 1) hStrip(tiles, w, y, 2, w - 3, 'asphalt');
  for (let y = 21; y <= 22; y += 1) hStrip(tiles, w, y, 2, w - 3, 'asphalt');
  for (let x = 2; x <= 4; x += 1) vStrip(tiles, w, x, 6, 22, 'asphalt');
  for (let x = w - 5; x <= w - 3; x += 1) vStrip(tiles, w, x, 6, 22, 'asphalt');
  // decorative plant strip inside the sealed ring
  for (let x = 1; x < w - 1; x += 1) {
    set(tiles, w, x, 1, 'grass');
    set(tiles, w, x, h - 2, 'grass');
  }
  sealEdges(tiles, w, h);
  set(tiles, w, 1, 14, 'exit');
  set(tiles, w, 2, 14, 'exit');
  set(tiles, w, w - 2, 14, 'exit');
  set(tiles, w, w - 3, 14, 'exit');
  return {
    districtId: 'feira-central',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 8, y: 9, w: 3, h: 2, style: 0, kind: 'feira' },
      { x: 14, y: 9, w: 3, h: 2, style: 1, kind: 'feira' },
      { x: 20, y: 9, w: 3, h: 2, style: 2, kind: 'feira' },
      { x: 26, y: 9, w: 3, h: 2, style: 3, kind: 'feira' },
      { x: 10, y: 17, w: 3, h: 2, style: 1, kind: 'feira' },
      { x: 18, y: 17, w: 3, h: 2, style: 0, kind: 'feira' },
      { x: 28, y: 17, w: 3, h: 2, style: 2, kind: 'feira' },
    ],
    signs: [
      { x: 12, y: 12, label: 'PASTEL & ODD', color: '#ffdf00' },
      { x: 24, y: 12, label: 'FORRÓ FM', color: '#ff6eb4' },
      { x: 16, y: 18, label: 'CALÇADÃO BET', color: '#2bfff2' },
    ],
    props: [
      { x: 15, y: 14, kind: 'kiosk' },
      { x: 22, y: 15, kind: 'kiosk' },
      { x: 30, y: 14, kind: 'moto' },
    ],
    landmark: { x: 20, y: 11, kind: 'calcadao' },
  };
}

/** Corporate boulevard: wide neon avenue + glass towers. */
function buildAvenida(): MapDef {
  const w = 44;
  const h = 26;
  const tiles = fill(w, h, 'sidewalk');
  // wide boulevard
  for (let y = 10; y <= 15; y += 1) hStrip(tiles, w, y, 1, w - 2, 'asphalt');
  hStrip(tiles, w, 9, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 16, 1, w - 2, 'sidewalk');
  // median plaza
  for (let y = 11; y <= 14; y += 1) hStrip(tiles, w, y, 18, 24, 'plaza');
  // side alleys
  for (let x = 8; x <= 9; x += 1) vStrip(tiles, w, x, 3, 9, 'alley');
  for (let x = 32; x <= 33; x += 1) vStrip(tiles, w, x, 16, 22, 'alley');
  sealEdges(tiles, w, h);
  set(tiles, w, 1, 12, 'exit');
  set(tiles, w, 2, 12, 'exit');
  set(tiles, w, w - 2, 12, 'exit');
  set(tiles, w, w - 3, 12, 'exit');
  return {
    districtId: 'avenida-odds',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 3, y: 2, w: 3, h: 4, style: 0, kind: 'avenida' },
      { x: 12, y: 2, w: 3, h: 4, style: 1, kind: 'avenida' },
      { x: 26, y: 2, w: 3, h: 4, style: 2, kind: 'avenida' },
      { x: 36, y: 2, w: 3, h: 4, style: 3, kind: 'avenida' },
      { x: 4, y: 17, w: 3, h: 4, style: 1, kind: 'avenida' },
      { x: 16, y: 17, w: 3, h: 4, style: 0, kind: 'avenida' },
      { x: 30, y: 17, w: 3, h: 4, style: 2, kind: 'avenida' },
    ],
    signs: [
      { x: 10, y: 9, label: 'ODDSCORP', color: '#2bfff2' },
      { x: 28, y: 9, label: 'CASA ATM', color: '#ff3b5c' },
      { x: 20, y: 16, label: 'PIXO ZONE', color: '#b8ff2b' },
    ],
    props: [
      { x: 14, y: 12, kind: 'moto' },
      { x: 34, y: 13, kind: 'moto' },
      { x: 6, y: 8, kind: 'wire' },
    ],
    landmark: { x: 21, y: 3, kind: 'glass-corp' },
  };
}

/** Casa Tower: interior casino floor — fill edges, no void. */
function buildTorre(): MapDef {
  const w = 36;
  const h = 26;
  const tiles = fill(w, h, 'interior');
  // carpeted main hall
  for (let y = 8; y <= 18; y += 1) hStrip(tiles, w, y, 4, w - 5, 'plaza');
  // marble walk
  for (let y = 11; y <= 15; y += 1) hStrip(tiles, w, y, 4, w - 5, 'asphalt');
  // VIP rooms
  for (let y = 2; y <= 6; y += 1) hStrip(tiles, w, y, 6, 14, 'sidewalk');
  for (let y = 2; y <= 6; y += 1) hStrip(tiles, w, y, 20, 28, 'sidewalk');
  sealEdges(tiles, w, h);
  // inner wall ring
  for (let x = 1; x < w - 1; x += 1) {
    set(tiles, w, x, 1, 'blocked');
    set(tiles, w, x, h - 2, 'blocked');
  }
  for (let y = 1; y < h - 1; y += 1) {
    set(tiles, w, 1, y, 'blocked');
    set(tiles, w, w - 2, y, 'blocked');
  }
  // reopen exit corridor
  set(tiles, w, 1, 13, 'exit');
  set(tiles, w, 1, 14, 'exit');
  set(tiles, w, 2, 13, 'asphalt');
  set(tiles, w, 2, 14, 'asphalt');
  return {
    districtId: 'torre-casa',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 8, y: 3, w: 3, h: 3, style: 0, kind: 'torre' },
      { x: 22, y: 3, w: 3, h: 3, style: 1, kind: 'torre' },
      { x: 10, y: 16, w: 3, h: 3, style: 2, kind: 'torre' },
      { x: 24, y: 16, w: 3, h: 3, style: 3, kind: 'torre' },
    ],
    signs: [
      { x: 14, y: 10, label: 'CASA SUPREMA', color: '#ff2bd6' },
      { x: 20, y: 16, label: 'VIP TABLE', color: '#ffdf00' },
    ],
    props: [
      { x: 16, y: 12, kind: 'kiosk' },
      { x: 26, y: 13, kind: 'kiosk' },
    ],
    landmark: { x: 17, y: 4, kind: 'casa-tower' },
  };
}
