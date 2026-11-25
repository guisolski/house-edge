/** Character animation state machine — idle / walk / run / talk × 4 directions. */

export type AnimDir = 'down' | 'up' | 'left' | 'right';
export type AnimMode = 'idle' | 'walk' | 'run' | 'talk';

/** Procedural sheet layout (pixel art, integer frames). */
export const WALK_FRAMES = 6;
export const IDLE_FRAMES = 4;
export const TALK_FRAMES = 4;

const WALK_CYCLE_S = 0.42;
const RUN_CYCLE_S = 0.28;
const IDLE_CYCLE_S = 1.6;
const TALK_CYCLE_S = 0.55;
const TALK_HOLD_S = 0.7;

export type CharAnimState = {
  dir: AnimDir;
  mode: AnimMode;
  phase: number;
  frame: number;
  talkLeft: number;
  bobY: number;
  squashX: number;
};

export type CharAnimInput = {
  dx: number;
  dy: number;
  running: boolean;
  talk?: boolean;
  dt: number;
};

export function createCharAnim(dir: AnimDir = 'down'): CharAnimState {
  return {
    dir,
    mode: 'idle',
    phase: 0,
    frame: 0,
    talkLeft: 0,
    bobY: 0,
    squashX: 0,
  };
}

/** Map tile facing to a cardinal sheet direction (prefer horizontal on diagonals). */
export function dirFromDelta(dx: number, dy: number, fallback: AnimDir): AnimDir {
  if (!dx && !dy) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

function resolveMode(moving: boolean, running: boolean, talkLeft: number): AnimMode {
  if (talkLeft > 0 && !moving) return 'talk';
  if (moving && running) return 'run';
  if (moving) return 'walk';
  return 'idle';
}

function cycleSeconds(mode: AnimMode): number {
  if (mode === 'run') return RUN_CYCLE_S;
  if (mode === 'walk') return WALK_CYCLE_S;
  if (mode === 'talk') return TALK_CYCLE_S;
  return IDLE_CYCLE_S;
}

function framesFor(mode: AnimMode): number {
  if (mode === 'walk' || mode === 'run') return WALK_FRAMES;
  if (mode === 'talk') return TALK_FRAMES;
  return IDLE_FRAMES;
}

function stepMotion(mode: AnimMode, phase: number): { bobY: number; squashX: number } {
  const step = mode === 'walk' || mode === 'run';
  const amp = mode === 'run' ? 2 : 1.5;
  const bobY = step
    ? Math.round(Math.sin(phase * Math.PI * 2) * amp)
    : mode === 'idle'
      ? Math.round(Math.sin(phase * Math.PI * 2) * 0.6)
      : Math.round(Math.sin(phase * Math.PI * 2) * 1);
  const squashX = step
    ? Math.sin(phase * Math.PI * 2) * (mode === 'run' ? 0.35 : 0.25)
    : 0;
  return { bobY, squashX };
}

export function tickCharAnim(state: CharAnimState, input: CharAnimInput): CharAnimState {
  const moving = Boolean(input.dx || input.dy);
  const dir = moving ? dirFromDelta(input.dx, input.dy, state.dir) : state.dir;
  let talkLeft = Math.max(0, state.talkLeft - input.dt);
  if (input.talk) talkLeft = TALK_HOLD_S;
  const mode = resolveMode(moving, input.running, talkLeft);
  const cycle = cycleSeconds(mode);
  const frames = framesFor(mode);
  let phase = state.mode === mode ? state.phase : 0;
  phase = (phase + input.dt / cycle) % 1;
  const frame = Math.floor(phase * frames) % frames;
  const { bobY, squashX } = stepMotion(mode, phase);
  return { dir, mode, phase, frame, talkLeft, bobY, squashX };
}

export function frameCount(mode: AnimMode): number {
  return framesFor(mode);
}

export function idleBlinkClosed(state: CharAnimState): boolean {
  return state.mode === 'idle' && state.phase > 0.82 && state.phase < 0.9;
}

export type NpcIdleKind = 'breathe' | 'vendor' | 'dj' | 'phone' | 'none';

const VENDOR_IDS = ['vendor', 'kiko', 'catador', 'seu-ze'];
const DJ_IDS = ['dj', 'fio', 'antena'];
const PHONE_IDS = ['luna', 'influencer', 'mole', 'ceo'];

function idMatches(npcId: string, needles: string[]): boolean {
  return needles.some((n) => npcId.includes(n) || npcId === n);
}

export function npcIdleKindFor(npcId: string | undefined): NpcIdleKind {
  if (!npcId) return 'breathe';
  if (npcId.startsWith('elevator')) return 'none';
  if (idMatches(npcId, VENDOR_IDS)) return 'vendor';
  if (idMatches(npcId, DJ_IDS)) return 'dj';
  if (idMatches(npcId, PHONE_IDS)) return 'phone';
  return 'breathe';
}

export function npcIdleFrame(kind: NpcIdleKind, timeS: number): number {
  if (kind === 'none') return 0;
  if (kind === 'dj') return Math.floor((timeS * 6) % WALK_FRAMES);
  if (kind === 'vendor') return Math.floor((timeS * 2.2) % TALK_FRAMES);
  if (kind === 'phone') return Math.floor((timeS * 1.4) % IDLE_FRAMES);
  return Math.floor((timeS / IDLE_CYCLE_S) % IDLE_FRAMES);
}
