/**
 * Procedural 4-direction character sheets (AI/procedural pixel art — free to ship).
 * Source size 32×54 matches CHAR_SCALE baking in world-view.
 */

import { Palette } from '../content/palette';
import {
  IDLE_FRAMES,
  TALK_FRAMES,
  WALK_FRAMES,
  idleBlinkClosed,
  type AnimDir,
  type AnimMode,
  type CharAnimState,
  type NpcIdleKind,
} from '../systems/char-anim';
import type { BodyVariant, PixelGrid } from './pixel-gen';

type Rect = { x: number; y: number; w: number; h: number };

function empty(w: number, h: number, fill: string): PixelGrid {
  return { width: w, height: h, pixels: Array(w * h).fill(fill) };
}

function fillRect(g: PixelGrid, r: Rect, color: string): void {
  for (let y = r.y; y < r.y + r.h; y += 1) {
    for (let x = r.x; x < r.x + r.w; x += 1) {
      if (x < 0 || y < 0 || x >= g.width || y >= g.height) continue;
      g.pixels[y * g.width + x] = color;
    }
  }
}

export type CharSheetOpts = {
  accent: string;
  jacket?: string;
  pants?: string;
  hair?: string;
  player?: boolean;
};

const DEFAULT_PLAYER: CharSheetOpts = {
  accent: Palette.brasilYellow,
  jacket: Palette.neonMagenta,
  pants: '#1a2040',
  hair: '#c4a020',
  player: true,
};

type Pose = {
  dir: AnimDir;
  mode: AnimMode;
  frame: number;
  bobY: number;
  squashX: number;
  blink: boolean;
  idleKind?: NpcIdleKind;
};

function legOffsets(mode: AnimMode, frame: number): { legL: number; legR: number } {
  const step = mode === 'walk' || mode === 'run' ? frame % WALK_FRAMES : 0;
  const runBoost = mode === 'run' ? 1 : 0;
  const legL = [0, 2, 3, 2, 0, -2][step]! + runBoost * (step % 2);
  const legR = [0, -2, -3, -2, 0, 2][step]! - runBoost * (step % 2);
  return { legL, legR };
}

function paintHead(
  g: PixelGrid,
  o: {
    cx: number;
    headY: number;
    dir: AnimDir;
    blink: boolean;
    skin: string;
    hair: string;
  },
): void {
  fillRect(g, { x: o.cx - 6, y: o.headY, w: 12, h: 12 }, o.skin);
  fillRect(g, { x: o.cx - 7, y: o.headY + 1, w: 14, h: 3 }, o.hair);
  if (o.dir === 'up') {
    fillRect(g, { x: o.cx - 7, y: o.headY, w: 14, h: 8 }, o.hair);
    return;
  }
  const eyeH = o.blink ? 1 : 3;
  fillRect(g, { x: o.cx - 4, y: o.headY + 5, w: 3, h: eyeH }, '#1a1020');
  fillRect(g, { x: o.cx + 1, y: o.headY + 5, w: 3, h: eyeH }, '#1a1020');
  if (!o.blink) fillRect(g, { x: o.cx - 2, y: o.headY + 9, w: 4, h: 2 }, '#c45a7a');
}

