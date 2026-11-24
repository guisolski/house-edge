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

type TileBox = { x0: number; y0: number; x1: number; y1: number };

function rect(tiles: TileKind[], w: number, box: TileBox, kind: TileKind): void {
  for (let y = box.y0; y <= box.y1; y += 1) {
    for (let x = box.x0; x <= box.x1; x += 1) set(tiles, w, x, y, kind);
  }
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

/** Favela hillside: dense alleys, stairs, stacked houses — no green fields. */
function buildMorro(): MapDef {
  const w = 42;
  const h = 30;
  const tiles = fill(w, h, 'alley');

  rect(tiles, w, { x0: 1, y0: 1, x1: w - 2, y1: 2 }, 'sidewalk');
  rect(tiles, w, { x0: 1, y0: h - 3, x1: w - 2, y1: h - 2 }, 'sidewalk');

  for (let y = 13; y <= 16; y += 1) hStrip(tiles, w, y, 1, w - 2, 'asphalt');
  hStrip(tiles, w, 12, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 17, 1, w - 2, 'sidewalk');

  rect(tiles, w, { x0: 9, y0: 13, x1: 18, y1: 16 }, 'plaza');

  vStrip(tiles, w, 5, 2, 11, 'stairs');
  vStrip(tiles, w, 6, 3, 12, 'stairs');
  for (let y = 2; y <= 11; y += 1) {
    const span = 4 + Math.floor((11 - y) / 2);
    hStrip(tiles, w, y, 7, 7 + span, 'stairs');
  }

  vStrip(tiles, w, 21, 4, 24, 'alley');
  vStrip(tiles, w, 22, 3, 26, 'alley');
  vStrip(tiles, w, 29, 2, h - 3, 'alley');
  vStrip(tiles, w, 34, 5, 20, 'alley');

  for (let y = 4; y <= 10; y += 1) {
    hStrip(tiles, w, y, 24, 36, y % 2 === 0 ? 'asphalt' : 'sidewalk');
  }
  for (let y = 18; y <= 26; y += 1) {
    if (y % 3 === 0) hStrip(tiles, w, y, 8, 32, 'asphalt');
  }

  rect(tiles, w, { x0: 2, y0: 5, x1: 8, y1: 9 }, 'plaza');
  rect(tiles, w, { x0: 30, y0: 4, x1: 35, y1: 8 }, 'plaza');

  set(tiles, w, 18, 14, 'grass');
  set(tiles, w, 19, 14, 'grass');

  sealEdges(tiles, w, h);
  set(tiles, w, 38, 14, 'exit');
  set(tiles, w, 38, 15, 'exit');

  return {
    districtId: 'morro-neon',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 2, y: 6, w: 3, h: 3, style: 0, kind: 'morro' },
      { x: 8, y: 4, w: 3, h: 3, style: 1, kind: 'morro' },
      { x: 11, y: 7, w: 3, h: 3, style: 2, kind: 'morro' },
      { x: 14, y: 5, w: 3, h: 3, style: 3, kind: 'morro' },
      { x: 24, y: 3, w: 3, h: 3, style: 0, kind: 'morro' },
      { x: 27, y: 5, w: 3, h: 3, style: 1, kind: 'morro' },
      { x: 31, y: 3, w: 3, h: 3, style: 2, kind: 'morro' },
      { x: 35, y: 6, w: 3, h: 3, style: 3, kind: 'morro' },
      { x: 3, y: 18, w: 3, h: 3, style: 0, kind: 'morro' },
      { x: 7, y: 20, w: 3, h: 3, style: 1, kind: 'morro' },
      { x: 16, y: 19, w: 3, h: 3, style: 2, kind: 'morro' },
      { x: 25, y: 18, w: 3, h: 3, style: 3, kind: 'morro' },
      { x: 30, y: 20, w: 3, h: 3, style: 0, kind: 'morro' },
      { x: 36, y: 19, w: 3, h: 3, style: 1, kind: 'morro' },
    ],
    signs: [
      { x: 11, y: 12, label: 'BOTECO NAIR', color: '#b8ff2b' },
      { x: 26, y: 12, label: 'ODDS 24h', color: '#ff2bd6' },
      { x: 6, y: 17, label: 'LAJE BET', color: '#ffdf00' },
      { x: 33, y: 12, label: 'PIXODROME', color: '#2bfff2' },
    ],
    props: [
      { x: 15, y: 15, kind: 'moto' },
      { x: 28, y: 14, kind: 'moto' },
      { x: 10, y: 15, kind: 'kiosk' },
      { x: 20, y: 16, kind: 'kiosk' },
      { x: 32, y: 15, kind: 'kiosk' },
      { x: 8, y: 8, kind: 'wire' },
      { x: 14, y: 6, kind: 'wire' },
      { x: 22, y: 10, kind: 'wire' },
      { x: 30, y: 8, kind: 'wire' },
      { x: 37, y: 12, kind: 'wire' },
    ],
    landmark: { x: 19, y: 3, kind: 'led-tower' },
  };
}

