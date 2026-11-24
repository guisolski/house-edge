import { Palette } from '../content/palette';

export type PixelGrid = {
  width: number;
  height: number;
  pixels: string[];
};

type Rect = { x: number; y: number; w: number; h: number };

export type TileDistrict = 'morro' | 'feira' | 'avenida' | 'torre' | 'default';

/** LD-5: readable 3/4 player (~40px tall) with idle bob / walk cycle. */
export function makePlayerSprite(frame = 0): PixelGrid {
  const g = empty(22, 38, 'transparent');
  const bob = frame % 2;
  const y0 = bob;
  // hair / face
  fillRect(g, { x: 7, y: 2 + y0, w: 8, h: 8 }, Palette.brasilYellow);
  fillRect(g, { x: 6, y: 3 + y0, w: 10, h: 2 }, '#c4a020');
  fillRect(g, { x: 8, y: 5 + y0, w: 2, h: 2 }, '#1a1020');
  fillRect(g, { x: 12, y: 5 + y0, w: 2, h: 2 }, '#1a1020');
  if (bob === 0) fillRect(g, { x: 9, y: 8 + y0, w: 4, h: 1 }, '#c45a7a');
  fillRect(g, { x: 5, y: 10 + y0, w: 13, h: 11 }, Palette.neonMagenta);
  fillRect(g, { x: 7, y: 11 + y0, w: 9, h: 4 }, Palette.brasilBlue);
  fillRect(g, { x: 6, y: 15 + y0, w: 11, h: 1 }, Palette.brasilYellow);
  fillRect(g, { x: 2, y: 11 + y0 + bob, w: 3, h: 8 }, Palette.neonMagenta);
  fillRect(g, { x: 17, y: 11 + y0 + (1 - bob), w: 3, h: 8 }, Palette.neonMagenta);
  const leg = bob;
  fillRect(g, { x: 6 + leg, y: 21 + y0, w: 4, h: 11 }, '#1a2040');
  fillRect(g, { x: 12 - leg, y: 21 + y0, w: 4, h: 11 }, '#1a2040');
  fillRect(g, { x: 6 + leg, y: 31 + y0, w: 4, h: 4 }, '#0a0a12');
  fillRect(g, { x: 12 - leg, y: 31 + y0, w: 4, h: 4 }, '#0a0a12');
  return g;
}

function paintNpcHead(
  g: PixelGrid,
  accent: string,
  npcId: string | undefined,
  headY: number,
  y0: number,
): void {
  if (npcId === 'dona-nair') {
    fillRect(g, { x: 6, y: headY + y0, w: 10, h: 3 }, '#1faa5a');
    fillRect(g, { x: 7, y: headY + 3 + y0, w: 8, h: 7 }, accent);
    return;
  }
  if (npcId === 'capita') {
    fillRect(g, { x: 5, y: headY + y0, w: 12, h: 4 }, '#1a2810');
    fillRect(g, { x: 7, y: headY + 3 + y0, w: 8, h: 6 }, accent);
    return;
  }
  if (npcId === 'luna' || npcId === 'luna-feira') {
    fillRect(g, { x: 6, y: headY + y0, w: 10, h: 9 }, '#141828');
    fillRect(g, { x: 8, y: headY + 2 + y0, w: 6, h: 5 }, accent);
    return;
  }
  if (npcId === 'ceo') {
    fillRect(g, { x: 7, y: headY + y0, w: 8, h: 7 }, '#2a1020');
    fillRect(g, { x: 6, y: headY + 1 + y0, w: 10, h: 2 }, '#1a0818');
    return;
  }
  fillRect(g, { x: 7, y: headY + y0, w: 8, h: 7 }, accent);
}

function npcCoat(npcId: string | undefined): string {
  if (npcId === 'margin') return '#1a2048';
  if (npcId === 'ceo') return '#1a1020';
  return Palette.concrete;
}

type NpcLayout = { tall: boolean; headY: number; bodyY: number; legY: number };

function npcLayout(npcId: string | undefined): NpcLayout {
  const tall = npcId === 'seu-ze' || npcId === 'ceo';
  return { tall, headY: tall ? 1 : 2, bodyY: tall ? 11 : 10, legY: tall ? 23 : 21 };
}

