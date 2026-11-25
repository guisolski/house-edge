import { Palette } from '../content/palette';
import type { DistrictId } from '../core/types';
import type { GameSession } from '../systems/session';
import type { WorldNpc } from '../systems/interaction';
import { createCamera, followPlayer, viewportPadding } from '../world/camera';
import { tileAt, type MapDef, type TileKind } from '../world/maps';
import { bakeSprite, blitImage } from './bake';
import { FpsMeter, type FpsSample } from './fps';
import { drawPixelText, measurePixelText } from './pixel-font';
import {
  makeAlley,
  makeAsphalt,
  makeBlocked,
  makeBuilding,
  makeCrate,
  makeCrowd,
  makeExitPad,
  makeGrass,
  makeInterior,
  makeKiosk,
  makeLandmark,
  makeMoto,
  makeNeonSign,
  makeNpcSprite,
  makePlayerSprite,
  makeEdgeWall,
  makePlaza,
  makeRetainingWall,
  makeSidewalk,
  makeStairs,
  makeStreetLamp,
  makeWaterTank,
  makeWire,
  type StairSide,
  type TileDistrict,
} from './pixel-gen';

const TILE = 16;
const SCALE = 3;
const TILE_PX = TILE * SCALE;
const RAIN_COUNT = 8;
const MAX_LIGHTS = 4;
const GLOW_R = 56;

export type WorldView = {
  canvas: HTMLCanvasElement;
  draw: (frame: number, now: number) => FpsSample;
  getFps: () => FpsSample;
  setShowFps: (on: boolean) => void;
  invalidateMap: () => void;
  /** Share of the most-common RGB along an edge band (void detector). */
  edgeFlatRatio: (edge: 'top' | 'left' | 'bottom' | 'right') => number;
};

type Baked = {
  player: HTMLCanvasElement[];
  npc: Map<string, HTMLCanvasElement>;
  building: Record<string, HTMLCanvasElement[]>;
  exit: HTMLCanvasElement;
  landmark: Map<string, HTMLCanvasElement>;
  sign: Map<string, HTMLCanvasElement>;
  props: Record<
    'moto' | 'kiosk' | 'wire' | 'tank' | 'lamp' | 'crate' | 'crowd',
    HTMLCanvasElement
  >;
  glow: Map<string, HTMLCanvasElement>;
};

type MapCache = {
  districtId: string;
  layer: HTMLCanvasElement;
};

type BackdropCache = {
  key: string;
  canvas: HTMLCanvasElement;
};

type SortBlit = {
  y: number;
  x: number;
  draw: () => void;
};

export function createWorldView(session: GameSession): WorldView {
  const state = makeViewState(session);
  window.addEventListener('resize', () => {
    state.resizeW = 0;
    state.resizeH = 0;
  });
  return {
    canvas: state.canvas,
    invalidateMap: () => {
      state.mapCache = null;
    },
    setShowFps: (on) => {
      state.showFps = on;
    },
    getFps: () => state.lastSample,
    edgeFlatRatio: (edge) => measureEdgeFlatRatio(state.canvas, edge),
    draw: (frame, now) => drawOnce(state, frame, now),
  };
}

function edgeBandOrigin(
  canvas: HTMLCanvasElement,
  edge: 'top' | 'left' | 'bottom' | 'right',
  band: number,
): { horiz: boolean; a0: number; limit: number } {
  const horiz = edge === 'top' || edge === 'bottom';
  if (edge === 'top') return { horiz, a0: 0, limit: canvas.width };
  if (edge === 'left') return { horiz, a0: 0, limit: canvas.height };
  if (edge === 'bottom') return { horiz, a0: canvas.height - band, limit: canvas.width };
  return { horiz, a0: canvas.width - band, limit: canvas.height };
}

function measureEdgeFlatRatio(
  canvas: HTMLCanvasElement,
  edge: 'top' | 'left' | 'bottom' | 'right',
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 1;
  const band = 12;
  const origin = edgeBandOrigin(canvas, edge, band);
  const counts = sampleEdgeColors(ctx, origin, band);
  let topN = 0;
  let total = 0;
  for (const n of counts.values()) {
    topN = Math.max(topN, n);
    total += n;
  }
  if (total === 0) return 1;
  return topN / total;
}

