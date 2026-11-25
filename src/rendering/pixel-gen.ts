import { Palette } from '../content/palette';

export type PixelGrid = {
  width: number;
  height: number;
  pixels: string[];
};

type Rect = { x: number; y: number; w: number; h: number };

export type TileDistrict = 'morro' | 'feira' | 'avenida' | 'torre' | 'default';

/** LD-5: readable 3/4 player (~1.5× prior) with idle bob / walk cycle. */
export function makePlayerSprite(frame = 0): PixelGrid {
  const g = empty(32, 54, 'transparent');
  const bob = frame % 2;
  const y0 = bob;
  fillRect(g, { x: 10, y: 2 + y0, w: 12, h: 12 }, Palette.brasilYellow);
  fillRect(g, { x: 9, y: 3 + y0, w: 14, h: 3 }, '#c4a020');
  fillRect(g, { x: 12, y: 7 + y0, w: 3, h: 3 }, '#1a1020');
  fillRect(g, { x: 18, y: 7 + y0, w: 3, h: 3 }, '#1a1020');
  if (bob === 0) fillRect(g, { x: 13, y: 11 + y0, w: 6, h: 2 }, '#c45a7a');
  fillRect(g, { x: 8, y: 14 + y0, w: 16, h: 16 }, Palette.neonMagenta);
  fillRect(g, { x: 10, y: 16 + y0, w: 12, h: 5 }, Palette.brasilBlue);
  fillRect(g, { x: 9, y: 22 + y0, w: 14, h: 2 }, Palette.brasilYellow);
  fillRect(g, { x: 3, y: 16 + y0 + bob, w: 5, h: 12 }, Palette.neonMagenta);
  fillRect(g, { x: 24, y: 16 + y0 + (1 - bob), w: 5, h: 12 }, Palette.neonMagenta);
  const leg = bob;
  fillRect(g, { x: 10 + leg, y: 30 + y0, w: 5, h: 16 }, '#1a2040');
  fillRect(g, { x: 18 - leg, y: 30 + y0, w: 5, h: 16 }, '#1a2040');
  fillRect(g, { x: 10 + leg, y: 45 + y0, w: 5, h: 5 }, '#0a0a12');
  fillRect(g, { x: 18 - leg, y: 45 + y0, w: 5, h: 5 }, '#0a0a12');
  return g;
}

type BodyVariant = 0 | 1 | 2 | 3;

function paintNamedHead(
  g: PixelGrid,
  accent: string,
  npcId: string,
  headY: number,
  y0: number,
): boolean {
  if (npcId === 'dona-nair') {
    fillRect(g, { x: 9, y: headY + y0, w: 14, h: 4 }, '#1faa5a');
    fillRect(g, { x: 10, y: headY + 4 + y0, w: 12, h: 10 }, accent);
    return true;
  }
  if (npcId === 'capita') {
    fillRect(g, { x: 8, y: headY + y0, w: 16, h: 5 }, '#1a2810');
    fillRect(g, { x: 10, y: headY + 4 + y0, w: 12, h: 9 }, accent);
    return true;
  }
  if (npcId === 'luna' || npcId === 'luna-feira') {
    fillRect(g, { x: 9, y: headY + y0, w: 14, h: 12 }, '#141828');
    fillRect(g, { x: 12, y: headY + 3 + y0, w: 8, h: 7 }, accent);
    return true;
  }
  if (npcId === 'ceo') {
    fillRect(g, { x: 10, y: headY + y0, w: 12, h: 10 }, '#2a1020');
    fillRect(g, { x: 9, y: headY + 1 + y0, w: 14, h: 3 }, '#1a0818');
    return true;
  }
  return false;
}

function paintVariantHead(
  g: PixelGrid,
  accent: string,
  headY: number,
  y0: number,
  variant: BodyVariant,
): void {
  if (variant === 1) {
    fillRect(g, { x: 9, y: headY + y0, w: 14, h: 4 }, '#2a1810');
    fillRect(g, { x: 10, y: headY + 3 + y0, w: 12, h: 9 }, accent);
    fillRect(g, { x: 8, y: headY + 4 + y0, w: 3, h: 8 }, '#2a1810');
    return;
  }
  if (variant === 2) {
    fillRect(g, { x: 11, y: headY + y0, w: 10, h: 11 }, accent);
    fillRect(g, { x: 10, y: headY + y0, w: 12, h: 3 }, '#f0e0c0');
    return;
  }
  if (variant === 3) {
    fillRect(g, { x: 9, y: headY + y0, w: 14, h: 11 }, accent);
    fillRect(g, { x: 8, y: headY + 1 + y0, w: 16, h: 3 }, '#1a1028');
    return;
  }
  fillRect(g, { x: 10, y: headY + y0, w: 12, h: 10 }, accent);
}