function paintNpcBody(
  g: PixelGrid,
  accent: string,
  npcId: string | undefined,
  layout: NpcLayout,
  y0: number,
  bob: number,
): void {
  const coat = npcCoat(npcId);
  const h = layout.tall ? 12 : 10;
  fillRect(g, { x: 5, y: layout.bodyY + y0, w: 13, h }, coat);
  fillRect(g, { x: 6, y: layout.bodyY + 2 + y0, w: 11, h: 2 }, accent);
  fillRect(g, { x: 2, y: layout.bodyY + 1 + y0 + bob, w: 3, h: 7 }, coat);
  fillRect(g, { x: 17, y: layout.bodyY + 1 + y0 + (1 - bob), w: 3, h: 7 }, coat);
  fillRect(g, { x: 6 + bob, y: layout.legY + y0, w: 4, h }, Palette.asphalt);
  fillRect(g, { x: 12 - bob, y: layout.legY + y0, w: 4, h }, Palette.asphalt);
  if (npcId === 'bia')
    fillRect(g, { x: 5, y: layout.bodyY - 1 + y0, w: 13, h: 2 }, Palette.neonMagenta);
}

export function makeNpcSprite(accent: string, frame = 0, npcId?: string): PixelGrid {
  const layout = npcLayout(npcId);
  const g = empty(22, layout.tall ? 42 : 38, 'transparent');
  const bob = frame % 2;
  const y0 = bob;

  paintNpcHead(g, accent, npcId, layout.headY, y0);
  fillRect(g, { x: 8, y: layout.headY + 4 + y0, w: 2, h: bob === 0 ? 2 : 1 }, '#111018');
  fillRect(g, { x: 12, y: layout.headY + 4 + y0, w: 2, h: bob === 0 ? 2 : 1 }, '#111018');
  paintNpcBody(g, accent, npcId, layout, y0, bob);
  if (npcId === 'seu-ze')
    fillRect(g, { x: 8, y: layout.headY - 1 + y0, w: 6, h: 2 }, '#4a3820');
  return g;
}

const ASPHALT_BASE: Record<TileDistrict, string> = {
  morro: '#141420',
  feira: '#1a1a28',
  avenida: '#101828',
  torre: '#281820',
  default: Palette.wetAsphalt,
};

function paintAsphaltVariant(g: PixelGrid, variant: TileDistrict): void {
  if (variant === 'morro') {
    fillRect(g, { x: 3, y: 8, w: 5, h: 2 }, '#2bfff244');
    fillRect(g, { x: 12, y: 4, w: 3, h: 1 }, '#ff2bd633');
    return;
  }
  if (variant === 'avenida') {
    fillRect(g, { x: 2, y: 2, w: 12, h: 1 }, '#2bfff222');
    fillRect(g, { x: 0, y: 10, w: 16, h: 1 }, '#4a6cff22');
    return;
  }
  if (variant === 'torre') {
    fillRect(g, { x: 2, y: 2, w: 3, h: 1 }, '#ffdf0044');
    fillRect(g, { x: 10, y: 12, w: 4, h: 1 }, '#ff2bd633');
    return;
  }
  fillRect(g, { x: 4, y: 12, w: 2, h: 1 }, '#2bfff222');
}

export function makeAsphalt(variant: TileDistrict = 'default'): PixelGrid {
  const g = empty(16, 16, ASPHALT_BASE[variant]);
  for (let i = 0; i < 16; i += 3) {
    fillRect(g, { x: 0, y: i, w: 16, h: 1 }, Palette.asphalt);
  }
  fillRect(g, { x: 7, y: 0, w: 2, h: 16 }, Palette.asphaltLine);
  for (let i = 0; i < 16; i += 5) {
    fillRect(g, { x: 7, y: i, w: 2, h: 2 }, Palette.brasilYellow);
  }
  fillRect(g, { x: 1, y: 3, w: 1, h: 1 }, '#2a2a40');
  fillRect(g, { x: 14, y: 10, w: 1, h: 1 }, '#101018');
  paintAsphaltVariant(g, variant);
  return g;
}

export function makeSidewalk(variant: TileDistrict = 'default'): PixelGrid {
  const base =
    variant === 'feira'
      ? '#32303a'
      : variant === 'avenida'
        ? '#2a3048'
        : Palette.sidewalk;
  const g = empty(16, 16, base);
  for (let i = 0; i < 16; i += 4) {
    fillRect(g, { x: i, y: 0, w: 1, h: 16 }, Palette.curb);
    fillRect(g, { x: 0, y: i, w: 16, h: 1 }, Palette.curb);
  }
  if (variant === 'feira') {
    fillRect(g, { x: 3, y: 3, w: 2, h: 2 }, '#fff3');
    fillRect(g, { x: 10, y: 11, w: 2, h: 2 }, '#fff3');
  }
  return g;
}

