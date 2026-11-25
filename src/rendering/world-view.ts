import { Palette } from '../content/palette';
import type { DistrictId } from '../core/types';
import { getLocale } from '../i18n';
import { localizedNpcName } from '../i18n/localize-npc';
import { localizeSign } from '../i18n/localize-sign';
import type { GameSession } from '../systems/session';
import type { WorldNpc } from '../systems/interaction';
import { createCamera, followPlayer, viewportPadding } from '../world/camera';
import {
  buildDistrictMap,
  buildTorreVip,
  tileAt,
  type MapDef,
  type TileKind,
} from '../world/maps';
import { nextPathWaypoint } from '../world/path';
import { bakeSprite, blitImage } from './bake';
import { FpsMeter, type FpsSample } from './fps';
import { labelOffsetForSigns, layoutMarkerLabel } from './label-layout';
import { drawPixelText, measurePixelText } from './pixel-font';
import {
  makeAlley,
  makeAsphalt,
  makeBarrier,
  makeBlocked,
  makeBuilding,
  makeContainer,
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
  makePlant,
  makeTrash,
  makePuddle,
  makeGraffiti,
  makeAwning,
  makeOrelhao,
  makeVendorCart,
  type StairSide,
  type TileDistrict,
} from './pixel-gen';
import { makeNpcAnimFrame, makePlayerAnimFrame } from './char-sprites';
import { npcIdleFrame, npcIdleKindFor } from '../systems/char-anim';

const TILE = 16;
/** World / building / prop bake scale (integer — pixel-perfect). */
const SCALE = 3;
/**
 * Character bake scale — smaller than world so buildings read ~3–5× tall
 * (playtest #26 / Guilherme: characters were overscaled vs houses).
 */
const CHAR_SCALE = 2;
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
    | 'moto'
    | 'kiosk'
    | 'wire'
    | 'tank'
    | 'lamp'
    | 'crate'
    | 'crowd'
    | 'barrier'
    | 'container'
    | 'plant'
    | 'trash'
    | 'puddle'
    | 'graffiti'
    | 'awning'
    | 'orelhao'
    | 'vendor',
    HTMLCanvasElement
  >;
  glow: Map<string, HTMLCanvasElement>;
  /** Prewarmed district layers so travel/elevator don't hitch. */
  mapLayers: Map<string, HTMLCanvasElement>;
};

type MapCache = {
  /** Includes VIP floor suffix so foyer/VIP don't share a stale bake. */
  key: string;
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
  marker: {
    x: number;
    y: number;
    districtId: string;
    name: string;
    arrowOnly: boolean;
    npcOwns: boolean;
  } | null;
  markerFrame: number;
};

function makeViewState(session: GameSession): ViewState {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.width = 960;
  canvas.height = 540;
  const baked = bakeAll();
  prewarmDistricts(session, baked);
  const state: ViewState = {
    canvas,
    session,
    baked,
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
      bakeSprite(makePlayerSprite(0), CHAR_SCALE),
      bakeSprite(makePlayerSprite(1), CHAR_SCALE),
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
      barrier: bakeSprite(makeBarrier(), SCALE),
      container: bakeSprite(makeContainer(), SCALE),
      plant: bakeSprite(makePlant(), SCALE),
      trash: bakeSprite(makeTrash(), SCALE),
      puddle: bakeSprite(makePuddle(), SCALE),
      graffiti: bakeSprite(makeGraffiti(), SCALE),
      awning: bakeSprite(makeAwning(), SCALE),
      orelhao: bakeSprite(makeOrelhao(), SCALE),
      vendor: bakeSprite(makeVendorCart(), SCALE),
    },
    glow: new Map(),
    mapLayers: new Map(),
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
  drawLiveSigns(ctx, state, map, camX, camY, frame);
  drawStealthDrones(ctx, state, camX, camY, frame);
  drawNearbyNpcNames(ctx, state, map, camX, camY, frame);
  drawMarker(ctx, state, camX, camY, frame);
  drawSideMarkers(ctx, state, camX, camY);
}

type TagRow = {
  npc: ViewState['session']['npcs'][number];
  d: number;
  force: boolean;
};