function paintNpcHead(
  g: PixelGrid,
  accent: string,
  npcId: string | undefined,
  headY: number,
  y0: number,
  variant: BodyVariant,
): void {
  if (npcId && paintNamedHead(g, accent, npcId, headY, y0)) return;
  paintVariantHead(g, accent, headY, y0, variant);
}

function npcCoat(npcId: string | undefined, variant: BodyVariant): string {
  if (npcId === 'margin') return '#1a2048';
  if (npcId === 'ceo') return '#1a1020';
  if (variant === 1) return '#2a2438';
  if (variant === 2) return '#1a2830';
  if (variant === 3) return '#302018';
  return Palette.concrete;
}

type NpcLayout = {
  tall: boolean;
  wide: boolean;
  headY: number;
  bodyY: number;
  legY: number;
};

function npcLayout(npcId: string | undefined, variant: BodyVariant): NpcLayout {
  const tall = npcId === 'seu-ze' || npcId === 'ceo' || variant === 3;
  const wide = variant === 1 || variant === 2;
  return {
    tall,
    wide,
    headY: tall ? 1 : 2,
    bodyY: tall ? 15 : 14,
    legY: tall ? 32 : 30,
  };
}

type BodyPaint = {
  g: PixelGrid;
  accent: string;
  npcId?: string;
  layout: NpcLayout;
  y0: number;
  bob: number;
  variant: BodyVariant;
};

function paintNpcBody(p: BodyPaint): void {
  const coat = npcCoat(p.npcId, p.variant);
  const h = p.layout.tall ? 16 : 14;
  const bw = p.layout.wide ? 18 : 16;
  const bx = p.layout.wide ? 7 : 8;
  fillRect(p.g, { x: bx, y: p.layout.bodyY + p.y0, w: bw, h }, coat);
  fillRect(p.g, { x: bx + 1, y: p.layout.bodyY + 3 + p.y0, w: bw - 2, h: 3 }, p.accent);
  if (p.variant === 2) {
    fillRect(
      p.g,
      { x: bx + 2, y: p.layout.bodyY + 8 + p.y0, w: bw - 4, h: 2 },
      Palette.brasilYellow,
    );
  }
  if (p.variant === 3) {
    fillRect(p.g, { x: bx, y: p.layout.bodyY + p.y0, w: bw, h: 2 }, '#4a3020');
  }
  fillRect(p.g, { x: 3, y: p.layout.bodyY + 1 + p.y0 + p.bob, w: 5, h: 10 }, coat);
  fillRect(p.g, { x: 24, y: p.layout.bodyY + 1 + p.y0 + (1 - p.bob), w: 5, h: 10 }, coat);
  fillRect(p.g, { x: 10 + p.bob, y: p.layout.legY + p.y0, w: 5, h: 16 }, Palette.asphalt);
  fillRect(p.g, { x: 18 - p.bob, y: p.layout.legY + p.y0, w: 5, h: 16 }, Palette.asphalt);
  if (p.npcId === 'bia') {
    fillRect(
      p.g,
      { x: 8, y: p.layout.bodyY - 1 + p.y0, w: 16, h: 3 },
      Palette.neonMagenta,
    );
  }
  // Accessories: hat / bag / scarf so NPCs read as distinct silhouettes.
  if (p.variant === 1) {
    fillRect(p.g, { x: 10, y: p.layout.headY - 1 + p.y0, w: 12, h: 3 }, '#2a1810');
  }
  if (p.variant === 2) {
    fillRect(p.g, { x: 22, y: p.layout.bodyY + 6 + p.y0, w: 6, h: 8 }, '#3a2818');
  }
  if (p.npcId === 'ceo') {
    fillRect(p.g, { x: 11, y: p.layout.headY + p.y0, w: 10, h: 2 }, Palette.gold);
  }
}

/** Visible elevator booth — interactable story target (not a person recolor). */
export function makeElevatorSprite(frame = 0): PixelGrid {
  const g = empty(32, 54, 'transparent');
  const bob = frame % 2;
  fillRect(g, { x: 4, y: 8 + bob, w: 24, h: 40 }, '#1a2030');
  fillRect(g, { x: 6, y: 10 + bob, w: 20, h: 28 }, '#2a3848');
  fillRect(g, { x: 8, y: 12 + bob, w: 7, h: 24 }, '#c8d0d8');
  fillRect(g, { x: 17, y: 12 + bob, w: 7, h: 24 }, '#a8b0b8');
  fillRect(g, { x: 14, y: 22 + bob, w: 4, h: 6 }, '#ffdf00');
  fillRect(g, { x: 10, y: 6 + bob, w: 12, h: 3 }, Palette.neonCyan);
  fillRect(g, { x: 12, y: 40 + bob, w: 8, h: 2 }, '#0a0a12');
  return g;
}