function paintArms(
  g: PixelGrid,
  o: {
    cx: number;
    armY: number;
    jacket: string;
    skin: string;
    mode: AnimMode;
    idleKind?: NpcIdleKind;
    step: number;
    lean: number;
  },
): void {
  if (o.mode === 'talk') {
    fillRect(g, { x: o.cx + 6, y: o.armY - 4, w: 5, h: 10 }, o.jacket);
    fillRect(g, { x: o.cx + 7, y: o.armY - 6, w: 3, h: 3 }, o.skin);
    fillRect(g, { x: o.cx - 11, y: o.armY + 2, w: 5, h: 12 }, o.jacket);
    return;
  }
  if (o.idleKind === 'vendor') {
    fillRect(g, { x: o.cx + 7, y: o.armY - 2, w: 5, h: 8 }, o.jacket);
    fillRect(g, { x: o.cx + 8, y: o.armY - 4, w: 4, h: 3 }, Palette.brasilYellow);
    fillRect(g, { x: o.cx - 12, y: o.armY + 2, w: 5, h: 12 }, o.jacket);
    return;
  }
  if (o.idleKind === 'dj') {
    fillRect(g, { x: o.cx - 12, y: o.armY - (o.step % 2), w: 5, h: 12 }, o.jacket);
    fillRect(g, { x: o.cx + 7, y: o.armY + (o.step % 2), w: 5, h: 12 }, o.jacket);
    return;
  }
  if (o.idleKind === 'phone') {
    fillRect(g, { x: o.cx + 6, y: o.armY, w: 5, h: 10 }, o.jacket);
    fillRect(g, { x: o.cx + 8, y: o.armY + 2, w: 3, h: 5 }, Palette.neonCyan);
    fillRect(g, { x: o.cx - 11, y: o.armY + 2, w: 5, h: 12 }, o.jacket);
    return;
  }
  fillRect(g, { x: o.cx - 11, y: o.armY + (o.lean < 0 ? 1 : 0), w: 5, h: 12 }, o.jacket);
  fillRect(g, { x: o.cx + 6, y: o.armY + (o.lean > 0 ? 1 : 0), w: 5, h: 12 }, o.jacket);
}

function paintLegs(
  g: PixelGrid,
  o: {
    cx: number;
    dir: AnimDir;
    bob: number;
    legL: number;
    legR: number;
    pants: string;
  },
): void {
  const foot = '#0a0a12';
  const baseLegY = 30 + o.bob;
  if (o.dir === 'left' || o.dir === 'right') {
    const front = o.dir === 'right' ? o.legR : o.legL;
    const back = o.dir === 'right' ? o.legL : o.legR;
    fillRect(
      g,
      { x: o.cx - 5, y: baseLegY + back, w: 5, h: 16 - Math.abs(back) },
      o.pants,
    );
    fillRect(
      g,
      { x: o.cx + 1, y: baseLegY + front, w: 5, h: 16 - Math.abs(front) },
      o.pants,
    );
    fillRect(g, { x: o.cx - 5, y: 45 + o.bob + back, w: 5, h: 4 }, foot);
    fillRect(g, { x: o.cx + 1, y: 45 + o.bob + front, w: 5, h: 4 }, foot);
    return;
  }
  fillRect(g, { x: o.cx - 6 + Math.max(0, o.legL), y: baseLegY, w: 5, h: 16 }, o.pants);
  fillRect(g, { x: o.cx + 1 + Math.min(0, o.legR), y: baseLegY, w: 5, h: 16 }, o.pants);
  fillRect(g, { x: o.cx - 6 + Math.max(0, o.legL), y: 45 + o.bob, w: 5, h: 4 }, foot);
  fillRect(g, { x: o.cx + 1 + Math.min(0, o.legR), y: 45 + o.bob, w: 5, h: 4 }, foot);
}

/** Draw one character pose into a 32×54 grid. */
export function paintCharFrame(o: {
  dir: AnimDir;
  mode: AnimMode;
  frame: number;
  bobY?: number;
  squashX?: number;
  blink?: boolean;
  opts?: CharSheetOpts;
  idleKind?: NpcIdleKind;
}): PixelGrid {
  const opts = { ...DEFAULT_PLAYER, ...o.opts };
  const pose: Pose = {
    dir: o.dir,
    mode: o.mode,
    frame: o.frame,
    bobY: o.bobY ?? 0,
    squashX: o.squashX ?? 0,
    blink: Boolean(o.blink),
    idleKind: o.idleKind,
  };
  return paintPose(pose, opts);
}

