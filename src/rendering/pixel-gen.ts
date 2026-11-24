import { Palette } from '../content/palette';

export type PixelGrid = {
  width: number;
  height: number;
  pixels: string[];
};

type Rect = { x: number; y: number; w: number; h: number };

/** Generate a tiny character sprite (cyberpunk + brasilidade). */
export function makePlayerSprite(): PixelGrid {
  const g = empty(12, 16, 'transparent');
  fillRect(g, { x: 4, y: 2, w: 4, h: 3 }, Palette.brasilYellow);
  fillRect(g, { x: 3, y: 5, w: 6, h: 5 }, Palette.neonMagenta);
  fillRect(g, { x: 3, y: 10, w: 2, h: 5 }, Palette.brasilBlue);
  fillRect(g, { x: 7, y: 10, w: 2, h: 5 }, Palette.brasilBlue);
  fillRect(g, { x: 4, y: 3, w: 1, h: 1 }, '#111');
  fillRect(g, { x: 7, y: 3, w: 1, h: 1 }, '#111');
  return g;
}

export function makeNpcSprite(accent: string): PixelGrid {
  const g = empty(12, 16, 'transparent');
  fillRect(g, { x: 4, y: 2, w: 4, h: 3 }, accent);
  fillRect(g, { x: 3, y: 5, w: 6, h: 5 }, Palette.concrete);
  fillRect(g, { x: 3, y: 10, w: 2, h: 5 }, Palette.asphalt);
  fillRect(g, { x: 7, y: 10, w: 2, h: 5 }, Palette.asphalt);
  return g;
}

export function makeTileFloor(variant: number): PixelGrid {
  const g = empty(16, 16, Palette.asphalt);
  if (variant % 3 === 0) paintCalcadao(g);
  else if (variant % 3 === 1) paintPixo(g);
  else paintTropical(g);
  return g;
}

export function makeNeonSign(): PixelGrid {
  const g = empty(24, 10, 'transparent');
  fillRect(g, { x: 1, y: 2, w: 22, h: 6 }, Palette.brasilBlue);
  fillRect(g, { x: 2, y: 3, w: 20, h: 4 }, Palette.neonCyan);
  return g;
}

export function makeBoteco(): PixelGrid {
  const g = empty(24, 20, 'transparent');
  fillRect(g, { x: 2, y: 6, w: 20, h: 14 }, Palette.botecoWood);
  fillRect(g, { x: 4, y: 8, w: 6, h: 6 }, Palette.neonLime);
  fillRect(g, { x: 14, y: 8, w: 6, h: 6 }, Palette.ipêPink);
  fillRect(g, { x: 8, y: 2, w: 8, h: 4 }, Palette.brasilGreen);
  return g;
}

export function gridToCanvas(grid: PixelGrid, scale = 4): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = grid.width * scale;
  canvas.height = grid.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  paintGrid(ctx, grid, scale);
  return canvas;
}

export function paintGrid(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  scale: number,
): void {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.pixels[y * grid.width + x] ?? 'transparent';
      if (color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

function empty(width: number, height: number, fill: string): PixelGrid {
  return {
    width,
    height,
    pixels: Array.from({ length: width * height }, () => fill),
  };
}

function fillRect(grid: PixelGrid, rect: Rect, color: string): void {
  for (let yy = rect.y; yy < rect.y + rect.h; yy += 1) {
    for (let xx = rect.x; xx < rect.x + rect.w; xx += 1) {
      setPixel(grid, xx, yy, color);
    }
  }
}

function setPixel(grid: PixelGrid, x: number, y: number, color: string): void {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return;
  grid.pixels[y * grid.width + x] = color;
}

function paintCalcadao(g: PixelGrid): void {
  for (let i = 0; i < g.width; i += 1) {
    const wave = Math.sin(i / 2) > 0;
    fillRect(g, { x: i, y: 0, w: 1, h: g.height }, wave ? '#d9d2c5' : '#2a2a38');
  }
}

function paintPixo(g: PixelGrid): void {
  fillRect(g, { x: 2, y: 2, w: 3, h: 2 }, Palette.pixo);
  fillRect(g, { x: 8, y: 10, w: 4, h: 2 }, Palette.neonMagenta);
  fillRect(g, { x: 5, y: 6, w: 2, h: 2 }, Palette.brasilYellow);
}

function paintTropical(g: PixelGrid): void {
  fillRect(g, { x: 6, y: 4, w: 2, h: 8 }, Palette.tropicalLeaf);
  fillRect(g, { x: 4, y: 4, w: 6, h: 2 }, Palette.ipêPink);
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, Palette.brasilGreen);
}