export function makeNpcSprite(
  accent: string,
  frame = 0,
  npcId?: string,
  bodyVariant: BodyVariant = 0,
): PixelGrid {
  if (npcId === 'elevator') return makeElevatorSprite(frame);
  const layout = npcLayout(npcId, bodyVariant);
  const g = empty(32, layout.tall ? 58 : 54, 'transparent');
  // Idle bob even when standing — crowds/NPCs feel alive.
  const bob = frame % 2;
  const y0 = bob;

  paintNpcHead(g, accent, npcId, layout.headY, y0, bodyVariant);
  fillRect(g, { x: 12, y: layout.headY + 5 + y0, w: 3, h: bob === 0 ? 3 : 1 }, '#111018');
  fillRect(g, { x: 18, y: layout.headY + 5 + y0, w: 3, h: bob === 0 ? 3 : 1 }, '#111018');
  paintNpcBody({ g, accent, npcId, layout, y0, bob, variant: bodyVariant });
  if (npcId === 'seu-ze')
    fillRect(g, { x: 11, y: layout.headY - 1 + y0, w: 10, h: 3 }, '#4a3820');
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
  if (variant === 'feira') {
    const g = empty(16, 16, '#1a1c24');
    fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, '#22242c');
    fillRect(g, { x: 5, y: 9, w: 1, h: 1 }, '#242830');
    return g;
  }
  const g = empty(16, 16, ASPHALT_BASE[variant]);
  for (let i = 0; i < 16; i += 3) {
    fillRect(g, { x: 0, y: i, w: 16, h: 1 }, Palette.asphalt);
  }
  fillRect(g, { x: 7, y: 0, w: 2, h: 16 }, '#ffffff10');
  fillRect(g, { x: 7, y: 4, w: 2, h: 2 }, Palette.brasilYellow);
  fillRect(g, { x: 7, y: 12, w: 2, h: 2 }, Palette.brasilYellow);
  fillRect(g, { x: 1, y: 3, w: 1, h: 1 }, '#2a2a40');
  fillRect(g, { x: 14, y: 10, w: 1, h: 1 }, '#101018');
  paintAsphaltVariant(g, variant);
  return g;
}

export function makeSidewalk(variant: TileDistrict = 'default'): PixelGrid {
  const base =
    variant === 'feira'
      ? '#2a2834'
      : variant === 'avenida'
        ? '#222838'
        : Palette.sidewalk;
  const g = empty(16, 16, base);
  fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, Palette.curb);
  fillRect(g, { x: 0, y: 15, w: 16, h: 1 }, Palette.curb);
  if (variant === 'feira') {
    fillRect(g, { x: 7, y: 8, w: 1, h: 1 }, '#fff2');
  }
  return g;
}

export function makeAlley(variant: TileDistrict = 'default'): PixelGrid {
  // Quiet hillside / service lane — no bar/window-dot fills.
  const g = empty(16, 16, variant === 'torre' ? '#180c18' : '#12141c');
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, Palette.plantDark);
  fillRect(g, { x: 3, y: 5, w: 1, h: 1 }, '#2a2a38');
  fillRect(g, { x: 11, y: 9, w: 1, h: 1 }, '#222830');
  return g;
}

function makeFeiraPlaza(): PixelGrid {
  // Quiet paved plaza — no polka-dot filler.
  const g = empty(16, 16, '#1c1c28');
  fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, '#282838');
  fillRect(g, { x: 0, y: 15, w: 16, h: 1 }, '#282838');
  fillRect(g, { x: 0, y: 0, w: 1, h: 16 }, '#282838');
  fillRect(g, { x: 15, y: 0, w: 1, h: 16 }, '#282838');
  fillRect(g, { x: 4, y: 8, w: 1, h: 1 }, '#2a2a38');
  fillRect(g, { x: 11, y: 5, w: 1, h: 1 }, '#2a2a38');
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
  fillRect(g, { x: 4, y: 6, w: 1, h: 1 }, '#1a4030');
  fillRect(g, { x: 11, y: 10, w: 1, h: 1 }, '#163828');
  return g;
}

function blockedWallColor(variant: TileDistrict): string {
  if (variant === 'torre') return '#1a1020';
  if (variant === 'morro') return '#2a2430';
  if (variant === 'feira') return '#241c18';
  return '#181e28';
}

