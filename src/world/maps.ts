import type { DistrictId } from '../core/types';

/** Tile kinds — night city (collision / semantics). */
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

export type PropKind = 'moto' | 'kiosk' | 'wire' | 'tank' | 'lamp' | 'crate';

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
  props: { x: number; y: number; kind: PropKind }[];
  landmark: { x: number; y: number; kind: string };
};

export function tileAt(map: MapDef, x: number, y: number): TileKind {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'blocked';
  return map.tiles[y * map.width + x] ?? 'blocked';
}

export function isWalkable(map: MapDef, x: number, y: number): boolean {
  return tileAt(map, x, y) !== 'blocked';
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

type RectSpec = {
  tiles: TileKind[];
  w: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  kind: TileKind;
};

function rect(spec: RectSpec): void {
  for (let y = spec.y0; y <= spec.y1; y += 1) {
    hStrip(spec.tiles, spec.w, y, spec.x0, spec.x1, spec.kind);
  }
}

function seal(tiles: TileKind[], w: number, h: number): void {
  for (let x = 0; x < w; x += 1) {
    set(tiles, w, x, 0, 'blocked');
    set(tiles, w, x, h - 1, 'blocked');
  }
  for (let y = 0; y < h; y += 1) {
    set(tiles, w, 0, y, 'blocked');
    set(tiles, w, w - 1, y, 'blocked');
  }
}

type HouseSpec = {
  tiles: TileKind[];
  w: number;
  buildings: MapDef['buildings'];
  x: number;
  y: number;
  style: number;
  kind: BuildingStyle;
  bw?: number;
  bh?: number;
};

function houseBlock(spec: HouseSpec): void {
  const bw = spec.bw ?? 2;
  const bh = spec.bh ?? 2;
  rect({
    tiles: spec.tiles,
    w: spec.w,
    x0: spec.x,
    y0: spec.y,
    x1: spec.x + bw - 1,
    y1: spec.y + bh - 1,
    kind: 'blocked',
  });
  spec.buildings.push({
    x: spec.x,
    y: spec.y,
    w: bw,
    h: bh,
    style: spec.style,
    kind: spec.kind,
  });
}

function paintExitPad(tiles: TileKind[], w: number, x: number, y: number): void {
  set(tiles, w, x, y, 'exit');
  set(tiles, w, x + 1, y, 'exit');
  set(tiles, w, x, y + 1, 'exit');
  set(tiles, w, x + 1, y + 1, 'exit');
}

function placeSpots(
  tiles: TileKind[],
  w: number,
  buildings: MapDef['buildings'],
  spots: [number, number, number][],
  kind: BuildingStyle,
  size?: { bw: number; bh: number },
): void {
  for (const [x, y, style] of spots) {
    houseBlock({
      tiles,
      w,
      buildings,
      x,
      y,
      style,
      kind,
      bw: size?.bw,
      bh: size?.bh,
    });
  }
}

function morroTerraces(tiles: TileKind[], w: number, h: number): void {
  rect({ tiles, w, x0: 1, y0: 1, x1: w - 2, y1: 8, kind: 'sidewalk' });
  rect({ tiles, w, x0: 1, y0: 12, x1: w - 2, y1: 16, kind: 'asphalt' });
  hStrip(tiles, w, 11, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 17, 1, w - 2, 'sidewalk');
  rect({ tiles, w, x0: 1, y0: 20, x1: w - 2, y1: h - 2, kind: 'sidewalk' });
  for (const sx of [6, 14, 22, 30, 36]) {
    vStrip(tiles, w, sx, 8, 12, 'stairs');
    vStrip(tiles, w, sx + 1, 8, 12, 'stairs');
    vStrip(tiles, w, sx, 16, 20, 'stairs');
    vStrip(tiles, w, sx + 1, 16, 20, 'stairs');
  }
  rect({ tiles, w, x0: 11, y0: 13, x1: 18, y1: 16, kind: 'plaza' });
  paintExitPad(tiles, w, 38, 14);
}

function morroProps(props: MapDef['props']): void {
  for (let x = 3; x < 38; x += 5) {
    props.push({ x, y: 10, kind: 'wire' });
    props.push({ x: x + 2, y: 18, kind: 'wire' });
  }
  for (const [x, y] of [
    [4, 5],
    [15, 5],
    [27, 5],
    [8, 21],
    [25, 21],
  ] as const) {
    props.push({ x, y, kind: 'tank' });
  }
  for (const [x, y] of [
    [7, 13],
    [19, 13],
    [31, 14],
    [12, 21],
  ] as const) {
    props.push({ x, y, kind: 'lamp' });
  }
  props.push({ x: 20, y: 15, kind: 'moto' }, { x: 15, y: 14, kind: 'kiosk' });
  for (const [x, y] of [
    [10, 15],
    [25, 15],
    [33, 15],
  ] as const) {
    props.push({ x, y, kind: 'crate' });
  }
}

/** Hillside favela: terraces, stairs, dense houses, wires. */
function buildMorro(): MapDef {
  const w = 42;
  const h = 30;
  const tiles = fill(w, h, 'alley');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  morroTerraces(tiles, w, h);
  // Keep (10,8) clear for Antena Tech NPC.
  placeSpots(
    tiles,
    w,
    buildings,
    [
      [2, 2, 0],
      [5, 3, 1],
      [9, 2, 2],
      [12, 4, 3],
      [16, 2, 0],
      [20, 3, 1],
      [24, 2, 2],
      [28, 4, 3],
      [32, 2, 0],
      [35, 3, 1],
      [2, 18, 2],
      [5, 19, 3],
      [9, 18, 0],
      [16, 19, 1],
      [20, 18, 2],
      [24, 19, 3],
      [28, 18, 0],
      [32, 19, 1],
      [3, 9, 1],
      [18, 9, 3],
      [26, 8, 0],
      [33, 9, 1],
    ],
    'morro',
  );
  morroProps(props);
  return {
    districtId: 'morro-neon',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 12, y: 12, label: 'BOTECO NAIR', color: '#ffdf00' },
      { x: 8, y: 16, label: 'LAJE BET', color: '#ffdf00' },
      { x: 28, y: 12, label: 'ODDS 24h', color: '#ff2bd6' },
    ],
    props,
    landmark: { x: 16, y: 6, kind: 'led-tower' },
  };
}

