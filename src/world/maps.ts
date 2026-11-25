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

export type PropKind = 'moto' | 'kiosk' | 'wire' | 'tank' | 'lamp' | 'crate' | 'crowd';

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

/** Single-tile exit — must match DistrictExit coords and the door sprite. */
function paintExitPad(tiles: TileKind[], w: number, x: number, y: number): void {
  set(tiles, w, x, y, 'exit');
}

function morroHouseSpots(): {
  x: number;
  y: number;
  style: number;
  bw: number;
  bh: number;
}[] {
  // Irregular footprints hanging over terrace lips — clear of stairs (18..23) + NPC/spawn tiles.
  return [
    // Ridge (keep antena clear at 10,10 — houses above cliff y=4).
    { x: 2, y: 1, style: 0, bw: 3, bh: 2 },
    { x: 6, y: 2, style: 5, bw: 2, bh: 2 },
    { x: 12, y: 1, style: 2, bw: 3, bh: 2 },
    { x: 25, y: 1, style: 1, bw: 3, bh: 2 },
    { x: 29, y: 2, style: 4, bw: 2, bh: 2 },
    { x: 33, y: 1, style: 6, bw: 3, bh: 2 },
    { x: 37, y: 2, style: 3, bw: 2, bh: 2 },
    // Mid terrace (fio at 18,10 is on stairs; antena 10,10 stays open).
    { x: 2, y: 7, style: 3, bw: 2, bh: 2 },
    { x: 5, y: 8, style: 0, bw: 3, bh: 2 },
    { x: 12, y: 7, style: 6, bw: 2, bh: 2 },
    { x: 25, y: 8, style: 5, bw: 3, bh: 2 },
    { x: 30, y: 7, style: 1, bw: 2, bh: 2 },
    { x: 34, y: 8, style: 7, bw: 3, bh: 2 },
    // Street band — leave spawn, NPCs, plaza approaches, and exit corridor clear.
    { x: 2, y: 14, style: 4, bw: 2, bh: 2 },
    { x: 15, y: 16, style: 6, bw: 2, bh: 2 },
    // Lower terrace (pulled off ramp feet so bases aren't walk targets).
    { x: 2, y: 21, style: 1, bw: 3, bh: 2 },
    { x: 10, y: 21, style: 7, bw: 2, bh: 2 },
    { x: 14, y: 21, style: 4, bw: 3, bh: 2 },
    { x: 25, y: 21, style: 0, bw: 2, bh: 2 },
    { x: 35, y: 21, style: 2, bw: 3, bh: 2 },
  ];
}

function fillMorroProps(props: MapDef['props']): void {
  for (let x = 3; x < 38; x += 7) {
    props.push({ x, y: 6, kind: 'wire' });
    props.push({ x: x + 3, y: 13, kind: 'wire' });
  }
  for (const [x, y] of [
    [3, 2],
    [14, 2],
    [28, 2],
    [5, 9],
    [26, 9],
    [9, 20],
    [31, 20],
  ] as const) {
    props.push({ x, y, kind: 'tank' });
  }
  for (const [x, y] of [
    [8, 15],
    [17, 15],
    [28, 16],
    [13, 22],
  ] as const) {
    props.push({ x, y, kind: 'lamp' });
  }
  props.push({ x: 18, y: 16, kind: 'moto' }, { x: 14, y: 15, kind: 'kiosk' });
  for (const [x, y] of [
    [10, 16],
    [25, 16],
    [34, 16],
  ] as const) {
    props.push({ x, y, kind: 'crate' });
  }
}

function paintRamp(
  tiles: TileKind[],
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): void {
  for (let x = x0; x <= x1; x += 1) vStrip(tiles, w, x, y0, y1, 'stairs');
}