/** Collect objective + nearest tags. Elevators stay neon-only (no canvas nameplate). */
function collectTagRows(state: ViewState): TagRow[] {
  const me = state.session.player.getStats();
  const obj = state.session.objective();
  const objNpc = state.session.objectiveNpcInRange();
  const near: TagRow[] = [];
  const seen = new Set<string>();
  for (const npc of state.session.floorNpcs()) {
    if (npc.districtId !== me.districtId || !npc.name) continue;
    // Neon already names the car — never draw a second Elevator tag.
    if (npc.id.startsWith('elevator')) continue;
    // One nameplate per display name on this floor (Luna / VIP Host / Nair).
    if (seen.has(npc.name)) continue;
    const d = Math.hypot(npc.x - me.x, npc.y - me.y);
    const isObj =
      Boolean(objNpc && npc.id === objNpc.id) ||
      (obj.targetName != null && npc.name === obj.targetName);
    if (isObj) {
      seen.add(npc.name);
      near.push({ npc, d, force: true });
    } else if (d <= 2.2) {
      // Playtest #31: tighter radius so clustered tags don't stack in threes.
      seen.add(npc.name);
      near.push({ npc, d, force: false });
    }
  }
  near.sort((a, b) => Number(b.force) - Number(a.force) || a.d - b.d);
  // Playtest #32: objective + only the single nearest other (no stacked groups).
  const forced = near.filter((r) => r.force);
  const other = near.find((r) => !r.force);
  return other ? [...forced.slice(0, 1), other] : forced.slice(0, 1);
}

/**
 * Name tags: always show the objective; otherwise nearest 2 non-objective.
 * Anchored to the same sprite blit position every frame (aside + bob).
 */
function drawNearbyNpcNames(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  map: MapDef,
  camX: number,
  camY: number,
  frame: number,
): void {
  const me = state.session.player.getStats();
  const bob = Math.sin(frame / 10) * 2;
  const placed: { x: number; y: number }[] = [];
  collectTagRows(state).forEach((row, i) => {
    paintOneNpcTag({ ctx, map, camX, camY, me, bob, row, i, placed });
  });
}

function paintOneNpcTag(o: {
  ctx: CanvasRenderingContext2D;
  map: MapDef;
  camX: number;
  camY: number;
  me: { x: number; y: number };
  bob: number;
  row: TagRow;
  i: number;
  placed: { x: number; y: number }[];
}): void {
  const tagName = localizedNpcName(o.row.npc);
  const avoid = labelOffsetForSigns({
    tileX: o.row.npc.x,
    tileY: o.row.npc.y,
    signs: o.map.signs,
    tagText: tagName,
    camX: o.camX,
    camY: o.camY,
  });
  if (avoid.hideLabel && !o.row.force) return;
  const nearMe = Math.hypot(o.row.npc.x - o.me.x, o.row.npc.y - o.me.y) < 1.35;
  const aside = nearMe ? (o.row.npc.x >= o.me.x ? 0.55 : -0.55) : 0;
  const px = (o.row.npc.x + aside) * TILE_PX + 16 - o.camX;
  // Lift above CHAR_SCALE sprites (~108px); extra lift when overlapping Rita.
  const tagLift = nearMe ? 96 : 78;
  let stack = o.i * -40;
  let py = o.row.npc.y * TILE_PX - tagLift - o.camY + avoid.dy + o.bob + stack;
  for (const p of o.placed) {
    if (Math.hypot(px - p.x, py - p.y) < 32) {
      stack -= 40;
      py = o.row.npc.y * TILE_PX - tagLift - o.camY + avoid.dy + o.bob + stack;
    }
  }
  // Hard reject any remaining overlap after stack lifts.
  if (o.placed.some((p) => Math.hypot(px - p.x, py - p.y) < 36)) {
    if (!o.row.force) return;
    py -= 44;
  }
  o.placed.push({ x: px, y: py });
  // Non-nearest (shouldn't draw often): keep force tags opaque.
  if (!o.row.force && o.i > 0) o.ctx.globalAlpha = 0.55;
  paintMarkerLabel(o.ctx, px, py, tagName, o.ctx.canvas.width);
  o.ctx.globalAlpha = 1;
}

