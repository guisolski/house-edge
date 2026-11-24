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
  /** Rows that get a retaining-wall lip (hillside edge). */
  terraceEdges?: number[];
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

function morroHouseSpots(): {
  x: number;
  y: number;
  style: number;
  bw: number;
  bh: number;
}[] {
  return [
    { x: 2, y: 2, style: 0, bw: 3, bh: 2 },
    { x: 6, y: 1, style: 5, bw: 2, bh: 3 },
    { x: 10, y: 3, style: 2, bw: 2, bh: 2 },
    { x: 14, y: 1, style: 7, bw: 3, bh: 3 },
    { x: 24, y: 2, style: 1, bw: 2, bh: 2 },
    { x: 28, y: 1, style: 4, bw: 3, bh: 2 },
    { x: 33, y: 3, style: 3, bw: 2, bh: 2 },
    { x: 36, y: 1, style: 6, bw: 2, bh: 3 },
    { x: 2, y: 8, style: 3, bw: 2, bh: 2 },
    { x: 5, y: 9, style: 0, bw: 3, bh: 2 },
    { x: 12, y: 8, style: 6, bw: 2, bh: 3 },
    { x: 25, y: 8, style: 2, bw: 3, bh: 2 },
    { x: 30, y: 9, style: 5, bw: 2, bh: 2 },
    { x: 34, y: 8, style: 1, bw: 2, bh: 3 },
    { x: 2, y: 22, style: 4, bw: 3, bh: 2 },
    { x: 7, y: 23, style: 7, bw: 2, bh: 2 },
    { x: 12, y: 21, style: 0, bw: 2, bh: 3 },
    { x: 24, y: 22, style: 3, bw: 3, bh: 2 },
    { x: 29, y: 21, style: 6, bw: 2, bh: 2 },
    { x: 33, y: 23, style: 2, bw: 3, bh: 2 },
  ];
}

function fillMorroProps(props: MapDef['props']): void {
  for (let x = 4; x < 38; x += 6) {
    props.push({ x, y: 6, kind: 'wire' });
    props.push({ x: x + 2, y: 12, kind: 'wire' });
  }
  for (const [x, y] of [
    [3, 2],
    [15, 2],
    [29, 2],
    [6, 9],
    [26, 9],
    [8, 22],
    [30, 22],
  ] as const) {
    props.push({ x, y, kind: 'tank' });
  }
  for (const [x, y] of [
    [9, 15],
    [18, 15],
    [27, 16],
    [14, 22],
  ] as const) {
    props.push({ x, y, kind: 'lamp' });
  }
  props.push({ x: 19, y: 16, kind: 'moto' }, { x: 15, y: 15, kind: 'kiosk' });
  for (const [x, y] of [
    [11, 16],
    [25, 16],
    [34, 16],
  ] as const) {
    props.push({ x, y, kind: 'crate' });
  }
}

function layoutMorroTerraces(tiles: TileKind[], w: number, h: number): void {
  rect({ tiles, w, x0: 1, y0: 1, x1: w - 2, y1: 5, kind: 'sidewalk' });
  rect({ tiles, w, x0: 1, y0: 8, x1: w - 2, y1: 11, kind: 'sidewalk' });
  rect({ tiles, w, x0: 1, y0: 14, x1: w - 2, y1: 17, kind: 'asphalt' });
  hStrip(tiles, w, 13, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 18, 1, w - 2, 'sidewalk');
  rect({ tiles, w, x0: 1, y0: 21, x1: w - 2, y1: h - 2, kind: 'sidewalk' });
  const spine = 20;
  vStrip(tiles, w, spine, 5, 8, 'stairs');
  vStrip(tiles, w, spine + 1, 5, 8, 'stairs');
  vStrip(tiles, w, spine, 11, 14, 'stairs');
  vStrip(tiles, w, spine + 1, 11, 14, 'stairs');
  vStrip(tiles, w, spine, 17, 21, 'stairs');
  vStrip(tiles, w, spine + 1, 17, 21, 'stairs');
  for (const sx of [8, 32]) {
    vStrip(tiles, w, sx, 5, 8, 'stairs');
    vStrip(tiles, w, sx, 11, 14, 'stairs');
  }
  rect({ tiles, w, x0: 10, y0: 14, x1: 17, y1: 17, kind: 'plaza' });
  paintExitPad(tiles, w, 38, 15);
}

/** Hillside favela: slope rises toward top (low y = ridge). */
function buildMorro(): MapDef {
  const w = 42;
  const h = 30;
  const tiles = fill(w, h, 'grass');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  layoutMorroTerraces(tiles, w, h);
  for (const s of morroHouseSpots()) {
    houseBlock({
      tiles,
      w,
      buildings,
      x: s.x,
      y: s.y,
      style: s.style,
      kind: 'morro',
      bw: s.bw,
      bh: s.bh,
    });
  }
  fillMorroProps(props);
  return {
    districtId: 'morro-neon',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 12, y: 13, label: 'BOTECO NAIR', color: '#ffdf00' },
      { x: 7, y: 18, label: 'LAJE BET', color: '#ffdf00' },
      { x: 29, y: 13, label: 'ODDS 24h', color: '#ff2bd6' },
    ],
    props,
    landmark: { x: 22, y: 2, kind: 'led-tower' },
    terraceEdges: [5, 11, 17],
  };
}

