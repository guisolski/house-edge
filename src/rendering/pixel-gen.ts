import { Palette } from '../content/palette';

export type PixelGrid = {
  width: number;
  height: number;
  pixels: string[];
};

type Rect = { x: number; y: number; w: number; h: number };

/** LD-5: readable 3/4 player (~32px tall) with idle bob / walk cycle. */
export function makePlayerSprite(frame = 0): PixelGrid {
  const g = empty(20, 34, 'transparent');
  const bob = frame % 2;
  const y0 = bob;
  // hair / face
  fillRect(g, { x: 6, y: 2 + y0, w: 8, h: 7 }, Palette.brasilYellow);
  fillRect(g, { x: 5, y: 3 + y0, w: 10, h: 2 }, '#c4a020');
  fillRect(g, { x: 7, y: 4 + y0, w: 2, h: 2 }, '#1a1020');
  fillRect(g, { x: 11, y: 4 + y0, w: 2, h: 2 }, '#1a1020');
  if (bob === 0) fillRect(g, { x: 8, y: 7 + y0, w: 4, h: 1 }, '#c45a7a');
  // jacket + sash
  fillRect(g, { x: 4, y: 9 + y0, w: 12, h: 10 }, Palette.neonMagenta);
  fillRect(g, { x: 6, y: 10 + y0, w: 8, h: 3 }, Palette.brasilBlue);
  fillRect(g, { x: 5, y: 14 + y0, w: 10, h: 1 }, Palette.brasilYellow);
  // arms idle sway
  fillRect(g, { x: 2, y: 10 + y0 + bob, w: 2, h: 7 }, Palette.neonMagenta);
  fillRect(g, { x: 16, y: 10 + y0 + (1 - bob), w: 2, h: 7 }, Palette.neonMagenta);
  // legs walk
  const leg = bob;
  fillRect(g, { x: 5 + leg, y: 19 + y0, w: 4, h: 10 }, '#1a2040');
  fillRect(g, { x: 11 - leg, y: 19 + y0, w: 4, h: 10 }, '#1a2040');
  fillRect(g, { x: 5 + leg, y: 28 + y0, w: 4, h: 3 }, '#0a0a12');
  fillRect(g, { x: 11 - leg, y: 28 + y0, w: 4, h: 3 }, '#0a0a12');
  return g;
}

export function makeNpcSprite(accent: string, frame = 0): PixelGrid {
  const g = empty(20, 34, 'transparent');
  const bob = frame % 2;
  const y0 = bob;
  fillRect(g, { x: 6, y: 2 + y0, w: 8, h: 7 }, accent);
  fillRect(g, { x: 7, y: 4 + y0, w: 2, h: bob === 0 ? 2 : 1 }, '#111018');
  fillRect(g, { x: 11, y: 4 + y0, w: 2, h: bob === 0 ? 2 : 1 }, '#111018');
  fillRect(g, { x: 4, y: 9 + y0, w: 12, h: 10 }, Palette.concrete);
  fillRect(g, { x: 5, y: 11 + y0, w: 10, h: 2 }, accent);
  fillRect(g, { x: 2, y: 11 + y0 + bob, w: 2, h: 6 }, Palette.concrete);
  fillRect(g, { x: 16, y: 11 + y0 + (1 - bob), w: 2, h: 6 }, Palette.concrete);
  const leg = bob;
  fillRect(g, { x: 5 + leg, y: 19 + y0, w: 4, h: 10 }, Palette.asphalt);
  fillRect(g, { x: 11 - leg, y: 19 + y0, w: 4, h: 10 }, Palette.asphalt);
  return g;
}

export function makeAsphalt(): PixelGrid {
  const g = empty(16, 16, Palette.wetAsphalt);
  for (let i = 0; i < 16; i += 3) {
    fillRect(g, { x: 0, y: i, w: 16, h: 1 }, Palette.asphalt);
  }
  fillRect(g, { x: 7, y: 0, w: 2, h: 16 }, Palette.asphaltLine);
  for (let i = 0; i < 16; i += 5) {
    fillRect(g, { x: 7, y: i, w: 2, h: 2 }, Palette.brasilYellow);
  }
  fillRect(g, { x: 1, y: 3, w: 1, h: 1 }, '#2a2a40');
  fillRect(g, { x: 14, y: 10, w: 1, h: 1 }, '#101018');
  fillRect(g, { x: 4, y: 12, w: 2, h: 1 }, '#2bfff222');
  return g;
}

export function makeSidewalk(): PixelGrid {
  const g = empty(16, 16, Palette.sidewalk);
  for (let i = 0; i < 16; i += 4) {
    fillRect(g, { x: i, y: 0, w: 1, h: 16 }, Palette.curb);
    fillRect(g, { x: 0, y: i, w: 16, h: 1 }, Palette.curb);
  }
  return g;
}