/** Steady translucent sight cone — always drawn (brightness may pulse). */
function paintDroneCone(
  ctx: CanvasRenderingContext2D,
  d: { x: number; y: number; facing: number; halfAngle: number; range: number },
  camX: number,
  camY: number,
  frame: number,
): void {
  const cx = d.x * TILE_PX + 16 - camX;
  const cy = d.y * TILE_PX + 16 - camY;
  const reach = d.range * TILE_PX;
  const steps = 10;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i <= steps; i += 1) {
    const a = d.facing - d.halfAngle + (2 * d.halfAngle * i) / steps;
    ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
  }
  ctx.closePath();
  // Pulse alpha only — never skip frames (playtest #24 flicker made cones unreadable).
  const pulse = 0x40 + Math.floor(12 * (0.5 + 0.5 * Math.sin(frame * 0.08)));
  const fill = `#2bfff2${pulse.toString(16).padStart(2, '0')}`;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#ffdf00cc';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = Palette.neonCyan;
  ctx.fillRect(cx - 7, cy - 7, 14, 14);
  ctx.fillStyle = '#ff2bd6';
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
}

/** Patrolling drones + sight cones during Neon Snap stealth. */
function drawStealthDrones(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  camX: number,
  camY: number,
  frame: number,
): void {
  const stealth = state.session.getStealthProgress();
  if (!stealth || stealth.done) return;
  for (const d of stealth.drones) paintDroneCone(ctx, d, camX, camY, frame);
  // Goal beacon + EXIT label + player→exit arrow.
  const g = stealth.def.goal;
  const gx = g.x * TILE_PX + 16 - camX;
  const gy = g.y * TILE_PX + 16 - camY;
  ctx.strokeStyle = Palette.brasilYellow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx, gy, 14, 0, Math.PI * 2);
  ctx.stroke();
  paintMarkerLabel(ctx, gx, gy - 22, localizeSign('EXIT'), ctx.canvas.width);
  const me = state.session.player.getStats();
  const px = me.x * TILE_PX + 16 - camX;
  const py = me.y * TILE_PX + 16 - camY;
  const ang = Math.atan2(gy - py, gx - px);
  ctx.fillStyle = '#ffdf00cc';
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(ang) * 22, py + Math.sin(ang) * 22);
  ctx.lineTo(px + Math.cos(ang + 2.5) * 12, py + Math.sin(ang + 2.5) * 12);
  ctx.lineTo(px + Math.cos(ang - 2.5) * 12, py + Math.sin(ang - 2.5) * 12);
  ctx.closePath();
  ctx.fill();
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
  // Anchor the E-prompt above the on-screen player (not a fixed bottom band).
  state.session.promptAnchor = {
    x: stats.x * TILE_PX + 16 - viewCamX,
    y: stats.y * TILE_PX - (baked.player[0]!.height - TILE_PX) - viewCamY,
  };
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
  const indoor = o.state.session.player.getStats().districtId === 'torre-casa';
  // Playtest #30: VIP/Anfitrião — lights every 8th frame indoors; skip steam on VIP.
  const lightMask = indoor ? 7 : 1;
  if ((o.frame & lightMask) === 0) {
    drawFewLights(o.ctx, o.state, o.px, o.py, o.camX, o.camY);
  }
  if (!indoor && (o.frame & 3) === 0) drawRain(o.ctx, o.frame);
  if (!indoor && (o.frame & 3) === 0) drawSteam(o.ctx, o.state, o.camX, o.camY, o.frame);
}

function mapCacheKey(session: GameSession, map: MapDef): string {
  if (map.districtId === 'torre-casa' && session.isVipFloor()) return 'torre-vip';
  return map.districtId;
}

function ensureMapCache(state: ViewState, map: MapDef, baked: Baked): void {
  const key = mapCacheKey(state.session, map);
  if (state.mapCache?.key === key) return;
  let layer = baked.mapLayers.get(key);
  if (!layer) {
    layer = bakeMapLayer(map, baked);
    baked.mapLayers.set(key, layer);
  }
  state.mapCache = { key, layer };
}