export function makeAlley(variant: TileDistrict = 'default'): PixelGrid {
  const g = empty(16, 16, variant === 'torre' ? '#180c18' : '#0c0c14');
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, Palette.plantDark);
  fillRect(
    g,
    { x: 2, y: 2, w: 2, h: 2 },
    variant === 'morro' ? Palette.neonMagenta : '#334',
  );
  fillRect(g, { x: 11, y: 6, w: 3, h: 1 }, Palette.pixo);
  fillRect(g, { x: 4, y: 10, w: 8, h: 1 }, '#2a2040');
  if (variant === 'morro') {
    for (let x = 0; x < 16; x += 4) {
      fillRect(g, { x, y: 1, w: 1, h: 12 }, '#445');
    }
  }
  return g;
}

function makeFeiraPlaza(): PixelGrid {
  // Soft cobble — avoid barcode stripes that wash out UI text.
  const g = empty(16, 16, '#1c1c28');
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      fillRect(g, { x, y, w: 3, h: 3 }, '#282838');
      fillRect(g, { x: x + 1, y: y + 1, w: 1, h: 1 }, '#3a3a4a');
    }
  }
  fillRect(g, { x: 0, y: 7, w: 16, h: 1 }, '#2bfff222');
  return g;
}

const PLAZA_BASE: Record<TileDistrict, string> = {
  morro: '#241c30',
  feira: '#e8e8ec',
  avenida: '#2a3048',
  torre: '#2a1428',
  default: '#2a3048',
};

export function makePlaza(variant: TileDistrict = 'default'): PixelGrid {
  if (variant === 'feira') return makeFeiraPlaza();
  const g = empty(16, 16, PLAZA_BASE[variant]);
  const torre = variant === 'torre';
  for (let i = 0; i < 16; i += 1) {
    const on = Math.sin((i + 1) / 1.6) > 0;
    fillRect(
      g,
      { x: i, y: 0, w: 1, h: 16 },
      on ? (torre ? '#3a2038' : '#3a4560') : torre ? '#1a0c18' : '#1e2438',
    );
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

export function makeBlocked(variant: TileDistrict = 'default'): PixelGrid {
  const g = empty(16, 16, '#0a0810');
  const brick =
    variant === 'torre' ? '#1a1020' : variant === 'morro' ? '#2a2830' : '#181620';
  for (let y = 0; y < 16; y += 4) {
    fillRect(g, { x: 0, y, w: 16, h: 3 }, brick);
    fillRect(g, { x: 0, y: y + 3, w: 16, h: 1 }, '#0a0814');
  }
  if (variant === 'torre') {
    fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, Palette.gold);
    fillRect(g, { x: 0, y: 15, w: 16, h: 1 }, Palette.gold);
  } else if (variant === 'morro') {
    fillRect(g, { x: 1, y: 2, w: 14, h: 1 }, '#667');
  }
  return g;
}

export function makeStairs(variant: TileDistrict = 'default'): PixelGrid {
  const g = empty(16, 16, variant === 'morro' ? '#3a3848' : Palette.concrete);
  for (let i = 0; i < 4; i += 1) {
    fillRect(g, { x: 0, y: i * 4, w: 16, h: 3 }, Palette.curb);
    fillRect(g, { x: 0, y: i * 4 + 3, w: 16, h: 1 }, Palette.wetAsphalt);
  }
  return g;
}

export function makeInterior(variant: TileDistrict = 'default'): PixelGrid {
  const g = empty(16, 16, variant === 'torre' ? '#160c18' : '#12101c');
  fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, variant === 'torre' ? '#4a2040' : '#2a1840');
  fillRect(g, { x: 0, y: 8, w: 16, h: 1 }, '#1a1028');
  if (variant === 'torre') {
    for (let x = 2; x < 14; x += 5) {
      fillRect(g, { x, y: 3, w: 2, h: 2 }, '#ff2bd633');
    }
  }
  return g;
}

