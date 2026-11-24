import { Palette } from '../content/palette';

export type PixelGrid = {
  width: number;
  height: number;
  pixels: string[];
};

type Rect = { x: number; y: number; w: number; h: number };

/** LD-5: larger readable player (3/4). */
export function makePlayerSprite(frame = 0): PixelGrid {
  const g = empty(16, 24, 'transparent');
  fillRect(g, { x: 5, y: 2, w: 6, h: 5 }, Palette.brasilYellow);
  fillRect(g, { x: 6, y: 3, w: 1, h: 1 }, '#111');
  fillRect(g, { x: 9, y: 3, w: 1, h: 1 }, '#111');
  fillRect(g, { x: 4, y: 7, w: 8, h: 8 }, Palette.neonMagenta);
  fillRect(g, { x: 5, y: 8, w: 6, h: 2 }, Palette.brasilBlue);
  const leg = frame % 2 === 0 ? 0 : 1;
  fillRect(g, { x: 4 + leg, y: 15, w: 3, h: 8 }, Palette.brasilBlue);
  fillRect(g, { x: 9 - leg, y: 15, w: 3, h: 8 }, Palette.brasilBlue);
  return g;
}

export function makeNpcSprite(accent: string, frame = 0): PixelGrid {
  const g = empty(16, 24, 'transparent');
  fillRect(g, { x: 5, y: 2, w: 6, h: 5 }, accent);
  fillRect(g, { x: 6, y: 3, w: 1, h: 1 }, '#111');
  fillRect(g, { x: 9, y: 3, w: 1, h: 1 }, '#111');
  fillRect(g, { x: 4, y: 7, w: 8, h: 8 }, Palette.concrete);
  const leg = frame % 2;
  fillRect(g, { x: 4 + leg, y: 15, w: 3, h: 8 }, Palette.asphalt);
  fillRect(g, { x: 9 - leg, y: 15, w: 3, h: 8 }, Palette.asphalt);
  return g;
}

export function makeAsphalt(): PixelGrid {
  const g = empty(16, 16, Palette.asphalt);
  fillRect(g, { x: 7, y: 0, w: 2, h: 16 }, '#2a2a38');
  for (let i = 0; i < 16; i += 4) {
    fillRect(g, { x: 7, y: i, w: 2, h: 2 }, Palette.brasilYellow);
  }
  return g;
}

export function makeSidewalk(): PixelGrid {
  const g = empty(16, 16, '#cfc7b8');
  for (let i = 0; i < 16; i += 1) {
    const wave = Math.sin(i / 2.2) > 0;
    fillRect(g, { x: i, y: 0, w: 1, h: 16 }, wave ? '#ebe4d6' : '#3a3a48');
  }
  return g;
}

export function makeAlley(): PixelGrid {
  const g = empty(16, 16, '#101018');
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, Palette.brasilGreen);
  fillRect(g, { x: 3, y: 3, w: 2, h: 2 }, Palette.neonMagenta);
  fillRect(g, { x: 10, y: 8, w: 3, h: 1 }, Palette.pixo);
  return g;
}

export function makePlaza(): PixelGrid {
  const g = empty(16, 16, '#d9d2c5');
  for (let i = 0; i < 16; i += 1) {
    const on = Math.sin((i + 2) / 1.8) > 0;
    fillRect(g, { x: i, y: 0, w: 1, h: 16 }, on ? '#f0ebe0' : '#2a3550');
  }
  return g;
}

export function makeGrass(): PixelGrid {
  const g = empty(16, 16, Palette.tropicalLeaf);
  fillRect(g, { x: 4, y: 4, w: 3, h: 3 }, Palette.ipêPink);
  fillRect(g, { x: 10, y: 9, w: 2, h: 2 }, Palette.brasilYellow);
  return g;
}

/** 3/4 building: front facade + roof band (LD-5). */
export function makeBuilding(style: number): PixelGrid {
  const g = empty(48, 48, 'transparent');
  const wall = [Palette.botecoWood, Palette.concrete, Palette.brasilBlue, '#3a2040'][
    style % 4
  ]!;
  fillRect(g, { x: 4, y: 16, w: 40, h: 28 }, wall);
  fillRect(g, { x: 2, y: 10, w: 44, h: 8 }, Palette.neonMagenta);
  fillRect(g, { x: 8, y: 20, w: 10, h: 10 }, Palette.neonCyan);
  fillRect(g, { x: 28, y: 20, w: 10, h: 10 }, Palette.neonLime);
  fillRect(g, { x: 18, y: 30, w: 12, h: 14 }, '#1a1020');
  return g;
}

export function makeNeonSign(labelColor: string): PixelGrid {
  const g = empty(48, 16, 'transparent');
  fillRect(g, { x: 2, y: 2, w: 44, h: 12 }, Palette.brasilBlue);
  fillRect(g, { x: 4, y: 4, w: 40, h: 8 }, labelColor);
  return g;
}

export function makeLandmark(kind: string): PixelGrid {
  const g = empty(32, 64, 'transparent');
  if (kind === 'led-tower' || kind === 'casa-tower' || kind === 'glass-corp') {
    fillRect(g, { x: 10, y: 8, w: 12, h: 52 }, Palette.concrete);
    fillRect(g, { x: 8, y: 4, w: 16, h: 8 }, Palette.neonCyan);
    for (let y = 14; y < 56; y += 6) {
      fillRect(g, { x: 12, y, w: 8, h: 3 }, Palette.neonMagenta);
    }
  } else {
    fillRect(g, { x: 0, y: 48, w: 32, h: 12 }, '#d9d2c5');
    fillRect(g, { x: 4, y: 20, w: 24, h: 28 }, Palette.brasilYellow);
  }
  return g;
}

export function makeExitPad(): PixelGrid {
  const g = empty(16, 16, Palette.neonLime);
  fillRect(g, { x: 2, y: 2, w: 12, h: 12 }, Palette.brasilGreen);
  fillRect(g, { x: 6, y: 4, w: 4, h: 8 }, Palette.brasilYellow);
  return g;
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
      if (xx < 0 || yy < 0 || xx >= grid.width || yy >= grid.height) continue;
      grid.pixels[yy * grid.width + xx] = color;
    }
  }
}