function paintBlockedFacade(g: PixelGrid, variant: TileDistrict): void {
  if (variant === 'morro') {
    // Brick retaining fill under terrace overlays (no window-dot column).
    fillRect(g, { x: 0, y: 0, w: 16, h: 16 }, '#1a1418');
    for (let y = 2; y < 16; y += 4) {
      fillRect(g, { x: 0, y, w: 16, h: 1 }, '#0a080c');
      fillRect(g, { x: y % 8 === 2 ? 0 : 4, y: y + 1, w: 1, h: 3 }, '#0a080c');
    }
    return;
  }
  if (variant === 'feira') {
    fillRect(g, { x: 0, y: 3, w: 16, h: 1 }, '#3a3028');
    fillRect(g, { x: 4, y: 7, w: 3, h: 3 }, '#2a2018');
    fillRect(g, { x: 10, y: 9, w: 3, h: 3 }, '#2a2018');
    return;
  }
  if (variant === 'torre') {
    fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, Palette.gold);
    fillRect(g, { x: 3, y: 5, w: 10, h: 6 }, Palette.neonMagenta);
    return;
  }
  fillRect(g, { x: 2, y: 3, w: 12, h: 2 }, Palette.neonCyan);
  fillRect(g, { x: 3, y: 7, w: 10, h: 6 }, '#2a4060');
}

export function makeBlocked(variant: TileDistrict = 'default'): PixelGrid {
  // Solid facade / wall face — not brick window-dot filler.
  const g = empty(16, 16, blockedWallColor(variant));
  fillRect(g, { x: 0, y: 0, w: 16, h: 2 }, '#00000044');
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, Palette.shadow);
  paintBlockedFacade(g, variant);
  return g;
}

function paintBrickCourses(g: PixelGrid, brick: string, brick2: string): void {
  for (let y = 5; y < 35; y += 5) {
    fillRect(g, { x: 0, y, w: 16, h: 1 }, '#0a080c');
    const offset = y % 10 === 5 ? 0 : 4;
    for (let x = offset; x < 16; x += 8) {
      fillRect(g, { x, y: y + 1, w: 1, h: 4 }, '#0a080c');
    }
    fillRect(g, { x: 0, y: y + 1, w: 16, h: 4 }, y % 10 === 5 ? brick2 : brick);
  }
}

/** Tall terrace retaining face (≈3 tiles) + drop shadow onto level below. */
export function makeRetainingWall(variant = 0): PixelGrid {
  const g = empty(16, 48, 'transparent');
  const brick = variant % 2 === 0 ? '#121014' : '#0e0c10';
  const brick2 = variant % 2 === 0 ? '#1a1418' : '#141018';
  fillRect(g, { x: 0, y: 0, w: 16, h: 6 }, '#7a7888');
  fillRect(g, { x: 0, y: 1, w: 16, h: 2 }, '#a8a6b8');
  fillRect(g, { x: 0, y: 5, w: 16, h: 1 }, '#2a2830');
  fillRect(g, { x: 0, y: 6, w: 16, h: 28 }, brick);
  paintBrickCourses(g, brick, brick2);
  fillRect(g, { x: 0, y: 6, w: 3, h: 28 }, '#00000088');
  fillRect(g, { x: 13, y: 6, w: 3, h: 28 }, '#00000055');
  fillRect(
    g,
    { x: 3, y: 14, w: 2, h: 2 },
    variant % 3 === 0 ? Palette.neonMagenta : '#2a2030',
  );
  fillRect(
    g,
    { x: 11, y: 24, w: 2, h: 2 },
    variant % 3 === 1 ? Palette.neonCyan : '#2a2030',
  );
  fillRect(g, { x: 0, y: 34, w: 16, h: 14 }, '#000000bb');
  fillRect(g, { x: 0, y: 34, w: 16, h: 5 }, '#000000ee');
  return g;
}

/** Solid map-border wall — no window-dot column; varied so edges are not flat. */
export function makeEdgeWall(seed = 0): PixelGrid {
  const g = empty(16, 16, seed % 2 === 0 ? '#0c0a10' : '#100e14');
  fillRect(g, { x: 0, y: 0, w: 16, h: 2 }, '#18161c');
  fillRect(g, { x: 0, y: 14, w: 16, h: 2 }, '#000000');
  fillRect(g, { x: 0, y: 7, w: 16, h: 1 }, '#06050a');
  fillRect(g, { x: 2 + (seed % 5), y: 3, w: 3, h: 1 }, '#1a1820');
  fillRect(g, { x: 9, y: 10, w: 2, h: 2 }, seed % 3 === 0 ? '#2bfff222' : '#1a1820');
  fillRect(g, { x: 4, y: 12, w: 1, h: 1 }, '#ff2bd622');
  return g;
}

export type StairSide = 'mid' | 'left' | 'right';

/** Stair tread with step shading; outer sides get rail posts. */
export function makeStairs(
  variant: TileDistrict = 'default',
  side: StairSide = 'mid',
): PixelGrid {
  const base = variant === 'morro' ? '#3a3848' : Palette.concrete;
  const g = empty(16, 16, base);
  paintStairTreads(g);
  if (side !== 'mid') paintStairRail(g, side);
  return g;
}