function layoutMorroTerraces(tiles: TileKind[], w: number, h: number): void {
  // Ridge / mid / street / lower — BLOCKED retaining faces between (height illusion).
  rect({ tiles, w, x0: 1, y0: 1, x1: w - 2, y1: 3, kind: 'sidewalk' });
  // 3-tile-tall cliff faces (walk via central stairs + side ramps).
  rect({ tiles, w, x0: 1, y0: 4, x1: w - 2, y1: 6, kind: 'blocked' });
  rect({ tiles, w, x0: 1, y0: 7, x1: w - 2, y1: 10, kind: 'sidewalk' });
  rect({ tiles, w, x0: 1, y0: 11, x1: w - 2, y1: 13, kind: 'blocked' });
  rect({ tiles, w, x0: 1, y0: 14, x1: w - 2, y1: 17, kind: 'asphalt' });
  rect({ tiles, w, x0: 1, y0: 18, x1: w - 2, y1: 19, kind: 'blocked' });
  rect({ tiles, w, x0: 1, y0: 20, x1: w - 2, y1: h - 2, kind: 'sidewalk' });
  // Wide central staircase (6 tiles) — collision matches visible stair art + rails.
  paintRamp(tiles, w, 18, 23, 3, 20);
  // Side ramps so terraces are reachable without hunting gaps.
  paintRamp(tiles, w, 6, 8, 3, 20);
  paintRamp(tiles, w, 31, 33, 3, 20);
  // Clear approach plazas at ramp feet / tops (readable walk affordance).
  rect({ tiles, w, x0: 10, y0: 14, x1: 17, y1: 17, kind: 'plaza' });
  rect({ tiles, w, x0: 5, y0: 14, x1: 9, y1: 16, kind: 'plaza' });
  rect({ tiles, w, x0: 30, y0: 14, x1: 34, y1: 16, kind: 'plaza' });
  // Exit pad inset from the east wall so the door + sign stay on-screen.
  paintExitPad(tiles, w, 36, 16);
}

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
      { x: 12, y: 14, label: 'BOTECO NAIR', color: '#ffdf00' },
      { x: 10, y: 20, label: 'LAJE BET', color: '#ffdf00' },
      { x: 27, y: 14, label: 'ODDS 24h', color: '#ff2bd6' },
      { x: 19, y: 12, label: 'STAIRS', color: '#b8ff2b' },
      { x: 7, y: 12, label: 'RAMP', color: '#b8ff2b' },
      { x: 32, y: 12, label: 'RAMP', color: '#b8ff2b' },
      // Inset from east wall so full destination text stays visible.
      { x: 34, y: 15, label: 'EXIT > FAIR', color: '#2bfff2' },
    ],
    props,
    landmark: { x: 22, y: 2, kind: 'led-tower' },
    // Lips sit on the top row of each blocked cliff face.
    terraceEdges: [4, 11, 18],
  };
}

function fillFeiraProps(props: MapDef['props']): void {
  for (let x = 5; x < 40; x += 4) {
    props.push({ x, y: 12, kind: 'crate' });
    props.push({ x: x + 1, y: 9, kind: 'lamp' });
  }
  for (const [x, y] of [
    [4, 7],
    [15, 7],
    [25, 7],
    [36, 7],
    [11, 17],
    [24, 17],
    [36, 17],
  ] as const) {
    props.push({ x, y, kind: 'crate' });
  }
  props.push({ x: 16, y: 13, kind: 'kiosk' }, { x: 22, y: 14, kind: 'moto' });
  props.push({ x: 28, y: 14, kind: 'kiosk' });
  for (const [x, y] of [
    [10, 11],
    [18, 12],
    [26, 11],
    [32, 13],
    [14, 16],
    [28, 16],
  ] as const) {
    props.push({ x, y, kind: 'crowd' });
  }
}

function buildFeira(): MapDef {
  const w = 44;
  const h = 26;
  // Calm plaza ground — occasional asphalt patches, no yellow-stripe hatch field.
  const tiles = fill(w, h, 'plaza');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 1, y0: 11, x1: w - 2, y1: 15, kind: 'asphalt' });
  hStrip(tiles, w, 10, 1, w - 2, 'sidewalk');
  hStrip(tiles, w, 16, 1, w - 2, 'sidewalk');
  for (const [x, y] of [
    [6, 6],
    [18, 7],
    [30, 6],
    [8, 20],
    [22, 21],
    [34, 20],
  ] as const) {
    rect({ tiles, w, x0: x, y0: y, x1: x + 2, y1: y + 1, kind: 'asphalt' });
  }
  // Pads inset from walls so EXIT signs + destinations stay fully on-screen.
  paintExitPad(tiles, w, 5, 13);
  paintExitPad(tiles, w, 38, 13);

  const stalls: { x: number; y: number; style: number; bw: number }[] = [
    { x: 8, y: 4, style: 0, bw: 3 },
    { x: 13, y: 5, style: 1, bw: 4 },
    { x: 19, y: 4, style: 2, bw: 3 },
    { x: 24, y: 5, style: 3, bw: 3 },
    { x: 29, y: 4, style: 4, bw: 4 },
    { x: 8, y: 18, style: 7, bw: 3 },
    { x: 13, y: 19, style: 0, bw: 4 },
    { x: 19, y: 18, style: 2, bw: 3 },
    { x: 24, y: 19, style: 3, bw: 3 },
    { x: 29, y: 18, style: 5, bw: 4 },
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
  fillFeiraProps(props);

  return {
    districtId: 'feira-central',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 15, y: 10, label: 'FEIRA', color: '#ffdf00' },
      { x: 28, y: 10, label: 'ODDS 24h', color: '#ff2bd6' },
      { x: 5, y: 11, label: 'EXIT > MORRO', color: '#2bfff2' },
      { x: 36, y: 12, label: 'EXIT > ODDS AVE', color: '#2bfff2' },
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
  rect({ tiles, w, x0: 1, y0: 1, x1: w - 2, y1: 1, kind: 'blocked' });
  rect({ tiles, w, x0: 1, y0: h - 2, x1: w - 2, y1: h - 2, kind: 'blocked' });
  paintExitPad(tiles, w, 5, 12);
  paintExitPad(tiles, w, 40, 12);

  const towers: { x: number; y: number; style: number; bw: number; bh: number }[] = [
    { x: 8, y: 2, style: 0, bw: 4, bh: 3 },
    { x: 14, y: 1, style: 1, bw: 5, bh: 4 },
    { x: 21, y: 2, style: 2, bw: 4, bh: 3 },
    { x: 27, y: 1, style: 3, bw: 5, bh: 3 },
    { x: 34, y: 2, style: 4, bw: 4, bh: 4 },
    { x: 8, y: 16, style: 6, bw: 4, bh: 3 },
    { x: 16, y: 16, style: 7, bw: 5, bh: 3 },
    { x: 25, y: 17, style: 0, bw: 4, bh: 3 },
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
      { x: 28, y: 8, label: 'CASA SUPREMA', color: '#ff2bd6' },
      { x: 5, y: 10, label: 'EXIT > FAIR', color: '#2bfff2' },
      { x: 38, y: 11, label: 'EXIT > CASA TOWER', color: '#2bfff2' },
    ],
    props,
    landmark: { x: 22, y: 3, kind: 'glass-corp' },
  };
}