function buildFeira(): MapDef {
  const w = 44;
  const h = 26;
  const tiles = fill(w, h, 'sidewalk');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 1, y0: 11, x1: w - 2, y1: 15, kind: 'asphalt' });
  hStrip(tiles, w, 10, 1, w - 2, 'plaza');
  hStrip(tiles, w, 16, 1, w - 2, 'plaza');
  rect({ tiles, w, x0: 1, y0: 1, x1: w - 2, y1: 3, kind: 'blocked' });
  rect({ tiles, w, x0: 1, y0: h - 4, x1: w - 2, y1: h - 2, kind: 'blocked' });
  paintExitPad(tiles, w, 1, 13);
  paintExitPad(tiles, w, 40, 13);

  const stalls: { x: number; y: number; style: number; bw: number }[] = [
    { x: 3, y: 4, style: 0, bw: 3 },
    { x: 8, y: 5, style: 1, bw: 4 },
    { x: 14, y: 4, style: 2, bw: 3 },
    { x: 19, y: 5, style: 3, bw: 3 },
    { x: 24, y: 4, style: 4, bw: 4 },
    { x: 30, y: 5, style: 5, bw: 3 },
    { x: 35, y: 4, style: 6, bw: 3 },
    { x: 4, y: 18, style: 7, bw: 3 },
    { x: 10, y: 19, style: 0, bw: 4 },
    { x: 17, y: 18, style: 2, bw: 3 },
    { x: 23, y: 19, style: 3, bw: 3 },
    { x: 29, y: 18, style: 5, bw: 4 },
    { x: 35, y: 19, style: 1, bw: 3 },
  ];
  for (const s of stalls) {
    houseBlock({
      tiles,
      w,
      buildings,
      x: s.x,
      y: s.y,
      style: s.style,
      kind: 'feira',
      bw: s.bw,
      bh: 2,
    });
  }
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
  const tiles = fill(w, h, 'sidewalk');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 1, y0: 9, x1: w - 2, y1: 14, kind: 'asphalt' });
  hStrip(tiles, w, 8, 1, w - 2, 'plaza');
  hStrip(tiles, w, 15, 1, w - 2, 'plaza');
  rect({ tiles, w, x0: 1, y0: 1, x1: w - 2, y1: 2, kind: 'blocked' });
  rect({ tiles, w, x0: 1, y0: h - 3, x1: w - 2, y1: h - 2, kind: 'blocked' });
  paintExitPad(tiles, w, 1, 11);
  paintExitPad(tiles, w, 42, 11);

  const towers: { x: number; y: number; style: number; bw: number; bh: number }[] = [
    { x: 3, y: 2, style: 0, bw: 4, bh: 3 },
    { x: 9, y: 1, style: 1, bw: 5, bh: 4 },
    { x: 16, y: 2, style: 2, bw: 4, bh: 3 },
    { x: 23, y: 1, style: 3, bw: 5, bh: 3 },
    { x: 31, y: 2, style: 4, bw: 4, bh: 4 },
    { x: 37, y: 1, style: 5, bw: 4, bh: 3 },
    { x: 5, y: 16, style: 6, bw: 4, bh: 3 },
    { x: 14, y: 16, style: 7, bw: 5, bh: 3 },
    { x: 24, y: 17, style: 0, bw: 4, bh: 3 },
    { x: 32, y: 16, style: 2, bw: 5, bh: 3 },
  ];
  for (const t of towers) {
    houseBlock({
      tiles,
      w,
      buildings,
      x: t.x,
      y: t.y,
      style: t.style,
      kind: 'avenida',
      bw: t.bw,
      bh: t.bh,
    });
  }
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
    landmark: { x: 22, y: 3, kind: 'glass-corp' },
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
  const blocks: { x: number; y: number; style: number }[] = [
    { x: 5, y: 2, style: 0 },
    { x: 12, y: 1, style: 1 },
    { x: 20, y: 2, style: 2 },
    { x: 28, y: 1, style: 3 },
    { x: 6, y: 17, style: 4 },
    { x: 18, y: 17, style: 5 },
    { x: 28, y: 17, style: 6 },
  ];
  for (const b of blocks) {
    houseBlock({
      tiles,
      w,
      buildings,
      x: b.x,
      y: b.y,
      style: b.style,
      kind: 'torre',
      bw: 4,
      bh: 3,
    });
  }
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
    landmark: { x: 18, y: 4, kind: 'casa-tower' },
  };
}