function paintStairTreads(g: PixelGrid): void {
  for (let i = 0; i < 4; i += 1) {
    const y = i * 4;
    fillRect(g, { x: 0, y, w: 16, h: 2 }, '#5a5868');
    fillRect(g, { x: 0, y: y + 2, w: 16, h: 1 }, '#2a2838');
    fillRect(g, { x: 0, y: y + 3, w: 16, h: 1 }, '#121018');
  }
}

function paintStairRail(g: PixelGrid, side: 'left' | 'right'): void {
  const x0 = side === 'left' ? 0 : 12;
  fillRect(g, { x: x0, y: 0, w: 4, h: 16 }, '#121018');
  fillRect(g, { x: x0 + 1, y: 0, w: 2, h: 16 }, '#9a98a8');
  fillRect(g, { x: x0 + 1, y: 0, w: 1, h: 16 }, '#c8c6d8');
  for (let y = 0; y < 16; y += 4) {
    fillRect(g, { x: x0, y, w: 4, h: 2 }, '#e8e6f0');
    fillRect(g, { x: x0, y: y + 1, w: 4, h: 1 }, '#5a5868');
  }
}

export function makeInterior(variant: TileDistrict = 'default'): PixelGrid {
  if (variant === 'torre') {
    // Deep red casino carpet with gold diamond accents.
    const g = empty(16, 16, '#2a0814');
    fillRect(g, { x: 0, y: 0, w: 16, h: 16 }, '#3a1020');
    fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, '#5a1830');
    fillRect(g, { x: 0, y: 8, w: 16, h: 1 }, '#1a0810');
    fillRect(g, { x: 7, y: 3, w: 2, h: 2 }, '#ffdf0044');
    fillRect(g, { x: 3, y: 11, w: 2, h: 2 }, '#ffdf0033');
    fillRect(g, { x: 12, y: 11, w: 2, h: 2 }, '#ffdf0033');
    return g;
  }
  const g = empty(16, 16, '#12101c');
  fillRect(g, { x: 0, y: 0, w: 16, h: 1 }, '#2a1840');
  fillRect(g, { x: 0, y: 8, w: 16, h: 1 }, '#1a1028');
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

function paintFavelaShell(
  g: PixelGrid,
  wall: string,
  roof: string,
  fw: number,
  fh: number,
  w: number,
): void {
  fillRect(g, { x: 10, y: 24, w: fw, h: fh }, Palette.shadow);
  fillRect(g, { x: 4, y: 20, w: fw, h: fh }, wall);
  fillRect(g, { x: 4, y: 20, w: 3, h: fh }, '#00000055');
  fillRect(g, { x: 4 + fw, y: 22, w: 8, h: fh - 2 }, '#00000066');
  fillRect(g, { x: 2, y: 10, w: fw + 4, h: 12 }, roof);
  fillRect(g, { x: fw, y: 12, w: 12, h: 10 }, roof);
  for (let i = 0; i < 10; i += 1) {
    fillRect(g, { x: 2, y: 11 + i, w: fw + 4, h: 1 }, i % 2 ? '#ffffff22' : '#00000033');
  }
  fillRect(g, { x: 8, y: 6, w: 18, h: 5 }, '#4a4858');
  fillRect(g, { x: w - 16, y: 2, w: 2, h: 12 }, '#889');
  fillRect(g, { x: w - 18, y: 2, w: 6, h: 2 }, Palette.neonLime);
}

function favelaHouse(style: number): PixelGrid {
  const wide = style % 3 === 0;
  const storeys = 2 + (style % 3); // 2–4 storeys
  const w = wide ? 56 : 44 + (style % 3) * 4;
  const h = 40 + storeys * 22;
  const g = empty(w, h, 'transparent');
  const wall = [
    Palette.wallWarm,
    Palette.botecoWood,
    '#3a2840',
    '#243040',
    '#4a3028',
    '#2a3848',
    '#503848',
    '#283828',
  ][style % 8]!;
  const roof = [
    Palette.roofPink,
    Palette.roofCyan,
    '#c45818',
    '#6a2a80',
    '#e8a020',
    '#3080a0',
    '#a03060',
    '#4060a0',
  ][style % 8]!;
  const fw = w - 14;
  const fh = h - 28;
  paintFavelaShell(g, wall, roof, fw, fh, w);
  paintFavelaWindows(g, style, storeys, wide);
  paintFavelaRoofProps(g, style, w, h);
  // Layered neighbour block for depth (less flat banding on Morro terraces).
  if (style % 2 === 0) {
    fillRect(g, { x: w - 12, y: 28, w: 10, h: h - 36 }, '#00000055');
    fillRect(g, { x: w - 11, y: 30, w: 3, h: 3 }, Palette.neonCyan);
    fillRect(g, { x: w - 11, y: 38, w: 3, h: 3 }, Palette.neonMagenta);
  }
  return g;
}