export function makeAlley(): PixelGrid {
  const g = empty(16, 16, '#0c0c14');
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, Palette.plantDark);
  fillRect(g, { x: 2, y: 2, w: 2, h: 2 }, Palette.neonMagenta);
  fillRect(g, { x: 11, y: 6, w: 3, h: 1 }, Palette.pixo);
  fillRect(g, { x: 4, y: 10, w: 8, h: 1 }, '#2a2040');
  return g;
}

export function makePlaza(): PixelGrid {
  const g = empty(16, 16, '#2a3048');
  // Copacabana wave
  for (let i = 0; i < 16; i += 1) {
    const on = Math.sin((i + 1) / 1.6) > 0;
    fillRect(g, { x: i, y: 0, w: 1, h: 16 }, on ? '#3a4560' : '#1e2438');
  }
  return g;
}

/** Night rooftop / hillside dirt — textured, not bright grass. */
export function makeGrass(): PixelGrid {
  const g = empty(16, 16, Palette.plantDark);
  fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, '#0a2818');
  fillRect(g, { x: 3, y: 5, w: 2, h: 2 }, Palette.plant);
  fillRect(g, { x: 10, y: 11, w: 2, h: 2 }, Palette.plant);
  fillRect(g, { x: 7, y: 2, w: 1, h: 1 }, '#2a5040');
  fillRect(g, { x: 13, y: 7, w: 1, h: 1 }, '#1a4a30');
  fillRect(g, { x: 1, y: 12, w: 2, h: 1 }, '#163828');
  fillRect(g, { x: 8, y: 9, w: 1, h: 1 }, Palette.neonLime);
  return g;
}

export function makeStairs(): PixelGrid {
  const g = empty(16, 16, Palette.concrete);
  for (let i = 0; i < 4; i += 1) {
    fillRect(g, { x: 0, y: i * 4, w: 16, h: 3 }, Palette.curb);
    fillRect(g, { x: 0, y: i * 4 + 3, w: 16, h: 1 }, Palette.wetAsphalt);
  }
  return g;
}

export function makeInterior(): PixelGrid {
  const g = empty(16, 16, '#12101c');
  fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, '#2a1840');
  fillRect(g, { x: 0, y: 8, w: 16, h: 1 }, '#1a1028');
  return g;
}

export function makeBuilding(
  style: number,
  district: 'morro' | 'feira' | 'avenida' | 'torre' = 'morro',
): PixelGrid {
  if (district === 'morro') return favelaHouse(style);
  if (district === 'feira') return stall(style);
  if (district === 'avenida') return glassTower(style);
  return corpBlock(style);
}

function favelaHouse(style: number): PixelGrid {
  const g = empty(40, 48, 'transparent');
  const wall = [Palette.wallWarm, Palette.botecoWood, '#3a2840', '#243040'][style % 4]!;
  // shadow
  fillRect(g, { x: 6, y: 18, w: 32, h: 28 }, Palette.shadow);
  fillRect(g, { x: 4, y: 16, w: 32, h: 28 }, wall);
  // corrugated roof
  fillRect(g, { x: 2, y: 10, w: 36, h: 8 }, Palette.roofPink);
  fillRect(g, { x: 2, y: 12, w: 36, h: 1 }, '#ff4db8');
  fillRect(g, { x: 2, y: 14, w: 36, h: 1 }, '#8a1050');
  // windows
  fillRect(g, { x: 8, y: 22, w: 8, h: 8 }, Palette.windowLit);
  fillRect(g, { x: 22, y: 22, w: 8, h: 8 }, Palette.neonCyan);
  fillRect(g, { x: 14, y: 32, w: 10, h: 12 }, '#100818');
  // antenna
  fillRect(g, { x: 30, y: 2, w: 2, h: 10 }, '#889');
  fillRect(g, { x: 28, y: 2, w: 6, h: 2 }, Palette.neonLime);
  return g;
}

function stall(style: number): PixelGrid {
  const g = empty(40, 40, 'transparent');
  const awning = [
    Palette.brasilYellow,
    Palette.neonMagenta,
    Palette.neonCyan,
    Palette.brasilGreen,
  ][style % 4]!;
  fillRect(g, { x: 4, y: 18, w: 32, h: 18 }, Palette.botecoWood);
  // striped awning
  for (let i = 0; i < 8; i += 1) {
    fillRect(g, { x: 2 + i * 4, y: 8, w: 4, h: 12 }, i % 2 === 0 ? awning : '#1a1020');
  }
  fillRect(g, { x: 10, y: 24, w: 6, h: 6 }, Palette.windowLit);
  fillRect(g, { x: 22, y: 24, w: 6, h: 6 }, Palette.gold);
  return g;
}

