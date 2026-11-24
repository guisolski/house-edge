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
};

type Baked = {
  player: HTMLCanvasElement[];
  npc: Map<string, HTMLCanvasElement>;
  building: Record<string, HTMLCanvasElement[]>;
  exit: HTMLCanvasElement;
  landmark: Map<string, HTMLCanvasElement>;
  sign: Map<string, HTMLCanvasElement>;
  props: Record<'moto' | 'kiosk' | 'wire' | 'tank' | 'lamp' | 'crate', HTMLCanvasElement>;
  glow: Map<string, HTMLCanvasElement>;
};

type MapCache = {
  districtId: string;
  layer: HTMLCanvasElement;
};

type ActorItem = { y: number; x: number; img: HTMLCanvasElement };

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
    draw: (frame, now) => drawOnce(state, frame, now),
  };
}

type ViewState = {
  canvas: HTMLCanvasElement;
  session: GameSession;
  baked: Baked;
  meter: FpsMeter;
  cam: ReturnType<typeof createCamera>;
  mapCache: MapCache | null;
  showFps: boolean;
  lastSample: FpsSample;
  resizeW: number;
  resizeH: number;
  actors: ActorItem[];
  marker: { x: number; y: number; districtId: string } | null;
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
    showFps: false,
    lastSample: { fps: 60, frameMs: 16, avgFps: 60, avgFrameMs: 16 },
    resizeW: 0,
    resizeH: 0,
    actors: [],
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
    },
    glow: new Map(),
  };
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
  });
  const pad = viewportPadding({
    mapW: map.width,
    mapH: map.height,
    viewW: canvas.width,
    viewH: canvas.height,
    tilePx: TILE_PX,
  });
  // Screen-space camera: world - viewCam (+ letterbox via negative cam when padded).
  const viewCamX = cam.x - pad.padX;
  const viewCamY = cam.y - pad.padY;
  const district = state.session.world.get(stats.districtId);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = district?.color ? blendVoid(district.color) : Palette.nightSky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const layer = state.mapCache?.layer;
  if (layer) ctx.drawImage(layer, -viewCamX, -viewCamY);
  drawActors(ctx, state, frame, viewCamX, viewCamY);
  paintPlayOverlays({
    ctx,
    state,
    px: stats.x,
    py: stats.y,
    camX: viewCamX,
    camY: viewCamY,
    frame,
    map,
    baked,
  });
  drawMarker(ctx, state, viewCamX, viewCamY, frame);
  if (showFps) drawFpsOverlay(ctx, sample);
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
  map: MapDef;
  baked: Baked;
}): void {
  if (o.state.session.ui.is('play')) {
    drawFewLights(o.ctx, o.state, o.px, o.py, o.camX, o.camY);
    if ((o.frame & 1) === 0) drawRain(o.ctx, o.frame);
  }
  paintSignsScreen(o.ctx, o.map, o.baked, o.camX, o.camY);
}

function ensureMapCache(state: ViewState, map: MapDef, baked: Baked): void {
  if (state.mapCache?.districtId === map.districtId) return;
  state.mapCache = {
    districtId: map.districtId,
    layer: bakeMapLayer(map, baked),
  };
}

function blendVoid(districtColor: string): string {
  return districtColor.length >= 7 ? `${districtColor}22` : Palette.nightSky;
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
  paintMapEdges(ctx, map);
  paintTerraceEdges(ctx, map);
  paintBuildings(ctx, map, baked);
  // Signs painted each frame on top — keep cache key warm in bakeAll.
  for (const s of map.signs) {
    const key = `${s.label}|${s.color}`;
    if (!baked.sign.has(key)) baked.sign.set(key, bakeSignWithText(s.label, s.color));
  }
  paintProps(ctx, map, baked);
  paintLandmark(ctx, map, baked);
  ctx.fillStyle = '#2bfff210';
  ctx.fillRect(0, 0, layer.width, layer.height);
  return layer;
}

function paintTerraceEdges(ctx: CanvasRenderingContext2D, map: MapDef): void {
  if (!map.terraceEdges?.length) return;
  const walls = [0, 1, 2].map((v) => bakeSprite(makeRetainingWall(v), SCALE));
  for (const y of map.terraceEdges) {
    for (let x = 1; x < map.width - 1; x += 1) {
      const kind = tileAt(map, x, y);
      if (kind === 'stairs' || kind === 'exit') continue;
      const wall = walls[x % walls.length]!;
      // Hang the tall face down from the terrace lip onto the level below.
      blitImage(ctx, wall, x * TILE_PX, y * TILE_PX + TILE_PX - 12);
    }
  }
}