function buildFeira(): MapDef {
  const w = 44;
  const h = 26;
  const tiles = fill(w, h, 'plaza');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 1, y0: 11, x1: w - 2, y1: 15, kind: 'asphalt' });
  hStrip(tiles, w, 10, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 16, 1, w - 2, 'sidewalk');
  paintExitPad(tiles, w, 1, 13);
  paintExitPad(tiles, w, 40, 13);
  placeSpots(
    tiles,
    w,
    buildings,
    [
      [4, 4, 0],
      [9, 5, 1],
      [14, 4, 2],
      [19, 5, 3],
      [24, 4, 0],
      [29, 5, 1],
      [34, 4, 2],
      [6, 17, 3],
      [12, 18, 0],
      [18, 17, 1],
      [24, 18, 2],
      [30, 17, 3],
    ],
    'feira',
    { bw: 3, bh: 2 },
  );
  for (let x = 5; x < 40; x += 4) {
    props.push({ x, y: 12, kind: 'crate' });
    props.push({ x: x + 1, y: 9, kind: 'lamp' });
  }
  props.push({ x: 16, y: 13, kind: 'kiosk' }, { x: 22, y: 14, kind: 'moto' });
  return {
    districtId: 'feira-central',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 15, y: 10, label: 'FEIRA', color: '#ffdf00' },
      { x: 28, y: 10, label: 'ODDS 24h', color: '#ff2bd6' },
    ],
    props,
    landmark: { x: 20, y: 6, kind: 'calcadao' },
  };
}

function buildAvenida(): MapDef {
  const w = 46;
  const h = 24;
  const tiles = fill(w, h, 'alley');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 1, y0: 9, x1: w - 2, y1: 14, kind: 'asphalt' });
  hStrip(tiles, w, 8, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 15, 1, w - 2, 'sidewalk');
  paintExitPad(tiles, w, 1, 11);
  paintExitPad(tiles, w, 42, 11);
  placeSpots(
    tiles,
    w,
    buildings,
    [
      [4, 2, 0],
      [11, 2, 1],
      [18, 1, 2],
      [25, 2, 3],
      [32, 1, 0],
      [8, 16, 1],
      [16, 16, 2],
      [28, 16, 3],
    ],
    'avenida',
    { bw: 4, bh: 3 },
  );
  for (let x = 6; x < 42; x += 5) props.push({ x, y: 8, kind: 'lamp' });
  props.push({ x: 20, y: 13, kind: 'moto' }, { x: 14, y: 11, kind: 'crate' });
  return {
    districtId: 'avenida-odds',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 16, y: 8, label: 'ODDS 24h', color: '#ff2bd6' },
      { x: 30, y: 8, label: 'CASA SUPREMA', color: '#ff2bd6' },
    ],
    props,
    landmark: { x: 22, y: 4, kind: 'glass-corp' },
  };
}

function buildTorre(): MapDef {
  const w = 40;
  const h = 24;
  const tiles = fill(w, h, 'interior');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 3, y0: 10, x1: 36, y1: 15, kind: 'asphalt' });
  hStrip(tiles, w, 9, 3, 36, 'plaza');
  hStrip(tiles, w, 16, 3, 36, 'plaza');
  paintExitPad(tiles, w, 1, 13);
  placeSpots(
    tiles,
    w,
    buildings,
    [
      [6, 3, 0],
      [14, 2, 1],
      [22, 3, 2],
      [30, 2, 3],
      [8, 17, 0],
      [20, 17, 1],
    ],
    'torre',
    { bw: 4, bh: 3 },
  );
  for (let x = 8; x < 34; x += 4) props.push({ x, y: 11, kind: 'lamp' });
  props.push({ x: 16, y: 13, kind: 'crate' });
  return {
    districtId: 'torre-casa',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 14, y: 9, label: 'CASA SUPREMA', color: '#ff2bd6' },
      { x: 24, y: 12, label: 'VIP TABLE', color: '#ffdf00' },
    ],
    props,
    landmark: { x: 18, y: 5, kind: 'casa-tower' },
  };
}
