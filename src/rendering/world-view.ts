import { Palette } from '../content/palette';
import type { GameSession } from '../systems/session';
import { createCamera, followPlayer } from '../world/camera';
import { tileAt, type TileKind } from '../world/maps';
import {
  makeAlley,
  makeAsphalt,
  makeBuilding,
  makeExitPad,
  makeGrass,
  makeLandmark,
  makeNeonSign,
  makeNpcSprite,
  makePlayerSprite,
  makePlaza,
  makeSidewalk,
  paintGrid,
  type PixelGrid,
} from './pixel-gen';

const TILE = 16;
const SCALE = 3;
const TILE_PX = TILE * SCALE;

export type WorldView = {
  canvas: HTMLCanvasElement;
  draw: (frame: number) => void;
};

type Assets = {
  tiles: Record<TileKind, PixelGrid>;
  player: PixelGrid[];
  npc: PixelGrid;
  building: PixelGrid[];
  exit: PixelGrid;
  landmark: Map<string, PixelGrid>;
};

export function createWorldView(session: GameSession): WorldView {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.width = 960;
  canvas.height = 540;
  const assets = loadAssets();
  let cam = createCamera();
  return {
    canvas,
    draw: (frame) => {
      cam = paintFrame(canvas, session, assets, cam, frame);
    },
  };
}

function loadAssets(): Assets {
  return {
    tiles: {
      asphalt: makeAsphalt(),
      sidewalk: makeSidewalk(),
      alley: makeAlley(),
      plaza: makePlaza(),
      grass: makeGrass(),
      blocked: makeGrass(),
      exit: makeExitPad(),
    },
    player: [makePlayerSprite(0), makePlayerSprite(1)],
    npc: makeNpcSprite(Palette.neonCyan),
    building: [0, 1, 2, 3].map((s) => makeBuilding(s)),
    exit: makeExitPad(),
    landmark: new Map([
      ['led-tower', makeLandmark('led-tower')],
      ['calcadao', makeLandmark('calcadao')],
      ['glass-corp', makeLandmark('glass-corp')],
      ['casa-tower', makeLandmark('casa-tower')],
    ]),
  };
}

function paintFrame(
  canvas: HTMLCanvasElement,
  session: GameSession,
  assets: Assets,
  camIn: ReturnType<typeof createCamera>,
  frame: number,
): ReturnType<typeof createCamera> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return camIn;
  fitCanvas(canvas);
  const stats = session.player.getStats();
  const map = session.getMap();
  const cam = followPlayer({
    cam: camIn,
    playerX: stats.x,
    playerY: stats.y,
    mapW: map.width,
    mapH: map.height,
    viewW: canvas.width,
    viewH: canvas.height,
    tilePx: TILE_PX,
  });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = Palette.void;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, map, assets);
  drawProps(ctx, session, assets);
  drawActors(ctx, session, assets, frame);
  drawLighting(ctx, session, stats.x, stats.y);
  ctx.restore();
  drawRainScreen(ctx);
  return cam;
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  map: ReturnType<GameSession['getMap']>,
  assets: Assets,
): void {
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const kind = tileAt(map, x, y);
      blit(ctx, assets.tiles[kind], { tx: x, ty: y, yOffset: 0 });
    }
  }
}

function drawProps(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  assets: Assets,
): void {
  const map = session.getMap();
  for (const b of map.buildings) {
    const spr = assets.building[b.style % assets.building.length]!;
    blitRaw(ctx, spr, b.x * TILE_PX, b.y * TILE_PX - 24);
  }
  for (const s of map.signs) {
    blitRaw(ctx, makeNeonSign(s.color), s.x * TILE_PX, s.y * TILE_PX - 20);
  }
  const lm = assets.landmark.get(map.landmark.kind) ?? makeLandmark('led-tower');
  blitRaw(ctx, lm, map.landmark.x * TILE_PX, map.landmark.y * TILE_PX - 40);
  markExits(ctx, session, assets);
}