function paintFavelaWindows(
  g: PixelGrid,
  style: number,
  storeys: number,
  wide: boolean,
): void {
  const winColors = [
    Palette.windowLit,
    Palette.neonCyan,
    Palette.gold,
    Palette.neonMagenta,
  ];
  for (let s = 0; s < storeys; s += 1) {
    const wy = 26 + s * 20;
    const wx0 = 8 + (style % 3);
    const c0 = winColors[(style + s) % winColors.length]!;
    const c1 = winColors[(style + s + 1) % winColors.length]!;
    fillRect(g, { x: wx0, y: wy, w: 9, h: 9 }, c0);
    fillRect(g, { x: wx0 + 2, y: wy + 2, w: 5, h: 5 }, '#ffe8a088');
    fillRect(g, { x: wx0 + 14, y: wy, w: 9, h: 9 }, c1);
    fillRect(g, { x: wx0 + 16, y: wy + 2, w: 5, h: 5 }, '#a0fff888');
    if (wide) fillRect(g, { x: wx0 + 28, y: wy + 1, w: 7, h: 7 }, c0);
  }
}

function paintFavelaRoofProps(g: PixelGrid, style: number, w: number, h: number): void {
  fillRect(g, { x: 16, y: h - 22, w: 12, h: 18 }, '#100818');
  fillRect(g, { x: 24, y: h - 14, w: 2, h: 2 }, Palette.gold);
  if (style % 2 === 0) {
    fillRect(g, { x: 10, y: 2, w: 12, h: 8 }, '#4a6070');
    fillRect(g, { x: 11, y: 3, w: 10, h: 2 }, '#7ab');
    return;
  }
  fillRect(g, { x: w - 20, y: 4, w: 10, h: 6 }, '#3a4858');
  fillRect(g, { x: w - 18, y: 1, w: 2, h: 8 }, '#889');
}

function stall(style: number): PixelGrid {
  const w = 52 + (style % 4) * 6;
  const h = 52 + (style % 3) * 4;
  const g = empty(w, h, 'transparent');
  const awning = [
    Palette.brasilYellow,
    Palette.neonMagenta,
    Palette.neonCyan,
    Palette.brasilGreen,
    '#ff8c42',
    '#4a6cff',
    '#e050a0',
    '#40c070',
  ][style % 8]!;
  // Counter + wood body
  fillRect(g, { x: 8, y: h - 22, w: w - 16, h: 16 }, Palette.shadow);
  fillRect(g, { x: 4, y: h - 26, w: w - 14, h: 20 }, Palette.botecoWood);
  fillRect(g, { x: 4, y: h - 26, w: 3, h: 20 }, '#00000055');
  // Striped awning canopy
  const stripes = Math.floor((w - 6) / 5);
  for (let i = 0; i < stripes; i += 1) {
    fillRect(
      g,
      { x: 3 + i * 5, y: 4, w: 5, h: h - 32 },
      i % 2 === 0 ? awning : '#1a1020',
    );
  }
  fillRect(g, { x: 2, y: 2, w: w - 8, h: 4 }, awning);
  fillRect(g, { x: 2, y: 2, w: w - 8, h: 1 }, '#ffffff44');
  paintStallGoods(g, style, w, h);
  fillRect(g, { x: 10, y: h - 8, w: 16, h: 3 }, '#1a1008');
  return g;
}

function paintStallGoods(g: PixelGrid, style: number, w: number, h: number): void {
  const goods = [
    Palette.brasilYellow,
    '#e05040',
    '#40c070',
    '#ff8c42',
    Palette.neonCyan,
    '#c060a0',
  ];
  // Counter produce piles (mangoes, peppers, greens, bottles)
  for (let i = 0; i < 5; i += 1) {
    const gx = 6 + i * 9;
    const gy = h - 24;
    const c = goods[(style + i) % goods.length]!;
    fillRect(g, { x: gx, y: gy, w: 8, h: 7 }, c);
    fillRect(g, { x: gx + 1, y: gy + 1, w: 6, h: 2 }, '#ffffff44');
    fillRect(g, { x: gx + 2, y: gy - 2, w: 4, h: 3 }, c);
  }
  // Hanging produce / bags under striped awning
  fillRect(g, { x: 10, y: 12, w: 5, h: 10 }, goods[style % goods.length]!);
  fillRect(g, { x: 10, y: 11, w: 5, h: 1 }, '#2a1810');
  fillRect(g, { x: w - 24, y: 14, w: 6, h: 9 }, goods[(style + 2) % goods.length]!);
  fillRect(g, { x: w - 24, y: 13, w: 6, h: 1 }, '#2a1810');
  fillRect(g, { x: Math.floor(w / 2) - 4, y: 13, w: 8, h: 8 }, Palette.gold);
  fillRect(g, { x: Math.floor(w / 2) - 3, y: 14, w: 6, h: 3 }, '#fff6a0');
  // Side crate of goods
  fillRect(g, { x: w - 14, y: h - 18, w: 8, h: 6 }, Palette.botecoWood);
  fillRect(g, { x: w - 13, y: h - 20, w: 6, h: 4 }, goods[(style + 3) % goods.length]!);
}