function paintPose(pose: Pose, opts: CharSheetOpts): PixelGrid {
  const g = empty(32, 54, 'transparent');
  const lean = pose.dir === 'left' ? -1 : pose.dir === 'right' ? 1 : 0;
  const depth = pose.dir === 'up' ? -1 : pose.dir === 'down' ? 1 : 0;
  const { legL, legR } = legOffsets(pose.mode, pose.frame);
  const armSwing =
    pose.mode === 'talk' ? (pose.frame % 2 === 0 ? 3 : -1) : lean * 2 + (legL - legR);
  const cx = 16 + Math.round(pose.squashX);
  const headY = 2 + pose.bobY + (depth < 0 ? -1 : 0);
  const bodyY = 14 + pose.bobY;
  fillRect(g, { x: cx - 8, y: 48, w: 16, h: 3 }, '#00000055');
  paintHead(g, {
    cx,
    headY,
    dir: pose.dir,
    blink: pose.blink,
    skin: opts.accent,
    hair: opts.hair ?? '#2a1810',
  });
  const jacket = opts.jacket ?? Palette.neonMagenta;
  fillRect(g, { x: cx - 8, y: bodyY, w: 16, h: 16 }, jacket);
  fillRect(g, { x: cx - 6, y: bodyY + 2, w: 12, h: 5 }, Palette.brasilBlue);
  fillRect(g, { x: cx - 7, y: bodyY + 8, w: 14, h: 2 }, Palette.brasilYellow);
  const armY = bodyY + 2 + Math.round(Math.abs(armSwing) * 0.15);
  paintArms(g, {
    cx,
    armY,
    jacket,
    skin: opts.accent,
    mode: pose.mode,
    idleKind: pose.idleKind,
    step: pose.frame,
    lean,
  });
  paintLegs(g, {
    cx,
    dir: pose.dir,
    bob: pose.bobY,
    legL,
    legR,
    pants: opts.pants ?? '#1a2040',
  });
  return g;
}

export function makePlayerAnimFrame(state: CharAnimState): PixelGrid {
  return paintCharFrame({
    dir: state.dir,
    mode: state.mode === 'run' ? 'run' : state.mode,
    frame: state.frame,
    bobY: state.bobY,
    squashX: state.squashX,
    blink: idleBlinkClosed(state),
    opts: DEFAULT_PLAYER,
  });
}

export function makeNpcAnimFrame(o: {
  state?: CharAnimState;
  accent: string;
  npcId?: string;
  idleKind: NpcIdleKind;
  idleFrame: number;
  bodyVariant?: BodyVariant;
}): PixelGrid {
  const moving = o.state && (o.state.mode === 'walk' || o.state.mode === 'run');
  if (moving && o.state) {
    return paintCharFrame({
      dir: o.state.dir,
      mode: o.state.mode,
      frame: o.state.frame,
      bobY: o.state.bobY,
      squashX: o.state.squashX,
      opts: { accent: o.accent, player: false, jacket: o.accent },
    });
  }
  const mode: AnimMode = o.idleKind === 'vendor' || o.idleKind === 'dj' ? 'talk' : 'idle';
  return paintCharFrame({
    dir: o.state?.dir ?? 'down',
    mode,
    frame: o.idleFrame % (mode === 'talk' ? TALK_FRAMES : IDLE_FRAMES),
    bobY: o.idleKind === 'dj' ? o.idleFrame % 2 : 0,
    idleKind: o.idleKind,
    opts: { accent: o.accent, player: false, jacket: o.accent },
  });
}

export function walkStrip(dir: AnimDir, opts?: CharSheetOpts): PixelGrid {
  const frameW = 32;
  const g = empty(frameW * WALK_FRAMES, 54, '#07060f');
  for (let i = 0; i < WALK_FRAMES; i += 1) {
    const frame = paintCharFrame({
      dir,
      mode: 'walk',
      frame: i,
      bobY: Math.round(Math.sin((i / WALK_FRAMES) * Math.PI * 2) * 1.5),
      squashX: Math.sin((i / WALK_FRAMES) * Math.PI * 2) * 0.25,
      opts,
    });
    blit(g, frame, i * frameW, 0);
  }
  return g;
}

function blit(dst: PixelGrid, src: PixelGrid, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const c = src.pixels[y * src.width + x]!;
      if (c === 'transparent') continue;
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
      dst.pixels[dy * dst.width + dx] = c;
    }
  }
}
