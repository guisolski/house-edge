import { Palette } from '../content/palette';
import type { GameSession } from '../systems/session';
import {
  makeBoteco,
  makeNeonSign,
  makePlayerSprite,
  makeTileFloor,
  paintGrid,
  type PixelGrid,
} from './pixel-gen';

const TILE = 16;
const SCALE = 3;

export type WorldView = {
  canvas: HTMLCanvasElement;
  draw: () => void;
};

type DrawAssets = {
  player: PixelGrid;
  floors: PixelGrid[];
  props: PixelGrid[];
};

export function createWorldView(session: GameSession): WorldView {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.width = 960;
  canvas.height = 540;
  const assets: DrawAssets = {
    player: makePlayerSprite(),
    floors: [makeTileFloor(0), makeTileFloor(1), makeTileFloor(2)],
    props: [makeBoteco(), makeNeonSign()],
  };
  return {
    canvas,
    draw: () => paintWorld(canvas, session, assets),
  };
}

function paintWorld(
  canvas: HTMLCanvasElement,
  session: GameSession,
  assets: DrawAssets,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const stats = session.player.getStats();
  const district = session.world.get(stats.districtId);
  const accent = district?.accent ?? Palette.neonCyan;
  clearScene(ctx);
  drawTiles(ctx, district?.width ?? 24, district?.height ?? 18, assets.floors);
  drawProps(ctx, assets.props, accent);
  drawActorLayer(ctx, { player: assets.player, x: stats.x, y: stats.y, accent });
}

function drawActorLayer(
  ctx: CanvasRenderingContext2D,
  layer: { player: PixelGrid; x: number; y: number; accent: string },
): void {
  drawLights(ctx, layer.x, layer.y, layer.accent);
  blit(ctx, layer.player, layer.x, layer.y);
  drawRain(ctx);
}

function clearScene(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = Palette.void;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  floors: PixelGrid[],
): void {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      blit(ctx, floors[(x + y) % floors.length]!, x, y);
    }
  }
}

function drawProps(
  ctx: CanvasRenderingContext2D,
  props: PixelGrid[],
  accent: string,
): void {
  blit(ctx, props[0]!, 2, 3);
  blit(ctx, props[1]!, 10, 1);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, ctx.canvas.width, 40);
  ctx.globalAlpha = 1;
}

function blit(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  tx: number,
  ty: number,
): void {
  ctx.save();
  ctx.translate(tx * TILE * SCALE, ty * TILE * SCALE);
  paintGrid(ctx, grid, SCALE);
  ctx.restore();
}

function drawLights(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  accent: string,
): void {
  const cx = x * TILE * SCALE + 20;
  const cy = y * TILE * SCALE + 20;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
  glow.addColorStop(0, `${accent}88`);
  glow.addColorStop(1, '#00000000');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 120, cy - 120, 240, 240);
}

function drawRain(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = Palette.rain;
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 97) % ctx.canvas.width;
    const y = (i * 53 + performance.now() / 8) % ctx.canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y + 10);
    ctx.stroke();
  }
}