/** Solid border walls — kills the full-height window-dot column look. */
function paintMapEdges(ctx: CanvasRenderingContext2D, map: MapDef): void {
  const edge = bakeSprite(makeEdgeWall(), SCALE);
  for (let y = 0; y < map.height; y += 1) {
    blitImage(ctx, edge, 0, y * TILE_PX);
    blitImage(ctx, edge, (map.width - 1) * TILE_PX, y * TILE_PX);
  }
  for (let x = 0; x < map.width; x += 1) {
    blitImage(ctx, edge, x * TILE_PX, 0);
    blitImage(ctx, edge, x * TILE_PX, (map.height - 1) * TILE_PX);
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

function paintBuildings(ctx: CanvasRenderingContext2D, map: MapDef, baked: Baked): void {
  for (const b of map.buildings) {
    const set = baked.building[b.kind] ?? baked.building.morro!;
    const spr = set[b.style % set.length]!;
    const x = b.x * TILE_PX;
    const y = b.y * TILE_PX - spr.height + TILE_PX;
    // Flip every other facade to break left/right repetition.
    if ((b.x + b.style) % 2 === 1) {
      ctx.save();
      ctx.translate(x + spr.width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
      ctx.restore();
    } else {
      blitImage(ctx, spr, x, y);
    }
  }
}

function paintSignsScreen(
  ctx: CanvasRenderingContext2D,
  map: MapDef,
  baked: Baked,
  camX: number,
  camY: number,
): void {
  for (const s of map.signs) {
    const key = `${s.label}|${s.color}`;
    let img = baked.sign.get(key);
    if (!img) {
      img = bakeSignWithText(s.label, s.color);
      baked.sign.set(key, img);
    }
    blitImage(ctx, img, s.x * TILE_PX - camX, s.y * TILE_PX - 28 - camY);
  }
}

function paintProps(ctx: CanvasRenderingContext2D, map: MapDef, baked: Baked): void {
  for (const p of map.props) {
    blitImage(ctx, baked.props[p.kind], p.x * TILE_PX, p.y * TILE_PX - 8);
  }
}

function paintLandmark(ctx: CanvasRenderingContext2D, map: MapDef, baked: Baked): void {
  const lm = baked.landmark.get(map.landmark.kind) ?? baked.landmark.get('led-tower')!;
  blitImage(
    ctx,
    lm,
    map.landmark.x * TILE_PX,
    map.landmark.y * TILE_PX - lm.height + TILE_PX,
  );
}

/** Crisp pixel sign: 5×7 bitmap font at integer scale (never downscaled AI art). */
function bakeSignWithText(label: string, color: string): HTMLCanvasElement {
  const pad = 3;
  const up = 3;
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
  const key = `${npc.id}:${frame % 2}`;
  let img = baked.npc.get(key);
  if (img) return img;
  // Same 22×38 hand-authored base as the player — recolored per NPC.
  img = bakeSprite(makeNpcSprite(npc.color, frame % 2, npc.id), SCALE);
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

function drawActors(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  frame: number,
  camX: number,
  camY: number,
): void {
  const { session, baked, actors } = state;
  const stats = session.player.getStats();
  // Idle bob / blink cycle — visible even when standing still.
  const anim = Math.floor(frame / 10) % 2;
  actors.length = 0;
  for (const npc of session.npcs) {
    if (npc.districtId !== stats.districtId) continue;
    actors.push({
      y: npc.y,
      x: npc.x,
      img: npcSprite(baked, npc, anim),
    });
  }
  const playerImg = baked.player[anim]!;
  actors.push({ y: stats.y, x: stats.x, img: playerImg });
  actors.sort((a, b) => a.y - b.y || a.x - b.x);
  const vw = ctx.canvas.width;
  const vh = ctx.canvas.height;
  const bob = Math.sin(frame / 12) * 1.5;
  drawPlayerMarker({ ctx, x: stats.x, y: stats.y, img: playerImg, camX, camY, bob });
  for (const it of actors) {
    const ox = it.x * TILE_PX - camX;
    const oy = it.y * TILE_PX - camY - (it.img.height - TILE_PX) + bob;
    if (ox + it.img.width < 0 || oy + it.img.height < 0) continue;
    if (ox > vw || oy > vh) continue;
    blitImage(ctx, it.img, ox, oy);
  }
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

function drawMarker(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  camX: number,
  camY: number,
  frame: number,
): void {
  // Refresh objective marker at most every 8 frames (not every paint).
  if (state.markerFrame < 0 || frame - state.markerFrame >= 8) {
    state.markerFrame = frame;
    const obj = state.session.objective();
    if (obj.targetX === undefined || obj.targetY === undefined) {
      state.marker = null;
    } else {
      state.marker = {
        x: obj.targetX,
        y: obj.targetY,
        districtId: obj.districtId ?? '',
      };
    }
  }
  const m = state.marker;
  if (!m) return;
  if (m.districtId !== state.session.player.getStats().districtId) return;
  const bob = Math.sin(frame / 10) * 4;
  const px = m.x * TILE_PX + 16 - camX;
  const py = m.y * TILE_PX - 14 + bob - camY;
  ctx.fillStyle = Palette.brasilYellow;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - 8, py - 14);
  ctx.lineTo(px + 8, py - 14);
  ctx.fill();
}

function drawFpsOverlay(ctx: CanvasRenderingContext2D, sample: FpsSample): void {
  // Bottom-left so the play HUD does not cover the meter.
  const y = ctx.canvas.height - 52;
  ctx.fillStyle = '#000000aa';
  ctx.fillRect(8, y, 150, 44);
  ctx.fillStyle = sample.avgFps >= 50 ? '#b8ff2b' : '#ff3b5c';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FPS ${sample.fps} (avg ${sample.avgFps.toFixed(0)})`, 14, y + 18);
  ctx.fillText(`${sample.frameMs.toFixed(1)} ms`, 14, y + 34);
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
}