function glassTower(style: number): PixelGrid {
  const w = style % 2 ? 56 : 48;
  const h = style % 3 === 0 ? 96 : 80;
  const g = empty(w, h, 'transparent');
  fillRect(g, { x: 14, y: 16, w: w - 20, h: h - 20 }, Palette.shadow);
  fillRect(g, { x: 6, y: 12, w: w - 20, h: h - 16 }, Palette.concrete);
  fillRect(g, { x: w - 14, y: 14, w: 8, h: h - 18 }, '#00000066');
  fillRect(
    g,
    { x: 4, y: 4, w: w - 16, h: 10 },
    style % 2 ? Palette.neonCyan : Palette.neonMagenta,
  );
  fillRect(
    g,
    { x: w - 14, y: 6, w: 10, h: 8 },
    style % 2 ? Palette.neonCyan : Palette.neonMagenta,
  );
  for (let y = 16; y < h - 20; y += 7) {
    fillRect(g, { x: 10, y, w: w - 28, h: 4 }, '#3a80a0');
    fillRect(g, { x: 10, y: y + 3, w: w - 28, h: 1 }, '#1a3040');
  }
  fillRect(g, { x: Math.floor(w / 2) - 6, y: h - 22, w: 12, h: 16 }, '#08060e');
  return g;
}

/** Casa Suprema furniture — gaming tables / VIP booths, not glass towers. */
function corpBlock(style: number): PixelGrid {
  if (style % 2 === 1) return vipBooth(style);
  return casinoTable(style);
}

function casinoTable(style: number): PixelGrid {
  const w = 56 + (style % 3) * 4;
  const h = 44;
  const g = empty(w, h, 'transparent');
  fillRect(g, { x: 8, y: 24, w: w - 16, h: 14 }, '#00000088');
  fillRect(g, { x: 6, y: 14, w: w - 12, h: 20 }, '#0e3a22');
  fillRect(g, { x: 4, y: 12, w: w - 8, h: 4 }, Palette.gold);
  fillRect(g, { x: 4, y: 30, w: w - 8, h: 3 }, Palette.gold);
  fillRect(g, { x: 10, y: 16, w: w - 20, h: 12 }, '#124828');
  fillRect(g, { x: 14, y: 18, w: 4, h: 4 }, '#ffdf00');
  fillRect(g, { x: w - 22, y: 18, w: 4, h: 4 }, Palette.neonMagenta);
  fillRect(g, { x: Math.floor(w / 2) - 3, y: 19, w: 6, h: 6 }, '#f4f1ff');
  // Crowd chairs + chip trays for a fuller Casa pit.
  fillRect(g, { x: 2, y: 28, w: 6, h: 10 }, '#1a1020');
  fillRect(g, { x: w - 8, y: 28, w: 6, h: 10 }, '#1a1020');
  fillRect(g, { x: 18, y: 34, w: 8, h: 3 }, Palette.gold);
  fillRect(g, { x: w - 28, y: 34, w: 8, h: 3 }, Palette.neonCyan);
  if (style % 2 === 0) {
    fillRect(g, { x: Math.floor(w / 2) - 8, y: 8, w: 16, h: 4 }, '#2a2038');
  }
  return g;
}

function vipBooth(style: number): PixelGrid {
  const w = 52;
  const h = 48;
  const g = empty(w, h, 'transparent');
  fillRect(g, { x: 6, y: 10, w: 40, h: 34 }, '#00000066');
  fillRect(g, { x: 4, y: 6, w: 40, h: 36 }, style % 4 === 1 ? '#2a1020' : '#1a0814');
  fillRect(g, { x: 2, y: 4, w: 44, h: 6 }, Palette.gold);
  fillRect(g, { x: 8, y: 14, w: 32, h: 10 }, '#4a1830');
  fillRect(g, { x: 10, y: 28, w: 28, h: 8 }, '#3a1020');
  fillRect(g, { x: 14, y: 18, w: 6, h: 4 }, Palette.gold);
  fillRect(g, { x: 28, y: 18, w: 6, h: 4 }, Palette.neonCyan);
  fillRect(g, { x: 20, y: 36, w: 12, h: 4 }, '#ffdf0066');
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
  if (kind === 'casa-tower') return makeChandelier();
  if (kind === 'led-tower') return makeLedLandmark();
  if (kind === 'glass-corp') return makeGlassLandmark();
  return makeCalcadaoLandmark();
}