/** Market fair: Copacabana wave plaza, dense stalls, calçadão ring. */
function buildFeira(): MapDef {
  const w = 44;
  const h = 28;
  const tiles = fill(w, h, 'sidewalk');

  rect(tiles, w, { x0: 7, y0: 7, x1: w - 8, y1: 21 }, 'plaza');

  for (let y = 5; y <= 6; y += 1) hStrip(tiles, w, y, 2, w - 3, 'asphalt');
  for (let y = 22; y <= 23; y += 1) hStrip(tiles, w, y, 2, w - 3, 'asphalt');
  for (let x = 2; x <= 4; x += 1) vStrip(tiles, w, x, 5, 23, 'asphalt');
  for (let x = w - 5; x <= w - 3; x += 1) vStrip(tiles, w, x, 5, 23, 'asphalt');

  hStrip(tiles, w, 1, 1, w - 2, 'asphalt');
  hStrip(tiles, w, h - 2, 1, w - 2, 'asphalt');

  for (let x = 10; x <= 32; x += 8) {
    vStrip(tiles, w, x, 8, 20, 'sidewalk');
  }
  for (let y = 10; y <= 18; y += 4) {
    hStrip(tiles, w, y, 8, w - 9, 'sidewalk');
  }

  rect(tiles, w, { x0: 5, y0: 14, x1: 7, y1: 16 }, 'alley');
  rect(tiles, w, { x0: w - 8, y0: 14, x1: w - 6, y1: 16 }, 'alley');

  sealEdges(tiles, w, h);
  set(tiles, w, 1, 14, 'exit');
  set(tiles, w, 2, 14, 'exit');
  set(tiles, w, 40, 14, 'exit');
  set(tiles, w, 41, 14, 'exit');

  return {
    districtId: 'feira-central',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 6, y: 8, w: 3, h: 2, style: 0, kind: 'feira' },
      { x: 10, y: 8, w: 3, h: 2, style: 1, kind: 'feira' },
      { x: 14, y: 8, w: 3, h: 2, style: 2, kind: 'feira' },
      { x: 18, y: 8, w: 3, h: 2, style: 3, kind: 'feira' },
      { x: 22, y: 8, w: 3, h: 2, style: 0, kind: 'feira' },
      { x: 26, y: 8, w: 3, h: 2, style: 1, kind: 'feira' },
      { x: 30, y: 8, w: 3, h: 2, style: 2, kind: 'feira' },
      { x: 34, y: 8, w: 3, h: 2, style: 3, kind: 'feira' },
      { x: 8, y: 17, w: 3, h: 2, style: 1, kind: 'feira' },
      { x: 14, y: 17, w: 3, h: 2, style: 0, kind: 'feira' },
      { x: 20, y: 17, w: 3, h: 2, style: 2, kind: 'feira' },
      { x: 26, y: 17, w: 3, h: 2, style: 3, kind: 'feira' },
      { x: 32, y: 17, w: 3, h: 2, style: 0, kind: 'feira' },
    ],
    signs: [
      { x: 12, y: 11, label: 'PASTEL & ODD', color: '#ffdf00' },
      { x: 24, y: 11, label: 'FORRÓ FM', color: '#ff6eb4' },
      { x: 16, y: 18, label: 'CALÇADÃO BET', color: '#2bfff2' },
      { x: 30, y: 11, label: 'MARACUTÁ', color: '#b8ff2b' },
    ],
    props: [
      { x: 11, y: 14, kind: 'kiosk' },
      { x: 18, y: 15, kind: 'kiosk' },
      { x: 25, y: 14, kind: 'kiosk' },
      { x: 32, y: 15, kind: 'kiosk' },
      { x: 36, y: 14, kind: 'moto' },
      { x: 9, y: 12, kind: 'wire' },
    ],
    landmark: { x: 22, y: 10, kind: 'calcadao' },
  };
}