/** Victory street party above the ending copy. */
export function makeEndingScene(): PixelGrid {
  const g = empty(280, 96, Palette.nightSky);
  fillRect(g, { x: 0, y: 60, w: 280, h: 36 }, Palette.wetAsphalt);
  for (let x = 0; x < 280; x += 14) {
    fillRect(g, { x, y: 72, w: 6, h: 2 }, Palette.brasilYellow);
  }
  for (let i = 0; i < 8; i += 1) {
    const bx = 12 + i * 34;
    fillRect(g, { x: bx, y: 22, w: 22, h: 38 }, Palette.wallWarm);
    fillRect(g, { x: bx - 2, y: 16, w: 26, h: 8 }, Palette.roofPink);
    fillRect(g, { x: bx + 5, y: 30, w: 6, h: 6 }, Palette.windowLit);
  }
  fillRect(g, { x: 108, y: 44, w: 64, h: 18 }, Palette.neonMagenta);
  fillRect(g, { x: 112, y: 48, w: 56, h: 10 }, '#0a0a18');
  fillRect(g, { x: 118, y: 50, w: 44, h: 6 }, Palette.brasilYellow);
  for (let i = 0; i < 6; i += 1) {
    const px = 40 + i * 42;
    fillRect(g, { x: px, y: 48, w: 8, h: 12 }, Palette.neonCyan);
    fillRect(g, { x: px + 1, y: 46, w: 6, h: 4 }, Palette.brasilYellow);
  }
  fillRect(g, { x: 0, y: 0, w: 280, h: 8 }, Palette.neonMagenta);
  fillRect(g, { x: 0, y: 10, w: 280, h: 4 }, Palette.neonCyan);
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
  const g = empty(40, 52, 'transparent');
  const wall = [Palette.wallWarm, Palette.botecoWood, '#3a2840', '#243040'][style % 4]!;
  const roof = [Palette.roofPink, Palette.roofCyan, '#c45818', '#6a2a80'][style % 4]!;
  // drop shadow
  fillRect(g, { x: 8, y: 22, w: 30, h: 28 }, Palette.shadow);
  // 3/4 front facade
  fillRect(g, { x: 4, y: 18, w: 28, h: 30 }, wall);
  fillRect(g, { x: 4, y: 18, w: 2, h: 30 }, '#00000055');
  // side face (depth)
  fillRect(g, { x: 32, y: 20, w: 6, h: 28 }, '#00000066');
  for (let i = 0; i < 7; i += 1) {
    fillRect(g, { x: 32, y: 22 + i * 4, w: 6, h: 1 }, '#ffffff11');
  }
  // corrugated roof (angled 3/4)
  fillRect(g, { x: 2, y: 10, w: 34, h: 10 }, roof);
  fillRect(g, { x: 30, y: 12, w: 8, h: 8 }, roof);
  for (let i = 0; i < 8; i += 1) {
    fillRect(g, { x: 2, y: 11 + i, w: 34, h: 1 }, i % 2 ? '#ffffff22' : '#00000033');
  }
  // windows + glow
  fillRect(g, { x: 8, y: 24, w: 7, h: 7 }, Palette.windowLit);
  fillRect(g, { x: 9, y: 25, w: 5, h: 5 }, '#ffe8a0');
  fillRect(g, { x: 20, y: 24, w: 7, h: 7 }, Palette.neonCyan);
  fillRect(g, { x: 21, y: 25, w: 5, h: 5 }, '#a0fff8');
  // door
  fillRect(g, { x: 14, y: 34, w: 8, h: 14 }, '#100818');
  fillRect(g, { x: 19, y: 40, w: 2, h: 2 }, Palette.gold);
  // water tank + antenna on roof
  if (style % 2 === 0) {
    fillRect(g, { x: 8, y: 4, w: 10, h: 8 }, '#4a6070');
    fillRect(g, { x: 9, y: 5, w: 8, h: 2 }, '#7ab');
  }
  fillRect(g, { x: 28, y: 2, w: 2, h: 10 }, '#889');
  fillRect(g, { x: 26, y: 2, w: 6, h: 2 }, Palette.neonLime);
  return g;
}