function makeChandelier(): PixelGrid {
  const g = empty(40, 72, 'transparent');
  fillRect(g, { x: 18, y: 2, w: 4, h: 14 }, Palette.gold);
  fillRect(g, { x: 8, y: 14, w: 24, h: 4 }, Palette.gold);
  fillRect(g, { x: 6, y: 18, w: 28, h: 6 }, '#c4a020');
  for (let i = 0; i < 5; i += 1) {
    const x = 8 + i * 6;
    fillRect(g, { x, y: 24, w: 3, h: 18 }, Palette.gold);
    fillRect(g, { x: x - 1, y: 40, w: 5, h: 5 }, '#ffe8a0');
    fillRect(g, { x, y: 42, w: 3, h: 3 }, '#ffffff');
  }
  fillRect(g, { x: 14, y: 20, w: 12, h: 4 }, '#ffdf0088');
  return g;
}

function makeLedLandmark(): PixelGrid {
  const g = empty(40, 72, 'transparent');
  fillRect(g, { x: 12, y: 8, w: 16, h: 60 }, Palette.concrete);
  fillRect(g, { x: 8, y: 2, w: 24, h: 10 }, Palette.neonMagenta);
  for (let y = 16; y < 64; y += 5) {
    fillRect(g, { x: 14, y, w: 12, h: 2 }, Palette.neonCyan);
  }
  return g;
}

function makeGlassLandmark(): PixelGrid {
  const g = empty(40, 72, 'transparent');
  fillRect(g, { x: 8, y: 4, w: 24, h: 64 }, '#1a3048');
  fillRect(g, { x: 6, y: 0, w: 28, h: 6 }, Palette.neonCyan);
  for (let y = 10; y < 64; y += 4) {
    fillRect(g, { x: 10, y, w: 20, h: 2 }, '#2a80a0');
  }
  return g;
}

function makeCalcadaoLandmark(): PixelGrid {
  const g = empty(40, 72, 'transparent');
  fillRect(g, { x: 2, y: 44, w: 36, h: 16 }, Palette.botecoWood);
  fillRect(g, { x: 0, y: 30, w: 18, h: 16 }, Palette.brasilYellow);
  fillRect(g, { x: 1, y: 30, w: 16, h: 2 }, '#fff6');
  for (let i = 0; i < 3; i += 1) {
    fillRect(
      g,
      { x: 2 + i * 5, y: 34, w: 4, h: 8 },
      i % 2 ? '#1a1020' : Palette.brasilYellow,
    );
  }
  fillRect(g, { x: 20, y: 28, w: 18, h: 18 }, Palette.neonMagenta);
  fillRect(g, { x: 21, y: 28, w: 16, h: 2 }, '#fff6');
  for (let i = 0; i < 3; i += 1) {
    fillRect(
      g,
      { x: 22 + i * 5, y: 32, w: 4, h: 10 },
      i % 2 ? '#1a1020' : Palette.neonMagenta,
    );
  }
  fillRect(g, { x: 6, y: 48, w: 6, h: 5 }, '#e05040');
  fillRect(g, { x: 14, y: 48, w: 6, h: 5 }, '#40c070');
  fillRect(g, { x: 24, y: 48, w: 6, h: 5 }, Palette.neonCyan);
  fillRect(g, { x: 16, y: 56, w: 4, h: 8 }, '#f5c518');
  fillRect(g, { x: 22, y: 58, w: 4, h: 6 }, '#7bc96f');
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

/** Compact crowd silhouettes for Fair atmosphere (non-interactive). */
export function makeCrowd(): PixelGrid {
  const g = empty(36, 28, 'transparent');
  const heads = ['#f5c518', '#7bc96f', '#ff6eb4', '#6ec8e8'];
  for (let i = 0; i < 4; i += 1) {
    const x = 2 + i * 8;
    fillRect(g, { x: x + 2, y: 4, w: 5, h: 5 }, heads[i]!);
    fillRect(g, { x: x + 1, y: 10, w: 7, h: 12 }, i % 2 ? '#1a2030' : '#281828');
    fillRect(g, { x: x + 2, y: 22, w: 2, h: 4 }, '#0a0a12');
    fillRect(g, { x: x + 5, y: 22, w: 2, h: 4 }, '#0a0a12');
  }
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