/** Bake every district (+ VIP) on boot and keep layers so travel doesn't hitch. */
function prewarmDistricts(session: GameSession, baked: Baked): void {
  const ids: DistrictId[] = ['morro-neon', 'feira-central', 'avenida-odds', 'torre-casa'];
  for (const id of ids) {
    baked.mapLayers.set(id, bakeMapLayer(buildDistrictMap(id), baked));
  }
  baked.mapLayers.set('torre-vip', bakeMapLayer(buildTorreVip(), baked));
  for (const npc of session.npcs) {
    npcAnimSprite(baked, npc, 0);
    npcAnimSprite(baked, npc, 0.5);
  }
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
  const localized = localizeSign(label);
  const key = `${getLocale()}|${localized}|${color}`;
  let img = baked.sign.get(key);
  if (!img) {
    img = bakeSignWithText(localized, color);
    baked.sign.set(key, img);
  }
  return img;
}

/** Draw signs in screen space; clamp so wide EXIT labels stay inside the viewport. */
function drawLiveSigns(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  map: MapDef,
  camX: number,
  camY: number,
  frame = 0,
): void {
  const maxX = map.width * TILE_PX;
  const viewW = state.canvas.width;
  const pad = 8;
  const pulse = 0.85 + 0.15 * Math.sin(frame / 14);
  for (const s of map.signs) {
    const img = signImage(state.baked, s.label, s.color);
    let sx = s.x * TILE_PX;
    // Keep full destination text on-screen (east exits used to clip mid-word).
    if (sx + img.width > maxX - TILE_PX)
      sx = Math.max(TILE_PX, maxX - TILE_PX - img.width);
    let screenX = sx - camX;
    if (screenX + img.width > viewW - pad)
      screenX = Math.max(pad, viewW - pad - img.width);
    if (screenX < pad) screenX = pad;
    ctx.globalAlpha = pulse;
    blitImage(ctx, img, screenX, s.y * TILE_PX - 8 - camY);
    ctx.globalAlpha = 1;
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

function playerAnimSprite(
  baked: Baked,
  anim: ReturnType<ViewState['session']['player']['getAnim']>,
): HTMLCanvasElement {
  const key = `p:${anim.dir}:${anim.mode}:${anim.frame}:${anim.bobY}:${Math.round(anim.squashX * 10)}`;
  let img = baked.npc.get(key);
  if (img) return img;
  img = bakeSprite(makePlayerAnimFrame(anim), CHAR_SCALE);
  baked.npc.set(key, img);
  // Keep a couple of legacy slots warm for any leftover callers.
  baked.player[0] = img;
  return img;
}

function npcAnimSprite(baked: Baked, npc: WorldNpc, timeS: number): HTMLCanvasElement {
  const variant = npc.bodyVariant ?? 0;
  if (npc.id === 'elevator' || npc.id === 'elevator-vip') {
    const frame = Math.floor(timeS * 2) % 2;
    const key = `${npc.id}:${variant}:elev:${frame}`;
    let img = baked.npc.get(key);
    if (img) return img;
    img = bakeSprite(makeNpcSprite(npc.color, frame, npc.id, variant), CHAR_SCALE);
    baked.npc.set(key, img);
    return img;
  }
  const kind = npcIdleKindFor(npc.id);
  const idleFr = npcIdleFrame(kind, timeS + variant * 0.37);
  const key = `${npc.id}:${variant}:${kind}:${idleFr}`;
  let img = baked.npc.get(key);
  if (img) return img;
  img = bakeSprite(
    makeNpcAnimFrame({
      accent: npc.color,
      npcId: npc.id,
      idleKind: kind,
      idleFrame: idleFr,
      bodyVariant: variant,
    }),
    CHAR_SCALE,
  );
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
  const playing = session.ui.is('play');
  // ~60fps assuming draw is called each engine tick.
  if (playing) session.player.tickAnim(1 / 60);
  const playerAnim = session.player.getAnim();
  const bob = 0; // bob baked into character frames
  const view = { ctx, camX, camY, bob, vw: ctx.canvas.width, vh: ctx.canvas.height };
  const items: SortBlit[] = [];
  pushNpcSorts({
    items,
    session,
    baked,
    districtId: stats.districtId,
    frame,
    view,
    playing,
  });
  pushPlayerSort(items, baked, stats, playerAnim, view);
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

function pushNpcSorts(o: {
  items: SortBlit[];
  session: ViewState['session'];
  baked: Baked;
  districtId: string;
  frame: number;
  view: SortView;
  playing: boolean;
}): void {
  const me = o.session.player.getStats();
  const timeS = o.frame / 60;
  for (const npc of o.session.floorNpcs()) {
    if (npc.districtId !== o.districtId) continue;
    const d = Math.hypot(npc.x - me.x, npc.y - me.y);
    // Modal open: only draw nearby NPCs — biggest FPS win on Odds/VIP.
    if (!o.playing && d > 8) continue;
    // Playtest #31: freeze idle bake under skill/dialogue — Augusto P3 FPS.
    const img = npcAnimSprite(o.baked, npc, o.playing ? timeS : 0);
    const near = o.playing && d < 1.35;
    // Step aside + sort behind Rita so a green NPC never sits under her sprite.
    const asideX = near ? (npc.x >= me.x ? 0.55 : -0.55) : 0;
    const drawX = npc.x + asideX;
    o.items.push({
      y: near ? npc.y - 0.08 : npc.y,
      x: drawX,
      draw: () =>
        blitSortedSprite({
          ctx: o.view.ctx,
          img,
          tx: drawX,
          ty: npc.y,
          camX: o.view.camX,
          camY: o.view.camY,
          bob: o.view.bob,
          vw: o.view.vw,
          vh: o.view.vh,
        }),
    });
  }
}

function pushPlayerSort(
  items: SortBlit[],
  baked: Baked,
  stats: { x: number; y: number },
  anim: ReturnType<ViewState['session']['player']['getAnim']>,
  view: SortView,
): void {
  const playerImg = playerAnimSprite(baked, anim);
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
  spr: HTMLCanvasElement | undefined,
  camX: number,
  camY: number,
): void {
  if (!spr) return;
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

/** Feira / avenida steam wisps from stalls and vents. */
function drawSteam(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  camX: number,
  camY: number,
  frame: number,
): void {
  const id = state.session.player.getStats().districtId;
  if (id !== 'feira-central' && id !== 'avenida-odds') return;
  ctx.fillStyle = '#c8d0d844';
  const anchors =
    id === 'feira-central'
      ? [
          { x: 18, y: 14 },
          { x: 26, y: 12 },
          { x: 12, y: 16 },
        ]
      : [
          { x: 20, y: 13 },
          { x: 14, y: 11 },
          { x: 30, y: 14 },
        ];
  for (let i = 0; i < anchors.length; i += 1) {
    const a = anchors[i]!;
    const bob = Math.sin(frame / 18 + i) * 6;
    const sx = a.x * TILE_PX + 8 - camX;
    const sy = a.y * TILE_PX - 10 - camY + bob;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 6 + (i % 2), 10, 0, 0, Math.PI * 2);
    ctx.fill();
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
  const me = state.session.player.getStats();
  if (obj.districtId === me.districtId) {
    const dist = Math.hypot(obj.targetX - me.x, obj.targetY - me.y);
    // Same-room NPC / tower / short hop: pin arrow on the fixed target (no path wander).
    if (dist <= 10 || me.districtId === 'torre-casa') {
      state.marker = {
        x: obj.targetX,
        y: obj.targetY,
        districtId: obj.districtId ?? '',
        // Name stays on the sprite nameplate — never float a second copy mid-path.
        name: '',
        arrowOnly: true,
        npcOwns: Boolean(obj.targetName),
      };
      return;
    }
    const map = state.session.getMap();
    const wp = nextPathWaypoint(
      map,
      { x: me.x, y: me.y },
      { x: obj.targetX, y: obj.targetY },
      5,
    );
    const atTarget = Math.hypot(wp.x - obj.targetX, wp.y - obj.targetY) < 0.6;
    state.marker = {
      x: wp.x,
      y: wp.y,
      districtId: obj.districtId ?? '',
      // Path hops are arrow-only so "Mole Contact" never floats mid-asphalt.
      name: atTarget ? (obj.targetName ?? '') : '',
      arrowOnly: !atTarget,
      npcOwns: atTarget && Boolean(obj.targetName),
    };
    return;
  }
  state.marker = {
    x: obj.targetX,
    y: obj.targetY,
    districtId: obj.districtId ?? '',
    name: obj.targetName ?? '',
    arrowOnly: /Fair|Avenue|Tower|Morro Neon|Elevator|Feira|Avenida|Torre|Elevador/i.test(
      obj.targetName ?? '',
    ),
    npcOwns: false,
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
  const map = state.session.getMap();
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
    signs: map.signs,
    npcNameplateOwns: m.npcOwns,
    arrowOnly: m.arrowOnly,
  });
}

function drawSideMarkers(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  camX: number,
  camY: number,
): void {
  // Dim dots for side quests; VIP elevator gets an arrow pinned to the car (no text).
  const markers = state.session.sideMarkers();
  const obj = state.marker;
  for (const m of markers) {
    if (obj && m.x === obj.x && m.y === obj.y) continue;
    const px = m.x * TILE_PX + 16 - camX;
    const py = m.y * TILE_PX - 6 - camY;
    if (m.label.startsWith('Elevator')) {
      paintBigArrow(ctx, px, py - 12, '#c8d0d8');
      continue;
    }
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
  signs: readonly { x: number; y: number }[];
  /** True when a sprite nameplate already owns this entity's name. */
  npcNameplateOwns: boolean;
  /** Path hop / pad — arrow only, never a floating name. */
  arrowOnly: boolean;
};

/**
 * Playtest #26: never print a second nameplate on the quest arrow.
 * NPC names live only on sprite-attached tags; pads/waypoints stay arrow-only.
 */
function objectiveArrowLabel(m: ObjectiveMark & { onScreen: boolean }): string | null {
  if (!m.label || m.arrowOnly) return null;
  if (/Fair|Avenue|Tower|Morro Neon|Elevator|Feira|Avenida|Torre|Elevador/i.test(m.label))
    return null;
  // Sprite nameplate owns the name — arrow is pointer-only.
  if (m.npcNameplateOwns) return null;
  // Off-screen edge pointer may keep a destination hint for non-NPC targets.
  if (!m.onScreen) return `${m.label} · ${m.distTiles}m`;
  return null;
}

/** Large bouncing yellow arrow; name only when no sprite nameplate owns it. */
function paintObjectiveMarker(m: ObjectiveMark): void {
  const bob = Math.sin(m.frame / 8) * 6;
  const avoid = labelOffsetForSigns({
    tileX: m.tx,
    tileY: m.ty,
    signs: m.signs,
  });
  const rawX = m.tx * TILE_PX + 16 - m.camX;
  const rawY = m.ty * TILE_PX - 18 + bob - m.camY + avoid.dy;
  const margin = 28;
  const onScreen =
    rawX >= margin && rawX <= m.viewW - margin && rawY >= 120 && rawY <= m.viewH - margin;
  const label = objectiveArrowLabel({ ...m, onScreen });
  if (onScreen) {
    paintBigArrow(m.ctx, rawX, rawY, Palette.brasilYellow);
    if (label) paintMarkerLabel(m.ctx, rawX, rawY - 22, label, m.viewW);
    return;
  }
  const px = clamp(rawX, margin, m.viewW - margin);
  const py = clamp(rawY, 120, m.viewH - margin);
  paintBigArrow(m.ctx, px, py, Palette.brasilYellow);
  if (label) paintMarkerLabel(m.ctx, px, py - 22, label, m.viewW);
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
  const viewH = ctx.canvas.height || 540;
  // Keep tags inside the safe HUD inset (top objective / bottom chrome).
  const safePy = Math.min(viewH - 88, Math.max(py, 108));
  const box = layoutMarkerLabel({
    text,
    anchorX: px,
    viewW,
    pad: 16,
    measure: (t) => ctx.measureText(t).width,
  });
  ctx.fillStyle = '#000000dd';
  ctx.fillRect(box.left, safePy - 14, box.width, 20);
  ctx.strokeStyle = Palette.brasilYellow;
  ctx.strokeRect(box.left, safePy - 14, box.width, 20);
  ctx.fillStyle = Palette.brasilYellow;
  ctx.fillText(box.text, box.cx, safePy);
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