function stall(style: number): PixelGrid {
  const g = empty(44, 44, 'transparent');
  const awning = [
    Palette.brasilYellow,
    Palette.neonMagenta,
    Palette.neonCyan,
    Palette.brasilGreen,
  ][style % 4]!;
  // drop shadow
  fillRect(g, { x: 10, y: 24, w: 30, h: 16 }, Palette.shadow);
  // counter / booth body
  fillRect(g, { x: 4, y: 20, w: 28, h: 18 }, Palette.botecoWood);
  fillRect(g, { x: 4, y: 20, w: 2, h: 18 }, '#00000055');
  // side depth face
  fillRect(g, { x: 32, y: 22, w: 6, h: 16 }, '#00000066');
  // striped awning (3/4)
  for (let i = 0; i < 8; i += 1) {
    fillRect(g, { x: 2 + i * 4, y: 8, w: 4, h: 14 }, i % 2 === 0 ? awning : '#1a1020');
  }
  fillRect(g, { x: 30, y: 10, w: 8, h: 12 }, awning);
  // poles
  fillRect(g, { x: 5, y: 20, w: 2, h: 4 }, '#889');
  fillRect(g, { x: 29, y: 20, w: 2, h: 4 }, '#889');
  // goods / windows
  fillRect(g, { x: 10, y: 26, w: 6, h: 6 }, Palette.windowLit);
  fillRect(g, { x: 20, y: 26, w: 6, h: 6 }, Palette.gold);
  return g;
}

function glassTower(style: number): PixelGrid {
  const g = empty(40, 68, 'transparent');
  fillRect(g, { x: 14, y: 14, w: 22, h: 50 }, Palette.shadow);
  fillRect(g, { x: 6, y: 10, w: 24, h: 52 }, Palette.concrete);
  fillRect(g, { x: 30, y: 12, w: 6, h: 50 }, '#00000066');
  fillRect(
    g,
    { x: 4, y: 4, w: 28, h: 8 },
    style % 2 ? Palette.neonCyan : Palette.neonMagenta,
  );
  fillRect(
    g,
    { x: 30, y: 6, w: 8, h: 6 },
    style % 2 ? Palette.neonCyan : Palette.neonMagenta,
  );
  for (let y = 14; y < 56; y += 6) {
    fillRect(g, { x: 8, y, w: 20, h: 3 }, '#3a80a0');
    fillRect(g, { x: 8, y: y + 2, w: 20, h: 1 }, '#1a3040');
  }
  fillRect(g, { x: 14, y: 50, w: 8, h: 12 }, '#08060e');
  return g;
}

function corpBlock(style: number): PixelGrid {
  const g = empty(52, 60, 'transparent');
  fillRect(g, { x: 12, y: 18, w: 36, h: 38 }, Palette.shadow);
  fillRect(g, { x: 4, y: 12, w: 36, h: 40 }, style % 2 ? '#1a1028' : '#121828');
  fillRect(g, { x: 40, y: 14, w: 6, h: 38 }, '#00000066');
  fillRect(g, { x: 2, y: 6, w: 40, h: 8 }, Palette.neonMagenta);
  fillRect(g, { x: 40, y: 8, w: 8, h: 6 }, Palette.neonMagenta);
  for (let y = 16; y < 48; y += 8) {
    fillRect(g, { x: 8, y, w: 10, h: 5 }, Palette.neonCyan);
    fillRect(g, { x: 26, y, w: 10, h: 5 }, Palette.windowLit);
  }
  fillRect(g, { x: 16, y: 40, w: 12, h: 12 }, '#08060e');
  return g;
}