function sampleEdgeColors(
  ctx: CanvasRenderingContext2D,
  origin: { horiz: boolean; a0: number; limit: number },
  band: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < origin.limit; i += 8) {
    for (let j = 0; j < band; j += 2) {
      const x = origin.horiz ? i : origin.a0 + j;
      const y = origin.horiz ? origin.a0 + j : i;
      const d = ctx.getImageData(x, y, 1, 1).data;
      const key = `${d[0]},${d[1]},${d[2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

type ViewState = {
  canvas: HTMLCanvasElement;
  session: GameSession;
  baked: Baked;
  meter: FpsMeter;
  cam: ReturnType<typeof createCamera>;
  mapCache: MapCache | null;
  backdrop: BackdropCache | null;
  showFps: boolean;
  lastSample: FpsSample;
  resizeW: number;
  resizeH: number;
  marker: { x: number; y: number; districtId: string; name: string } | null;
  markerFrame: number;
};

function makeViewState(session: GameSession): ViewState {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.width = 960;
  canvas.height = 540;
  const state: ViewState = {
    canvas,
    session,
    baked: bakeAll(),
    meter: new FpsMeter(),
    cam: createCamera(),
    mapCache: null,
    backdrop: null,
    showFps: false,
    lastSample: { fps: 60, frameMs: 16, avgFps: 60, avgFrameMs: 16 },
    resizeW: 0,
    resizeH: 0,
    marker: null,
    markerFrame: -1,
  };
  return state;
}

function drawOnce(state: ViewState, frame: number, now: number): FpsSample {
  state.lastSample = state.meter.tick(now);
  state.cam = paintFrame(state, frame);
  return state.lastSample;
}

function districtTileVariant(districtId: DistrictId): TileDistrict {
  if (districtId === 'morro-neon') return 'morro';
  if (districtId === 'feira-central') return 'feira';
  if (districtId === 'avenida-odds') return 'avenida';
  if (districtId === 'torre-casa') return 'torre';
  return 'default';
}

function bakeDistrictTiles(districtId: DistrictId): Record<TileKind, HTMLCanvasElement> {
  const v = districtTileVariant(districtId);
  return {
    asphalt: bakeSprite(makeAsphalt(v), SCALE),
    sidewalk: bakeSprite(makeSidewalk(v), SCALE),
    alley: bakeSprite(makeAlley(v), SCALE),
    plaza: bakeSprite(makePlaza(v), SCALE),
    grass: bakeSprite(makeGrass(), SCALE),
    stairs: bakeSprite(makeStairs(v), SCALE),
    interior: bakeSprite(makeInterior(v), SCALE),
    blocked: bakeSprite(makeBlocked(v), SCALE),
    exit: bakeSprite(makeExitPad(), SCALE),
  };
}

function bakeAll(): Baked {
  return {
    player: [
      bakeSprite(makePlayerSprite(0), SCALE),
      bakeSprite(makePlayerSprite(1), SCALE),
    ],
    npc: new Map(),
    building: {
      morro: [0, 1, 2, 3, 4, 5, 6, 7].map((s) =>
        bakeSprite(makeBuilding(s, 'morro'), SCALE),
      ),
      feira: [0, 1, 2, 3, 4, 5, 6, 7].map((s) =>
        bakeSprite(makeBuilding(s, 'feira'), SCALE),
      ),
      avenida: [0, 1, 2, 3, 4, 5, 6, 7].map((s) =>
        bakeSprite(makeBuilding(s, 'avenida'), SCALE),
      ),
      torre: [0, 1, 2, 3, 4, 5, 6, 7].map((s) =>
        bakeSprite(makeBuilding(s, 'torre'), SCALE),
      ),
    },
    exit: bakeSprite(makeExitPad(), SCALE),
    landmark: new Map([
      ['led-tower', bakeSprite(makeLandmark('led-tower'), SCALE)],
      ['calcadao', bakeSprite(makeLandmark('calcadao'), SCALE)],
      ['glass-corp', bakeSprite(makeLandmark('glass-corp'), SCALE)],
      ['casa-tower', bakeSprite(makeLandmark('casa-tower'), SCALE)],
    ]),
    sign: new Map(),
    props: {
      moto: bakeSprite(makeMoto(), SCALE),
      kiosk: bakeSprite(makeKiosk(), SCALE),
      wire: bakeSprite(makeWire(), SCALE),
      tank: bakeSprite(makeWaterTank(), SCALE),
      lamp: bakeSprite(makeStreetLamp(), SCALE),
      crate: bakeSprite(makeCrate(), SCALE),
      crowd: bakeSprite(makeCrowd(), SCALE),
    },
    glow: new Map(),
  };
}

function paintPlayHud(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  map: MapDef,
  camX: number,
  camY: number,
  frame: number,
): void {
  if (!state.session.ui.is('play')) return;
  // Signs hide under modals so dialogue doesn't cover CASA SUPREMA / EXIT text.
  drawLiveSigns(ctx, state, map, camX, camY);
  drawMarker(ctx, state, camX, camY, frame);
  drawSideMarkers(ctx, state, camX, camY);
}

function paintFrame(state: ViewState, frame: number): ReturnType<typeof createCamera> {
  const { canvas, session, baked, showFps, lastSample: sample } = state;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return state.cam;
  fitCanvas(canvas, state);
  const stats = session.player.getStats();
  const map = session.getMap();
  ensureMapCache(state, map, baked);
  const cam = followPlayer({
    cam: state.cam,
    playerX: stats.x,
    playerY: stats.y,
    mapW: map.width,
    mapH: map.height,
    viewW: canvas.width,
    viewH: canvas.height,
    tilePx: TILE_PX,
    topInsetPx: 110,
    bottomInsetPx: 28,
  });
  const pad = viewportPadding({
    mapW: map.width,
    mapH: map.height,
    viewW: canvas.width,
    viewH: canvas.height,
    tilePx: TILE_PX,
  });
  const viewCamX = cam.x - pad.padX;
  const viewCamY = cam.y - pad.padY;
  ctx.imageSmoothingEnabled = false;
  paintBackdrop(state, ctx, canvas.width, canvas.height, stats.districtId);
  const layer = state.mapCache?.layer;
  if (layer) ctx.drawImage(layer, -viewCamX, -viewCamY);
  drawSortedActors(ctx, state, frame, viewCamX, viewCamY);
  paintPlayOverlays({
    ctx,
    state,
    px: stats.x,
    py: stats.y,
    camX: viewCamX,
    camY: viewCamY,
    frame,
  });
  paintPlayHud(ctx, state, map, viewCamX, viewCamY, frame);
  // FPS meter is a DOM overlay (see hud) — canvas draw was covered by .hud.
  void showFps;
  void sample;
  return cam;
}

function paintPlayOverlays(o: {
  ctx: CanvasRenderingContext2D;
  state: ViewState;
  px: number;
  py: number;
  camX: number;
  camY: number;
  frame: number;
}): void {
  if (!o.state.session.ui.is('play')) return;
  // Lights every other frame — radial 'lighter' blit is costly under CPU throttle.
  if ((o.frame & 1) === 0) {
    drawFewLights(o.ctx, o.state, o.px, o.py, o.camX, o.camY);
  }
  if ((o.frame & 3) === 0) drawRain(o.ctx, o.frame);
}

function ensureMapCache(state: ViewState, map: MapDef, baked: Baked): void {
  if (state.mapCache?.districtId === map.districtId) return;
  state.mapCache = {
    districtId: map.districtId,
    layer: bakeMapLayer(map, baked),
  };
}

function paintBackdrop(
  state: ViewState,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  districtId: DistrictId,
): void {
  const key = `${districtId}:${w}x${h}`;
  if (!state.backdrop || state.backdrop.key !== key) {
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    const bctx = layer.getContext('2d');
    if (bctx) {
      const grad = bctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#05040c');
      grad.addColorStop(0.5, Palette.nightSky);
      grad.addColorStop(1, '#0c1014');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);
      paintSceneryBand(bctx, w, h, districtId);
    }
    state.backdrop = { key, canvas: layer };
  }
  ctx.drawImage(state.backdrop.canvas, 0, 0);
}

/** Varied skyline silhouettes so letterbox edges are never a single flat colour. */
function paintSceneryBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  districtId: DistrictId,
): void {
  const accent =
    districtId === 'torre-casa'
      ? '#3a2040'
      : districtId === 'avenida-odds'
        ? '#142038'
        : districtId === 'feira-central'
          ? '#1a1820'
          : '#12141c';
  for (let i = 0; i < 18; i += 1) {
    const bw = 18 + ((i * 17) % 40);
    const bh = 30 + ((i * 29) % 90);
    const x = ((i * 73) % (w + 40)) - 20;
    const y = h - bh - ((i * 13) % 24);
    ctx.fillStyle = i % 3 === 0 ? accent : '#0a0c14';
    ctx.fillRect(x, y, bw, bh);
    if (i % 2 === 0) {
      ctx.fillStyle = '#2bfff211';
      ctx.fillRect(x + 4, y + 8, 3, 3);
    }
  }
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = '#ffffff22';
    ctx.fillRect((i * 97) % w, (i * 53) % Math.floor(h / 2), 2, 2);
  }
}

function bakeMapLayer(map: MapDef, baked: Baked): HTMLCanvasElement {
  const tiles = bakeDistrictTiles(map.districtId);
  const layer = document.createElement('canvas');
  layer.width = map.width * TILE_PX;
  layer.height = map.height * TILE_PX;
  const ctx = layer.getContext('2d');
  if (!ctx) return layer;
  ctx.imageSmoothingEnabled = false;
  paintTiles(ctx, map, tiles);
  paintStairSides(ctx, map);
  paintMapEdges(ctx, map);
  paintTerraceEdges(ctx, map);
  // Market stalls, crowds, buildings, landmark — baked once (foot-y order).
  // Signs stay live so they can hide under dialogue/bet modals.
  bakeStaticDecor(ctx, map, baked);
  ctx.fillStyle = '#2bfff210';
  ctx.fillRect(0, 0, layer.width, layer.height);
  return layer;
}

/** Static scenery into the map cache so the hot path only sorts NPCs + player. */
function bakeStaticDecor(ctx: CanvasRenderingContext2D, map: MapDef, baked: Baked): void {
  const items: SortBlit[] = [];
  pushBakedBuildings(items, ctx, map, baked);
  pushBakedProps(items, ctx, map, baked);
  pushBakedLandmark(items, ctx, map, baked);
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of items) it.draw();
}

function pushBakedBuildings(
  items: SortBlit[],
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  baked: Baked,
): void {
  for (const b of map.buildings) {
    const set = baked.building[b.kind] ?? baked.building.morro!;
    const spr = set[b.style % set.length]!;
    items.push({
      y: b.y + b.h - 1,
      x: b.x,
      draw: () => drawBuildingSprite(ctx, b, spr, 0, 0),
    });
  }
}

function pushBakedProps(
  items: SortBlit[],
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  baked: Baked,
): void {
  for (const p of map.props) {
    const img = baked.props[p.kind];
    items.push({
      y: p.y,
      x: p.x,
      draw: () =>
        blitImage(ctx, img, p.x * TILE_PX, p.y * TILE_PX - img.height + TILE_PX),
    });
  }
}

function pushBakedLandmark(
  items: SortBlit[],
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  baked: Baked,
): void {
  const lm = baked.landmark.get(map.landmark.kind) ?? baked.landmark.get('led-tower')!;
  items.push({
    y: map.landmark.y,
    x: map.landmark.x,
    draw: () =>
      blitImage(
        ctx,
        lm,
        map.landmark.x * TILE_PX,
        map.landmark.y * TILE_PX - lm.height + TILE_PX,
      ),
  });
}

function signImage(baked: Baked, label: string, color: string): HTMLCanvasElement {
  const key = `${label}|${color}`;
  let img = baked.sign.get(key);
  if (!img) {
    img = bakeSignWithText(label, color);
    baked.sign.set(key, img);
  }
  return img;
}

/** Draw signs in screen space; clamp so wide EXIT labels stay inside the map. */
function drawLiveSigns(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  map: MapDef,
  camX: number,
  camY: number,
): void {
  const maxX = map.width * TILE_PX;
  for (const s of map.signs) {
    const img = signImage(state.baked, s.label, s.color);
    let sx = s.x * TILE_PX;
    // Keep full destination text on-screen (east exits used to clip mid-word).
    if (sx + img.width > maxX - TILE_PX)
      sx = Math.max(TILE_PX, maxX - TILE_PX - img.width);
    blitImage(ctx, img, sx - camX, s.y * TILE_PX - 8 - camY);
  }
}

function paintTerraceEdges(ctx: CanvasRenderingContext2D, map: MapDef): void {
  if (!map.terraceEdges?.length) return;
  const walls = [0, 1, 2].map((v) => bakeSprite(makeRetainingWall(v), SCALE));
  for (const y of map.terraceEdges) {
    for (let x = 1; x < map.width - 1; x += 1) {
      const kind = tileAt(map, x, y);
      if (kind === 'stairs' || kind === 'exit') continue;
      const wall = walls[x % walls.length]!;
      // Align lip with the top of the blocked cliff row; face covers ~3 tiles down.
      blitImage(ctx, wall, x * TILE_PX, y * TILE_PX);
    }
  }
}

/** Solid border walls — kills the full-height window-dot column look. */
function paintMapEdges(ctx: CanvasRenderingContext2D, map: MapDef): void {
  const edges = [0, 1, 2, 3].map((s) => bakeSprite(makeEdgeWall(s), SCALE));
  for (let y = 0; y < map.height; y += 1) {
    blitImage(ctx, edges[y % edges.length]!, 0, y * TILE_PX);
    blitImage(
      ctx,
      edges[(y + 1) % edges.length]!,
      (map.width - 1) * TILE_PX,
      y * TILE_PX,
    );
  }
  for (let x = 0; x < map.width; x += 1) {
    blitImage(ctx, edges[x % edges.length]!, x * TILE_PX, 0);
    blitImage(
      ctx,
      edges[(x + 2) % edges.length]!,
      x * TILE_PX,
      (map.height - 1) * TILE_PX,
    );
  }
}

function paintTiles(
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  tiles: Record<TileKind, HTMLCanvasElement>,
): void {
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      blitImage(ctx, tiles[tileAt(map, x, y)], x * TILE_PX, y * TILE_PX);
    }
  }
}

/** Overpaint outer stair columns with railing variants so art matches collision. */
function paintStairSides(ctx: CanvasRenderingContext2D, map: MapDef): void {
  const v = districtTileVariant(map.districtId);
  const baked: Record<StairSide, HTMLCanvasElement> = {
    mid: bakeSprite(makeStairs(v, 'mid'), SCALE),
    left: bakeSprite(makeStairs(v, 'left'), SCALE),
    right: bakeSprite(makeStairs(v, 'right'), SCALE),
  };
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (tileAt(map, x, y) !== 'stairs') continue;
      const left = tileAt(map, x - 1, y) === 'stairs';
      const right = tileAt(map, x + 1, y) === 'stairs';
      const side: StairSide = !left ? 'left' : !right ? 'right' : 'mid';
      blitImage(ctx, baked[side], x * TILE_PX, y * TILE_PX);
    }
  }
}

/** Crisp pixel sign: 5×7 bitmap font at integer scale (never downscaled AI art). */
function bakeSignWithText(label: string, color: string): HTMLCanvasElement {
  const pad = 3;
  // Longer destination names use scale 2 so full text fits on-map.
  const up =
    label.length > 12 || label.includes('Avenue') || label.includes('Central') ? 2 : 3;
  const { w: textW, h: textH } = measurePixelText(label);
  const tw = Math.max(40, textW + pad * 2);
  const th = textH + pad * 2;
  const raw = document.createElement('canvas');
  raw.width = tw;
  raw.height = th;
  const rctx = raw.getContext('2d');
  if (!rctx) return bakeSprite(makeNeonSign(color), SCALE);
  rctx.imageSmoothingEnabled = false;
  rctx.fillStyle = '#0a0a18';
  rctx.fillRect(0, 0, tw, th);
  rctx.fillStyle = color;
  rctx.fillRect(1, 1, tw - 2, th - 2);
  rctx.fillStyle = '#0a0a18';
  rctx.fillRect(2, 2, tw - 4, th - 4);
  drawPixelText(rctx, label, Math.floor((tw - textW) / 2), pad, '#f4f4ff');
  const out = document.createElement('canvas');
  out.width = tw * up;
  out.height = th * up;
  const octx = out.getContext('2d');
  if (!octx) return raw;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(raw, 0, 0, out.width, out.height);
  return out;
}

function glowSprite(baked: Baked, color: string): HTMLCanvasElement {
  let img = baked.glow.get(color);
  if (img) return img;
  const size = GLOW_R * 2;
  img = document.createElement('canvas');
  img.width = size;
  img.height = size;
  const g = img.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(GLOW_R, GLOW_R, 2, GLOW_R, GLOW_R, GLOW_R);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.45;
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  baked.glow.set(color, img);
  return img;
}

function npcSprite(baked: Baked, npc: WorldNpc, frame: number): HTMLCanvasElement {
  const variant = npc.bodyVariant ?? 0;
  const key = `${npc.id}:${variant}:${frame % 2}`;
  let img = baked.npc.get(key);
  if (img) return img;
  // Shared base with 4 body/hair/outfit variants — not just a recolor.
  img = bakeSprite(makeNpcSprite(npc.color, frame % 2, npc.id, variant), SCALE);
  baked.npc.set(key, img);
  return img;
}

function drawPlayerMarker(o: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  img: HTMLCanvasElement;
  camX: number;
  camY: number;
  bob: number;
}): void {
  const px = o.x * TILE_PX - o.camX + o.img.width / 2;
  const py = o.y * TILE_PX - o.camY + TILE_PX - 4;
  o.ctx.strokeStyle = Palette.brasilYellow;
  o.ctx.lineWidth = 3;
  o.ctx.beginPath();
  o.ctx.ellipse(px, py, 18, 8, 0, 0, Math.PI * 2);
  o.ctx.stroke();
  o.ctx.fillStyle = '#ffdf0044';
  o.ctx.fill();
  const ay = o.y * TILE_PX - o.camY - (o.img.height - TILE_PX) + o.bob - 10;
  o.ctx.fillStyle = Palette.brasilYellow;
  o.ctx.beginPath();
  o.ctx.moveTo(px, ay);
  o.ctx.lineTo(px - 6, ay - 10);
  o.ctx.lineTo(px + 6, ay - 10);
  o.ctx.closePath();
  o.ctx.fill();
}

/** NPCs + player only — static scenery is already in the map cache layer. */
function drawSortedActors(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  frame: number,
  camX: number,
  camY: number,
): void {
  const { session, baked } = state;
  const stats = session.player.getStats();
  const anim = Math.floor(frame / 10) % 2;
  const bob = Math.sin(frame / 12) * 1.5;
  const view = { ctx, camX, camY, bob, vw: ctx.canvas.width, vh: ctx.canvas.height };
  const items: SortBlit[] = [];
  pushNpcSorts(items, session, baked, stats.districtId, anim, view);
  pushPlayerSort(items, baked, stats, anim, view);
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of items) it.draw();
}

type SortView = {
  ctx: CanvasRenderingContext2D;
  camX: number;
  camY: number;
  bob: number;
  vw: number;
  vh: number;
};

function pushNpcSorts(
  items: SortBlit[],
  session: ViewState['session'],
  baked: Baked,
  districtId: string,
  anim: number,
  view: SortView,
): void {
  const me = session.player.getStats();
  for (const npc of session.npcs) {
    if (npc.districtId !== districtId) continue;
    const img = npcSprite(baked, npc, anim);
    // Soft step-aside when Rita walks through — visual only (NPCs stay non-blocking).
    const near = Math.hypot(npc.x - me.x, npc.y - me.y) < 1.35;
    const asideX = near ? (npc.x >= me.x ? 0.35 : -0.35) : 0;
    const drawX = npc.x + asideX;
    items.push({
      y: npc.y,
      x: drawX,
      draw: () =>
        blitSortedSprite({
          ctx: view.ctx,
          img,
          tx: drawX,
          ty: npc.y,
          camX: view.camX,
          camY: view.camY,
          bob: view.bob,
          vw: view.vw,
          vh: view.vh,
        }),
    });
  }
}

function pushPlayerSort(
  items: SortBlit[],
  baked: Baked,
  stats: { x: number; y: number },
  anim: number,
  view: SortView,
): void {
  const playerImg = baked.player[anim]!;
  items.push({
    y: stats.y,
    x: stats.x,
    draw: () => {
      drawPlayerMarker({
        ctx: view.ctx,
        x: stats.x,
        y: stats.y,
        img: playerImg,
        camX: view.camX,
        camY: view.camY,
        bob: view.bob,
      });
      blitSortedSprite({
        ctx: view.ctx,
        img: playerImg,
        tx: stats.x,
        ty: stats.y,
        camX: view.camX,
        camY: view.camY,
        bob: view.bob,
        vw: view.vw,
        vh: view.vh,
      });
    },
  });
}

function drawBuildingSprite(
  ctx: CanvasRenderingContext2D,
  b: MapDef['buildings'][number],
  spr: HTMLCanvasElement,
  camX: number,
  camY: number,
): void {
  const x = b.x * TILE_PX - camX;
  const y = b.y * TILE_PX - spr.height + TILE_PX - camY;
  if ((b.x + b.style) % 2 === 1) {
    ctx.save();
    ctx.translate(x + spr.width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(spr, 0, 0);
    ctx.restore();
    return;
  }
  blitImage(ctx, spr, x, y);
}

function blitSortedSprite(p: {
  ctx: CanvasRenderingContext2D;
  img: HTMLCanvasElement;
  tx: number;
  ty: number;
  camX: number;
  camY: number;
  bob: number;
  vw: number;
  vh: number;
}): void {
  const ox = p.tx * TILE_PX - p.camX;
  const oy = p.ty * TILE_PX - p.camY - (p.img.height - TILE_PX) + p.bob;
  if (ox + p.img.width < 0 || oy + p.img.height < 0 || ox > p.vw || oy > p.vh) return;
  blitImage(p.ctx, p.img, ox, oy);
}

type GlowBlit = {
  ctx: CanvasRenderingContext2D;
  baked: Baked;
  color: string;
  wx: number;
  wy: number;
  camX: number;
  camY: number;
};

function blitGlow(g: GlowBlit): void {
  g.ctx.drawImage(
    glowSprite(g.baked, g.color),
    g.wx - g.camX - GLOW_R,
    g.wy - g.camY - GLOW_R,
  );
}

function paintWorldGlows(
  ctx: CanvasRenderingContext2D,
  baked: Baked,
  map: MapDef,
  camX: number,
  camY: number,
): void {
  let n = 0;
  for (const s of map.signs) {
    if (n >= MAX_LIGHTS - 2) break;
    blitGlow({
      ctx,
      baked,
      color: s.color,
      wx: s.x * TILE_PX + 28,
      wy: s.y * TILE_PX,
      camX,
      camY,
    });
    n += 1;
  }
  if (n < MAX_LIGHTS - 1) {
    const c = map.landmark.kind.includes('casa') ? Palette.gold : Palette.neonCyan;
    blitGlow({
      ctx,
      baked,
      color: c,
      wx: map.landmark.x * TILE_PX + 8,
      wy: map.landmark.y * TILE_PX,
      camX,
      camY,
    });
    n += 1;
  }
  paintKioskGlows(ctx, baked, map, camX, camY, n);
}

function paintKioskGlows(
  ctx: CanvasRenderingContext2D,
  baked: Baked,
  map: MapDef,
  camX: number,
  camY: number,
  n: number,
): number {
  for (const p of map.props) {
    if (n >= MAX_LIGHTS - 1 || p.kind !== 'kiosk') continue;
    blitGlow({
      ctx,
      baked,
      color: Palette.brasilYellow,
      wx: p.x * TILE_PX + 8,
      wy: p.y * TILE_PX - 12,
      camX,
      camY,
    });
    n += 1;
  }
  return n;
}

function drawFewLights(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  px: number,
  py: number,
  camX: number,
  camY: number,
): void {
  const map = state.session.getMap();
  const { baked } = state;
  ctx.globalCompositeOperation = 'lighter';
  paintWorldGlows(ctx, baked, map, camX, camY);
  blitGlow({
    ctx,
    baked,
    color: Palette.neonMagenta,
    wx: px * TILE_PX + 20,
    wy: py * TILE_PX + 10,
    camX,
    camY,
  });
  ctx.globalCompositeOperation = 'source-over';
}

function drawRain(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.fillStyle = Palette.rain;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const t = frame * 2;
  for (let i = 0; i < RAIN_COUNT; i += 1) {
    const x = (i * 97 + t) % w;
    const y = (i * 53 + t * 3) % h;
    ctx.fillRect(x, y, 2, 8);
  }
}

function refreshMarkerCache(state: ViewState, frame: number): void {
  if (state.markerFrame >= 0 && frame - state.markerFrame < 8) return;
  state.markerFrame = frame;
  const obj = state.session.objective();
  if (obj.targetX === undefined || obj.targetY === undefined) {
    state.marker = null;
    return;
  }
  state.marker = {
    x: obj.targetX,
    y: obj.targetY,
    districtId: obj.districtId ?? '',
    name: obj.targetName ?? '',
  };
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  camX: number,
  camY: number,
  frame: number,
): void {
  refreshMarkerCache(state, frame);
  const m = state.marker;
  const me = state.session.player.getStats();
  if (!m || m.districtId !== me.districtId) return;
  paintObjectiveMarker({
    ctx,
    tx: m.x,
    ty: m.y,
    camX,
    camY,
    frame,
    label: m.name,
    viewW: ctx.canvas.width,
    viewH: ctx.canvas.height,
    distTiles: Math.round(Math.hypot(m.x - me.x, m.y - me.y)),
  });
}

function drawSideMarkers(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  camX: number,
  camY: number,
): void {
  // Dim dots only — never compete with the main yellow objective arrow.
  const markers = state.session.sideMarkers();
  const obj = state.marker;
  for (const m of markers) {
    if (obj && m.x === obj.x && m.y === obj.y) continue;
    const px = m.x * TILE_PX + 16 - camX;
    const py = m.y * TILE_PX - 6 - camY;
    ctx.fillStyle = '#2bfff244';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

type ObjectiveMark = {
  ctx: CanvasRenderingContext2D;
  tx: number;
  ty: number;
  camX: number;
  camY: number;
  frame: number;
  label: string;
  viewW: number;
  viewH: number;
  distTiles: number;
};

/** Large bouncing yellow arrow + name; edge pointer when off-screen. */
function paintObjectiveMarker(m: ObjectiveMark): void {
  const bob = Math.sin(m.frame / 8) * 6;
  const rawX = m.tx * TILE_PX + 16 - m.camX;
  const rawY = m.ty * TILE_PX - 18 + bob - m.camY;
  const margin = 28;
  const onScreen =
    rawX >= margin && rawX <= m.viewW - margin && rawY >= 120 && rawY <= m.viewH - margin;
  if (onScreen) {
    paintBigArrow(m.ctx, rawX, rawY, Palette.brasilYellow);
    if (m.label) paintMarkerLabel(m.ctx, rawX, rawY - 22, m.label, m.viewW);
    return;
  }
  const px = clamp(rawX, margin, m.viewW - margin);
  const py = clamp(rawY, 120, m.viewH - margin);
  paintBigArrow(m.ctx, px, py, Palette.brasilYellow);
  const short = shortenLabel(m.label, 14);
  const label = short ? `${short} · ${m.distTiles}m` : `${m.distTiles}m`;
  paintMarkerLabel(m.ctx, px, py - 22, label, m.viewW);
}

function paintBigArrow(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
): void {
  ctx.fillStyle = '#00000099';
  ctx.beginPath();
  ctx.moveTo(px, py + 4);
  ctx.lineTo(px - 22, py - 34);
  ctx.lineTo(px + 22, py - 34);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - 18, py - 30);
  ctx.lineTo(px + 18, py - 30);
  ctx.fill();
  // Stem so it reads as a big quest marker, not a tiny chevron.
  ctx.fillRect(px - 4, py - 48, 8, 16);
}

function paintMarkerLabel(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  text: string,
  viewW = 960,
): void {
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  const pad = 10;
  const w = Math.min(220, ctx.measureText(text).width + 14);
  // Keep the full label box on-screen (flip/clamp instead of clipping).
  let left = px - w / 2;
  if (left < pad) left = pad;
  if (left + w > viewW - pad) left = Math.max(pad, viewW - pad - w);
  const cx = left + w / 2;
  ctx.fillStyle = '#000000dd';
  ctx.fillRect(left, py - 14, w, 20);
  ctx.strokeStyle = Palette.brasilYellow;
  ctx.strokeRect(left, py - 14, w, 20);
  ctx.fillStyle = Palette.brasilYellow;
  ctx.fillText(text, cx, py);
}

function shortenLabel(label: string, max: number): string {
  if (!label) return '';
  if (label.length <= max) return label;
  return `${label.slice(0, Math.max(1, max - 1))}…`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function fitCanvas(canvas: HTMLCanvasElement, state: ViewState): void {
  const parent = canvas.parentElement;
  const w = Math.max(320, parent?.clientWidth ?? 960);
  const h = Math.max(240, parent?.clientHeight ?? 540);
  if (state.resizeW === w && state.resizeH === h) return;
  state.resizeW = w;
  state.resizeH = h;
  canvas.width = w;
  canvas.height = h;
  state.backdrop = null;
}