function buildTorre(): MapDef {
  const w = 40;
  const h = 24;
  // Luxury casino floor — carpet interior, not another neon boulevard.
  const tiles = fill(w, h, 'interior');
  const buildings: MapDef['buildings'] = [];
  const props: MapDef['props'] = [];
  seal(tiles, w, h);
  rect({ tiles, w, x0: 2, y0: 2, x1: w - 3, y1: h - 3, kind: 'interior' });
  rect({ tiles, w, x0: 4, y0: 10, x1: 35, y1: 14, kind: 'plaza' });
  // Single door inset from the west wall — readable EXIT sign + destination.
  paintExitPad(tiles, w, 5, 12);
  // Tables / VIP booths (torre sprites = casino furniture, not towers).
  const tables: { x: number; y: number; style: number; bw: number; bh: number }[] = [
    { x: 8, y: 3, style: 0, bw: 3, bh: 2 },
    { x: 14, y: 3, style: 1, bw: 4, bh: 2 },
    { x: 21, y: 3, style: 2, bw: 3, bh: 2 },
    { x: 28, y: 3, style: 3, bw: 4, bh: 2 },
    { x: 10, y: 7, style: 4, bw: 3, bh: 2 },
    { x: 18, y: 7, style: 5, bw: 3, bh: 2 },
    { x: 26, y: 7, style: 6, bw: 3, bh: 2 },
    { x: 8, y: 16, style: 7, bw: 3, bh: 2 },
    { x: 15, y: 17, style: 0, bw: 4, bh: 2 },
    { x: 23, y: 16, style: 1, bw: 3, bh: 2 },
    { x: 30, y: 17, style: 2, bw: 3, bh: 2 },
  ];
  for (const b of tables) {
    houseBlock({
      tiles,
      w,
      buildings,
      x: b.x,
      y: b.y,
      style: b.style,
      kind: 'torre',
      bw: b.bw,
      bh: b.bh,
    });
  }
  for (let x = 8; x < 34; x += 5) props.push({ x, y: 11, kind: 'lamp' });
  props.push({ x: 18, y: 12, kind: 'crate' }, { x: 22, y: 13, kind: 'kiosk' });
  props.push({ x: 12, y: 12, kind: 'crowd' }, { x: 30, y: 12, kind: 'crowd' });
  return {
    districtId: 'torre-casa',
    width: w,
    height: h,
    tiles,
    buildings,
    signs: [
      { x: 16, y: 5, label: 'CASA SUPREMA', color: '#ffdf00' },
      { x: 26, y: 11, label: 'VIP TABLE', color: '#ffdf00' },
      { x: 12, y: 9, label: 'PIT FLOOR', color: '#ff2bd6' },
      { x: 5, y: 10, label: 'EXIT > ODDS AVE', color: '#2bfff2' },
    ],
    props,
    landmark: { x: 18, y: 8, kind: 'casa-tower' },
  };
}