export function makeNeonSign(labelColor: string): PixelGrid {
  const g = empty(64, 22, 'transparent');
  fillRect(g, { x: 1, y: 1, w: 62, h: 20 }, '#0a1020');
  fillRect(g, { x: 2, y: 2, w: 60, h: 18 }, labelColor);
  fillRect(g, { x: 2, y: 2, w: 60, h: 2 }, '#ffffff44');
  fillRect(g, { x: 4, y: 5, w: 56, h: 12 }, '#0a0a18');
  fillRect(g, { x: 4, y: 17, w: 56, h: 1 }, labelColor);
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

/** Glowing stairwell / door exit — not a green placeholder rect. */
export function makeExitPad(): PixelGrid {
  const g = empty(16, 16, '#081018');
  // door frame
  fillRect(g, { x: 3, y: 1, w: 10, h: 7 }, Palette.neonMagenta);
  fillRect(g, { x: 4, y: 2, w: 8, h: 5 }, '#1a0a20');
  fillRect(g, { x: 5, y: 3, w: 6, h: 4 }, '#ffe08a');
  fillRect(g, { x: 6, y: 4, w: 4, h: 2 }, '#fff6c0');
  // ascending stairs toward the door
  fillRect(g, { x: 1, y: 13, w: 14, h: 2 }, '#1a4058');
  fillRect(g, { x: 2, y: 11, w: 12, h: 2 }, Palette.neonCyan);
  fillRect(g, { x: 3, y: 9, w: 10, h: 2 }, '#1a4058');
  fillRect(g, { x: 4, y: 8, w: 8, h: 1 }, Palette.neonCyan);
  fillRect(g, { x: 0, y: 15, w: 16, h: 1 }, '#2bfff266');
  return g;
}

export function makeWaterTank(): PixelGrid {
  const g = empty(20, 22, 'transparent');
  fillRect(g, { x: 4, y: 6, w: 12, h: 14 }, '#3a5060');
  fillRect(g, { x: 5, y: 7, w: 10, h: 3 }, '#6a90a0');
  fillRect(g, { x: 5, y: 12, w: 10, h: 1 }, '#2a3848');
  fillRect(g, { x: 8, y: 2, w: 4, h: 5 }, '#556');
  fillRect(g, { x: 7, y: 1, w: 6, h: 2 }, Palette.neonCyan);
  return g;
}

export function makeStreetLamp(): PixelGrid {
  const g = empty(12, 28, 'transparent');
  fillRect(g, { x: 5, y: 8, w: 2, h: 18 }, '#445');
  fillRect(g, { x: 2, y: 4, w: 8, h: 5 }, '#1a2030');
  fillRect(g, { x: 3, y: 5, w: 6, h: 3 }, Palette.brasilYellow);
  fillRect(g, { x: 4, y: 6, w: 4, h: 1 }, '#fff6');
  return g;
}

export function makeCrate(): PixelGrid {
  const g = empty(14, 12, 'transparent');
  fillRect(g, { x: 1, y: 2, w: 12, h: 9 }, Palette.botecoWood);
  fillRect(g, { x: 1, y: 2, w: 12, h: 2 }, '#6a4830');
  fillRect(g, { x: 1, y: 6, w: 12, h: 1 }, '#2a1810');
  fillRect(g, { x: 6, y: 3, w: 2, h: 7 }, '#3a2818');
  return g;
}

export function makeMoto(): PixelGrid {
  const g = empty(28, 20, 'transparent');
  fillRect(g, { x: 4, y: 10, w: 18, h: 5 }, Palette.neonCyan);
  fillRect(g, { x: 2, y: 12, w: 5, h: 5 }, '#222');
  fillRect(g, { x: 20, y: 12, w: 5, h: 5 }, '#222');
  fillRect(g, { x: 4, y: 14, w: 2, h: 2 }, '#888');
  fillRect(g, { x: 22, y: 14, w: 2, h: 2 }, '#888');
  fillRect(g, { x: 11, y: 4, w: 8, h: 7 }, Palette.neonMagenta);
  fillRect(g, { x: 13, y: 2, w: 4, h: 3 }, '#0a0a12');
  return g;
}

export function makeKiosk(): PixelGrid {
  const g = empty(28, 28, 'transparent');
  fillRect(g, { x: 4, y: 12, w: 20, h: 14 }, Palette.botecoWood);
  fillRect(g, { x: 2, y: 4, w: 24, h: 10 }, Palette.brasilYellow);
  fillRect(g, { x: 2, y: 4, w: 24, h: 2 }, '#fff6');
  fillRect(g, { x: 6, y: 14, w: 6, h: 6 }, Palette.windowLit);
  fillRect(g, { x: 16, y: 14, w: 6, h: 6 }, Palette.neonCyan);
  fillRect(g, { x: 10, y: 6, w: 8, h: 2 }, Palette.neonMagenta);
  return g;
}

export function makeWire(): PixelGrid {
  const g = empty(40, 12, 'transparent');
  for (let x = 0; x < 40; x += 1) {
    const y = 3 + Math.round(Math.sin(x / 3.5) * 3);
    fillRect(g, { x, y, w: 1, h: 1 }, '#778');
    if (x % 9 === 0) fillRect(g, { x, y: y + 2, w: 1, h: 3 }, '#556');
  }
  fillRect(g, { x: 0, y: 0, w: 40, h: 1 }, '#445');
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