function glassTower(style: number): PixelGrid {
  const g = empty(36, 64, 'transparent');
  fillRect(g, { x: 8, y: 8, w: 24, h: 52 }, Palette.concrete);
  fillRect(
    g,
    { x: 6, y: 4, w: 28, h: 6 },
    style % 2 ? Palette.neonCyan : Palette.neonMagenta,
  );
  for (let y = 12; y < 56; y += 6) {
    fillRect(g, { x: 10, y, w: 20, h: 3 }, '#3a80a0');
    fillRect(g, { x: 10, y: y + 2, w: 20, h: 1 }, '#1a3040');
  }
  return g;
}

function corpBlock(style: number): PixelGrid {
  const g = empty(48, 56, 'transparent');
  fillRect(g, { x: 6, y: 12, w: 36, h: 40 }, style % 2 ? '#1a1028' : '#121828');
  fillRect(g, { x: 4, y: 6, w: 40, h: 8 }, Palette.neonMagenta);
  for (let y = 16; y < 48; y += 8) {
    fillRect(g, { x: 10, y, w: 10, h: 5 }, Palette.neonCyan);
    fillRect(g, { x: 28, y, w: 10, h: 5 }, Palette.windowLit);
  }
  fillRect(g, { x: 18, y: 40, w: 12, h: 12 }, '#08060e');
  return g;
}

export function makeNeonSign(labelColor: string): PixelGrid {
  const g = empty(56, 18, 'transparent');
  fillRect(g, { x: 1, y: 1, w: 54, h: 16 }, '#0a1020');
  fillRect(g, { x: 2, y: 2, w: 52, h: 14 }, labelColor);
  fillRect(g, { x: 4, y: 4, w: 48, h: 10 }, '#0a0a18');
  return g;
}

export function makeLandmark(kind: string): PixelGrid {
  const g = empty(40, 72, 'transparent');
  if (kind === 'led-tower' || kind === 'casa-tower') {
    fillRect(g, { x: 12, y: 8, w: 16, h: 60 }, Palette.concrete);
    fillRect(g, { x: 8, y: 2, w: 24, h: 10 }, Palette.neonMagenta);
    for (let y = 16; y < 64; y += 5) {
      fillRect(g, { x: 14, y, w: 12, h: 2 }, Palette.neonCyan);
    }
  } else if (kind === 'glass-corp') {
    fillRect(g, { x: 8, y: 4, w: 24, h: 64 }, '#1a3048');
    fillRect(g, { x: 6, y: 0, w: 28, h: 6 }, Palette.neonCyan);
    for (let y = 10; y < 64; y += 4) {
      fillRect(g, { x: 10, y, w: 20, h: 2 }, '#2a80a0');
    }
  } else {
    // calcadao kiosk cluster
    fillRect(g, { x: 4, y: 40, w: 32, h: 20 }, Palette.botecoWood);
    fillRect(g, { x: 2, y: 28, w: 36, h: 14 }, Palette.brasilYellow);
    fillRect(g, { x: 6, y: 32, w: 8, h: 6 }, Palette.neonMagenta);
    fillRect(g, { x: 24, y: 32, w: 8, h: 6 }, Palette.neonCyan);
  }
  return g;
}

export function makeExitPad(): PixelGrid {
  const g = empty(16, 16, Palette.neonLime);
  fillRect(g, { x: 1, y: 1, w: 14, h: 14 }, Palette.brasilGreen);
  fillRect(g, { x: 5, y: 3, w: 6, h: 10 }, Palette.brasilYellow);
  fillRect(g, { x: 7, y: 5, w: 2, h: 6 }, '#0a0a12');
  return g;
}

export function makeMoto(): PixelGrid {
  const g = empty(24, 16, 'transparent');
  fillRect(g, { x: 4, y: 8, w: 14, h: 4 }, Palette.neonCyan);
  fillRect(g, { x: 2, y: 10, w: 4, h: 4 }, '#222');
  fillRect(g, { x: 16, y: 10, w: 4, h: 4 }, '#222');
  fillRect(g, { x: 10, y: 4, w: 6, h: 5 }, Palette.neonMagenta);
  return g;
}

export function makeKiosk(): PixelGrid {
  const g = empty(24, 24, 'transparent');
  fillRect(g, { x: 4, y: 10, w: 16, h: 12 }, Palette.botecoWood);
  fillRect(g, { x: 2, y: 4, w: 20, h: 8 }, Palette.brasilYellow);
  fillRect(g, { x: 6, y: 12, w: 4, h: 4 }, Palette.windowLit);
  return g;
}

export function makeWire(): PixelGrid {
  const g = empty(32, 8, 'transparent');
  for (let x = 0; x < 32; x += 1) {
    const y = 2 + Math.round(Math.sin(x / 4) * 2);
    fillRect(g, { x, y, w: 1, h: 1 }, '#667');
  }
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