function markExits(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  assets: Assets,
): void {
  const id = session.player.getStats().districtId;
  for (const exit of session.exits) {
    if (exit.districtId !== id) continue;
    if (!session.world.isUnlocked(exit.toDistrict)) continue;
    blit(ctx, assets.exit, { tx: exit.x, ty: exit.y, yOffset: 0 });
  }
}

function drawActors(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  assets: Assets,
  frame: number,
): void {
  const list = collectActors(ctx, session, assets, frame);
  list.sort((a, b) => a.y - b.y);
  for (const item of list) item.draw();
  drawMarker(ctx, session);
}

function collectActors(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  assets: Assets,
  frame: number,
): { y: number; draw: () => void }[] {
  const stats = session.player.getStats();
  const list: { y: number; draw: () => void }[] = [];
  for (const npc of session.npcs) {
    if (npc.districtId !== stats.districtId) continue;
    list.push({
      y: npc.y,
      draw: () =>
        blit(ctx, makeNpcSprite(npc.color, frame), {
          tx: npc.x,
          ty: npc.y,
          yOffset: -8,
        }),
    });
  }
  list.push({
    y: stats.y,
    draw: () =>
      blit(ctx, assets.player[frame % 2]!, {
        tx: stats.x,
        ty: stats.y,
        yOffset: -8,
      }),
  });
  return list;
}

function drawMarker(ctx: CanvasRenderingContext2D, session: GameSession): void {
  const obj = session.objective();
  if (obj.targetX === undefined || obj.targetY === undefined) return;
  if (obj.districtId !== session.player.getStats().districtId) return;
  const px = obj.targetX * TILE_PX + 16;
  const py = obj.targetY * TILE_PX - 10 + Math.sin(performance.now() / 200) * 4;
  ctx.fillStyle = Palette.brasilYellow;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - 8, py - 14);
  ctx.lineTo(px + 8, py - 14);
  ctx.fill();
}

function drawLighting(
  ctx: CanvasRenderingContext2D,
  session: GameSession,
  px: number,
  py: number,
): void {
  const map = session.getMap();
  for (const s of map.signs) {
    softLight(ctx, {
      x: s.x * TILE_PX + 24,
      y: s.y * TILE_PX,
      color: s.color,
      radius: 140,
    });
  }
  softLight(ctx, {
    x: px * TILE_PX + 20,
    y: py * TILE_PX + 10,
    color: Palette.neonMagenta,
    radius: 110,
  });
  // LT-2 wet sheen
  ctx.fillStyle = '#2bfff214';
  ctx.fillRect(0, 0, map.width * TILE_PX, map.height * TILE_PX);
}

function softLight(
  ctx: CanvasRenderingContext2D,
  light: { x: number; y: number; color: string; radius: number },
): void {
  const g = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, light.radius);
  g.addColorStop(0, `${light.color}99`);
  g.addColorStop(1, '#00000000');
  ctx.fillStyle = g;
  ctx.fillRect(
    light.x - light.radius,
    light.y - light.radius,
    light.radius * 2,
    light.radius * 2,
  );
}

function drawRainScreen(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = Palette.rain;
  ctx.lineWidth = 1;
  for (let i = 0; i < 50; i += 1) {
    const x = (i * 97 + performance.now() / 30) % ctx.canvas.width;
    const y = (i * 53 + performance.now() / 8) % ctx.canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y + 12);
    ctx.stroke();
  }
}

function blit(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  at: { tx: number; ty: number; yOffset: number },
): void {
  blitRaw(ctx, grid, at.tx * TILE_PX, at.ty * TILE_PX + at.yOffset);
}

function fitCanvas(canvas: HTMLCanvasElement): void {
  const parent = canvas.parentElement;
  const w = Math.max(320, parent?.clientWidth ?? window.innerWidth);
  const h = Math.max(240, parent?.clientHeight ?? window.innerHeight);
  if (canvas.width === w && canvas.height === h) return;
  canvas.width = w;
  canvas.height = h;
}

function blitRaw(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  ox: number,
  oy: number,
): void {
  ctx.save();
  ctx.translate(ox, oy);
  paintGrid(ctx, grid, SCALE);
  ctx.restore();
}