/** Corporate boulevard: wide neon avenue, glass towers, reflective sidewalks. */
function buildAvenida(): MapDef {
  const w = 48;
  const h = 28;
  const tiles = fill(w, h, 'sidewalk');

  for (let y = 10; y <= 17; y += 1) hStrip(tiles, w, y, 1, w - 2, 'asphalt');
  hStrip(tiles, w, 8, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 9, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 18, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 19, 1, w - 2, 'sidewalk');

  rect(tiles, w, { x0: 20, y0: 11, x1: 26, y1: 15 }, 'plaza');

  for (let x = 6; x <= 7; x += 1) vStrip(tiles, w, x, 2, 7, 'alley');
  for (let x = 38; x <= 39; x += 1) vStrip(tiles, w, x, 20, 26, 'alley');

  rect(tiles, w, { x0: 2, y0: 3, x1: 10, y1: 6 }, 'plaza');
  rect(tiles, w, { x0: 34, y0: 3, x1: 44, y1: 6 }, 'plaza');

  sealEdges(tiles, w, h);
  set(tiles, w, 1, 12, 'exit');
  set(tiles, w, 2, 12, 'exit');
  set(tiles, w, 42, 12, 'exit');
  set(tiles, w, 43, 12, 'exit');

  return {
    districtId: 'avenida-odds',
    width: w,
    height: h,
    tiles,
    buildings: [
      { x: 4, y: 2, w: 3, h: 4, style: 0, kind: 'avenida' },
      { x: 10, y: 2, w: 3, h: 5, style: 1, kind: 'avenida' },
      { x: 16, y: 2, w: 3, h: 5, style: 2, kind: 'avenida' },
      { x: 28, y: 2, w: 3, h: 5, style: 3, kind: 'avenida' },
      { x: 34, y: 2, w: 3, h: 4, style: 0, kind: 'avenida' },
      { x: 40, y: 2, w: 3, h: 5, style: 1, kind: 'avenida' },
      { x: 6, y: 20, w: 3, h: 4, style: 2, kind: 'avenida' },
      { x: 18, y: 20, w: 3, h: 4, style: 0, kind: 'avenida' },
      { x: 30, y: 20, w: 3, h: 4, style: 1, kind: 'avenida' },
      { x: 42, y: 20, w: 3, h: 4, style: 3, kind: 'avenida' },
    ],
    signs: [
      { x: 10, y: 9, label: 'ODDSCORP', color: '#2bfff2' },
      { x: 30, y: 9, label: 'CASA ATM', color: '#ff3b5c' },
      { x: 20, y: 16, label: 'PIXO ZONE', color: '#b8ff2b' },
      { x: 40, y: 9, label: 'ODDS TV', color: '#ff2bd6' },
    ],
    props: [
      { x: 14, y: 12, kind: 'moto' },
      { x: 36, y: 13, kind: 'moto' },
      { x: 8, y: 8, kind: 'wire' },
      { x: 44, y: 8, kind: 'kiosk' },
    ],
    landmark: { x: 23, y: 3, kind: 'glass-corp' },
  };
}

/** Casa Tower: full casino interior to the edges — no grass, no void. */
function buildTorre(): MapDef {
  const w = 44;
  const h = 28;
  const tiles = fill(w, h, 'interior');

  rect(tiles, w, { x0: 6, y0: 6, x1: w - 7, y1: h - 7 }, 'plaza');
  for (let y = 10; y <= 18; y += 1) hStrip(tiles, w, y, 5, w - 6, 'asphalt');
  hStrip(tiles, w, 9, 5, w - 6, 'sidewalk');
  hStrip(tiles, w, 19, 5, w - 6, 'sidewalk');

  rect(tiles, w, { x0: 2, y0: 2, x1: 16, y1: 7 }, 'sidewalk');
  rect(tiles, w, { x0: 26, y0: 2, x1: 40, y1: 7 }, 'sidewalk');
  rect(tiles, w, { x0: 10, y0: 21, x1: 20, y1: 25 }, 'alley');
  rect(tiles, w, { x0: 28, y0: 21, x1: 38, y1: 25 }, 'alley');

  sealEdges(tiles, w, h);
  for (let x = 1; x < w - 1; x += 1) {
    set(tiles, w, x, 1, 'blocked');
    set(tiles, w, x, h - 2, 'blocked');
  }
  for (let y = 1; y < h - 1; y += 1) {
    set(tiles, w, 1, y, 'blocked');
    set(tiles, w, w - 2, y, 'blocked');
  }

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
      { x: 6, y: 3, w: 3, h: 3, style: 0, kind: 'torre' },
      { x: 18, y: 3, w: 3, h: 3, style: 1, kind: 'torre' },
      { x: 30, y: 3, w: 3, h: 3, style: 2, kind: 'torre' },
      { x: 38, y: 3, w: 3, h: 3, style: 3, kind: 'torre' },
      { x: 8, y: 16, w: 3, h: 3, style: 0, kind: 'torre' },
      { x: 16, y: 16, w: 3, h: 3, style: 1, kind: 'torre' },
      { x: 24, y: 16, w: 3, h: 3, style: 2, kind: 'torre' },
      { x: 32, y: 16, w: 3, h: 3, style: 3, kind: 'torre' },
    ],
    signs: [
      { x: 14, y: 10, label: 'CASA SUPREMA', color: '#ff2bd6' },
      { x: 28, y: 10, label: 'HIGH ROLLER', color: '#2bfff2' },
      { x: 20, y: 16, label: 'VIP TABLE', color: '#ffdf00' },
    ],
    props: [
      { x: 12, y: 12, kind: 'kiosk' },
      { x: 22, y: 13, kind: 'kiosk' },
      { x: 32, y: 12, kind: 'kiosk' },
      { x: 36, y: 13, kind: 'kiosk' },
    ],
    landmark: { x: 21, y: 4, kind: 'casa-tower' },
  };
}
