import type { DistrictId } from '../core/types';
import { englishNpcName } from '../i18n/localize-npc';

export type WorldNpc = {
  id: string;
  name: string;
  districtId: DistrictId;
  x: number;
  y: number;
  /** Anchor for wander leash (defaults to spawn x/y). */
  homeX?: number;
  homeY?: number;
  /** Max tile drift from home. Quest NPCs stay ≤0.35; ambient ≤1.25. */
  wanderRadius?: number;
  beatId?: string;
  /** Extra story beats this NPC can start (return arcs, side quests). */
  extraBeatIds?: string[];
  jobBetId?: string;
  safeJobId?: string;
  color: string;
  /** Body / hair / outfit silhouette variant (0–5). */
  bodyVariant?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Casa tower floor — VIP map only shows vip NPCs. */
  floor?: 'foyer' | 'vip';
};

/** Odds Avenue Neon Snap corridor — NPCs must never stand here. */
export function inNeonSnapLane(x: number, y: number): boolean {
  return x >= 12 && x <= 34 && (y === 11 || y === 12);
}

/** Quest / objective NPCs stay planted — ambient crowd may drift. */
const QUEST_NPC_IDS = new Set([
  'dona-nair',
  'kiko',
  'neon-snap',
  'foyer-guard',
  'mole-contact',
  'luna',
  'luna-feira',
  'ceo',
  'vip-host',
  'seu-ze',
  'fio-ladrao',
  'bia',
]);

export function npcStoryBeatIds(npc: WorldNpc): string[] {
  return [npc.beatId, ...(npc.extraBeatIds ?? [])].filter((id): id is string =>
    Boolean(id),
  );
}

export type DistrictExit = {
  id: string;
  districtId: DistrictId;
  x: number;
  y: number;
  toDistrict: DistrictId;
  label: string;
};

/** Generous tile radius (~3.5 tiles / ~170px) so E is not fiddly. */
export const INTERACT_RANGE = 3.5;

const NPCS: readonly WorldNpc[] = [
  {
    id: 'dona-nair',
    name: englishNpcName('dona-nair'),
    districtId: 'morro-neon',
    // Spawn plaza asphalt — same band as Rita spawn (12,16), easy first talk.
    x: 13,
    y: 16,
    wanderRadius: 0,
    beatId: 'boteco-nair',
    extraBeatIds: ['morro-return-nair', 'epilogue-laje'],
    jobBetId: 'agua-gelada',
    color: '#1faa5a',
  },
  {
    id: 'antena-tech',
    name: englishNpcName('antena-tech'),
    districtId: 'morro-neon',
    // Open terrace with 4-way escape — clear of Nair + RAMP sign.
    x: 11,
    y: 9,
    wanderRadius: 0,
    beatId: 'morro-antena',
    extraBeatIds: ['side-morro-tank'],
    jobBetId: 'antena-sinal',
    color: '#b8ff2b',
  },
  {
    id: 'luna',
    name: englishNpcName('luna'),
    districtId: 'morro-neon',
    // Open asphalt plaza — south of house footprints (in front / reachable).
    x: 22,
    y: 16,
    beatId: 'luna-beco',
    color: '#2bfff2',
  },
  {
    id: 'fio-ladrao',
    name: englishNpcName('fio-ladrao'),
    districtId: 'morro-neon',
    // North terrace with 4-way escape — clear of Luna plaza bubble.
    x: 16,
    y: 9,
    wanderRadius: 0,
    beatId: 'morro-fios',
    extraBeatIds: ['morro-return-fio'],
    jobBetId: 'fio-corrida',
    color: '#ff8c42',
  },
  {
    id: 'seu-ze',
    name: englishNpcName('seu-ze'),
    districtId: 'morro-neon',
    // Lower plaza asphalt cross — clear of Fair pad (38,22).
    x: 27,
    y: 23,
    wanderRadius: 0,
    beatId: 'seu-ze-banca',
    jobBetId: 'corrida-moto',
    color: '#ffdf00',
  },
  {
    id: 'catador-morro',
    name: englishNpcName('catador-morro'),
    districtId: 'morro-neon',
    x: 4,
    y: 16,
    beatId: 'side-morro-copper',
    safeJobId: 'safe-morro-neon',
    color: '#a0a0a0',
    bodyVariant: 2,
  },
  {
    id: 'kiko',
    name: englishNpcName('kiko'),
    districtId: 'feira-central',
    x: 10,
    y: 12,
    wanderRadius: 0,
    beatId: 'feira-kiko',
    extraBeatIds: ['side-feira-ice'],
    jobBetId: 'pastel-surpresa',
    color: '#f5c518',
    bodyVariant: 1,
  },
  {
    id: 'catador-feira',
    name: englishNpcName('catador-feira'),
    districtId: 'feira-central',
    // South aisle — clear of Dancer Sol + Bia interact bubbles.
    x: 26,
    y: 16,
    wanderRadius: 0,
    beatId: 'feira-catador',
    jobBetId: 'feira-garrafa',
    safeJobId: 'safe-feira-central',
    color: '#7bc96f',
    bodyVariant: 2,
  },
  {
    id: 'bia',
    name: englishNpcName('bia'),
    districtId: 'feira-central',
    // North stage — clear of Catador (26,16) tag stack.
    x: 18,
    y: 10,
    beatId: 'bia-set',
    color: '#ff6eb4',
    bodyVariant: 3,
  },
  {
    id: 'dancer-feira',
    name: englishNpcName('dancer-feira'),
    districtId: 'feira-central',
    // North of catador aisle — outside Catador interact bubble (playtest #29).
    x: 22,
    y: 12,
    wanderRadius: 0,
    beatId: 'feira-dancer',
    color: '#ff9f1c',
    bodyVariant: 1,
  },
  {
    id: 'forro-dj',
    name: englishNpcName('forro-dj'),
    districtId: 'feira-central',
    // East stage — clear of Odds pad (38,13) and Dancer (26,14).
    x: 34,
    y: 10,
    beatId: 'feira-forro',
    jobBetId: 'forro-crowd',
    color: '#d946ef',
    bodyVariant: 2,
  },
  {
    id: 'stage-hand',
    name: englishNpcName('stage-hand'),
    districtId: 'feira-central',
    x: 30,
    y: 16,
    beatId: 'feira-lockbox',
    jobBetId: 'feira-lockbox',
    color: '#c9b037',
    bodyVariant: 4,
  },
  {
    id: 'luna-feira',
    name: englishNpcName('luna-feira'),
    districtId: 'feira-central',
    // Clear of east exit pad (38,13) and the south aisle cluster.
    x: 34,
    y: 16,
    beatId: 'prova-luna',
    color: '#2bfff2',
  },
  {
    id: 'lavador-feira',
    name: englishNpcName('lavador-feira'),
    districtId: 'feira-central',
    // Playtest #36: mid-plaza asphalt — not tucked behind south stalls.
    x: 16,
    y: 13,
    beatId: 'feira-courier',
    safeJobId: 'safe-feira-central',
    color: '#6ec8e8',
    bodyVariant: 0,
  },
  {
    id: 'radio-pirate',
    name: englishNpcName('radio-pirate'),
    districtId: 'feira-central',
    // Playtest #36: open plaza east of Lavador, clear of stall lips.
    x: 26,
    y: 13,
    beatId: 'feira-radio',
    jobBetId: 'feira-radio',
    color: '#7bc96f',
    bodyVariant: 3,
  },
  {
    id: 'barraca-tia',
    name: englishNpcName('barraca-tia'),
    districtId: 'feira-central',
    // Clear of west exit pad (5,13).
    x: 10,
    y: 16,
    beatId: 'feira-tipster',
    extraBeatIds: ['side-feira-mango'],
    color: '#ff8c42',
    bodyVariant: 1,
  },
  {
    id: 'mole-contact',
    name: englishNpcName('mole-contact'),
    districtId: 'avenida-odds',
    // Playtest #38: clear of Fair sign + corridor mouth; walkable 4-way.
    x: 10,
    y: 13,
    wanderRadius: 0,
    beatId: 'avenida-twist',
    extraBeatIds: ['avenida-betrayal'],
    jobBetId: 'twist-vazamento',
    color: '#888888',
    bodyVariant: 2,
  },
  {
    id: 'capita',
    name: englishNpcName('capita'),
    districtId: 'avenida-odds',
    // Playtest #38: south of center lanes so east walks aren't visually fenced.
    x: 7,
    y: 12,
    wanderRadius: 0,
    beatId: 'avenida-checkpoint',
    jobBetId: 'pixo-challenge',
    color: '#b8ff2b',
    bodyVariant: 1,
  },
  {
    id: 'courier-odds',
    name: englishNpcName('courier-odds'),
    districtId: 'avenida-odds',
    // Playtest #38: off Fair stand + west of corridor mouth.
    x: 10,
    y: 10,
    wanderRadius: 0,
    beatId: 'avenida-courier',
    color: '#c9b037',
    bodyVariant: 0,
  },
  {
    id: 'influencer',
    name: englishNpcName('influencer'),
    districtId: 'avenida-odds',
    x: 37,
    y: 11,
    beatId: 'avenida-influencer',
    jobBetId: 'influencer-duelo',
    color: '#ff2bd6',
    bodyVariant: 3,
  },
  {
    id: 'atm-hacker',
    name: englishNpcName('atm-hacker'),
    districtId: 'avenida-odds',
    x: 39,
    y: 13,
    beatId: 'avenida-atm',
    jobBetId: 'avenida-atm',
    color: '#ff3b5c',
    bodyVariant: 2,
  },
  {
    id: 'stealth-cam',
    name: englishNpcName('stealth-cam'),
    districtId: 'avenida-odds',
    x: 36,
    y: 13,
    beatId: 'avenida-stealth',
    color: '#6ec8e8',
    bodyVariant: 1,
  },
  {
    id: 'margin',
    name: englishNpcName('margin'),
    districtId: 'avenida-odds',
    x: 39,
    y: 10,
    beatId: 'lobby-margin',
    color: '#4a6cff',
    bodyVariant: 0,
  },
  {
    id: 'mensageiro-avenida',
    name: englishNpcName('mensageiro-avenida'),
    districtId: 'avenida-odds',
    x: 36,
    y: 10,
    beatId: 'avenida-radar',
    safeJobId: 'safe-avenida-odds',
    color: '#c9b037',
  },
  {
    id: 'cage-runner',
    name: englishNpcName('cage-runner'),
    districtId: 'avenida-odds',
    // Playtest #38: clear of Fair pad + signs; walkable 4-way.
    x: 6,
    y: 13,
    wanderRadius: 0,
    beatId: 'avenida-server',
    jobBetId: 'avenida-server',
    color: '#7bc96f',
    bodyVariant: 4,
  },
  {
    id: 'neon-snap',
    name: englishNpcName('neon-snap'),
    districtId: 'avenida-odds',
    // Playtest #38: west of corridor mouth so (11,11) east-into-column stays clear.
    x: 8,
    y: 11,
    wanderRadius: 0,
    beatId: 'avenida-drone',
    extraBeatIds: ['side-avenida-neon'],
    jobBetId: 'avenida-drone',
    color: '#2bfff2',
  },
  {
    id: 'foyer-guard',
    name: englishNpcName('foyer-guard'),
    districtId: 'torre-casa',
    // Playtest #31: west of dealer — tags don’t stack.
    x: 10,
    y: 14,
    wanderRadius: 0,
    beatId: 'torre-foyer',
    color: '#6ec8e8',
    bodyVariant: 1,
    floor: 'foyer',
  },
  {
    id: 'pit-dealer',
    name: englishNpcName('pit-dealer'),
    districtId: 'torre-casa',
    x: 16,
    y: 14,
    beatId: 'torre-pit',
    jobBetId: 'torre-pit',
    color: '#d946ef',
    bodyVariant: 2,
    floor: 'foyer',
  },
  {
    id: 'elevator',
    name: englishNpcName('elevator'),
    districtId: 'torre-casa',
    x: 24,
    y: 11,
    beatId: 'torre-elevator',
    color: '#c8d0d8',
    floor: 'foyer',
  },
  {
    id: 'elevator-vip',
    name: englishNpcName('elevator-vip'),
    districtId: 'torre-casa',
    x: 20,
    y: 9,
    color: '#c8d0d8',
    floor: 'vip',
  },
  {
    id: 'vip-host',
    name: englishNpcName('vip-host'),
    districtId: 'torre-casa',
    // Clear of VIP SALON neon (14,4) and elevator pad (20,9).
    x: 30,
    y: 13,
    beatId: 'torre-vip',
    extraBeatIds: ['torre-negotiate'],
    jobBetId: 'torre-vip',
    color: '#ffd700',
    bodyVariant: 3,
    floor: 'vip',
  },
  {
    id: 'ceo',
    name: englishNpcName('ceo'),
    districtId: 'torre-casa',
    // VIP salon with 4-way escape — clear of elevator pad (20,9).
    x: 32,
    y: 14,
    wanderRadius: 0,
    beatId: 'torre-final',
    color: '#ff3b5c',
    bodyVariant: 0,
    floor: 'vip',
  },
  {
    id: 'busboy-torre',
    name: englishNpcName('busboy-torre'),
    districtId: 'torre-casa',
    x: 34,
    y: 16,
    extraBeatIds: ['side-torre-tip'],
    safeJobId: 'safe-torre-casa',
    color: '#9aa0a6',
    floor: 'foyer',
  },
];

/** Exit coords must be the single exit tile (see paintExitPad in maps.ts). */
const EXITS: readonly DistrictExit[] = [
  {
    id: 'morro-to-feira',
    districtId: 'morro-neon',
    x: 38,
    y: 22,
    toDistrict: 'feira-central',
    label: 'Exit → Central Fair',
  },
  {
    id: 'feira-to-morro',
    districtId: 'feira-central',
    x: 3,
    y: 12,
    toDistrict: 'morro-neon',
    label: 'Exit → Morro Neon',
  },
  {
    id: 'feira-to-avenida',
    districtId: 'feira-central',
    x: 38,
    y: 13,
    toDistrict: 'avenida-odds',
    label: 'Exit → Odds Avenue',
  },
  {
    id: 'avenida-to-feira',
    districtId: 'avenida-odds',
    x: 2,
    y: 12,
    toDistrict: 'feira-central',
    label: 'Exit → Central Fair',
  },
  {
    id: 'avenida-to-torre',
    districtId: 'avenida-odds',
    x: 43,
    y: 12,
    toDistrict: 'torre-casa',
    label: 'Exit → Casa Tower',
  },
  {
    id: 'torre-to-avenida',
    districtId: 'torre-casa',
    x: 5,
    y: 18,
    toDistrict: 'avenida-odds',
    label: 'Exit → Odds Avenue',
  },
];

export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export type NearestNpcQuery = {
  npcs: readonly WorldNpc[];
  districtId: DistrictId;
  x: number;
  y: number;
  /** Last facing vector (tile steps). Biases toward the NPC the player faces. */
  faceDx?: number;
  faceDy?: number;
  prefer?: (npc: WorldNpc) => boolean;
};

export function nearestNpc(q: NearestNpcQuery): WorldNpc | null {
  const preferred = pickNearest(q, q.prefer);
  return preferred ?? pickNearest(q);
}

/** Lower score is better: distance, with a facing bonus when looking toward the NPC. */
export function npcPickScore(
  q: { x: number; y: number; faceDx?: number; faceDy?: number },
  npc: WorldNpc,
): number {
  const d = distance(q.x, q.y, npc.x, npc.y);
  const fdx = q.faceDx ?? 0;
  const fdy = q.faceDy ?? 0;
  if (!fdx && !fdy) return d;
  const toX = npc.x - q.x;
  const toY = npc.y - q.y;
  const len = Math.hypot(toX, toY) || 1;
  const facing = (fdx * toX + fdy * toY) / len;
  // Facing the NPC subtracts up to ~1.2 tiles from the effective distance.
  return d - Math.max(0, facing) * 1.2;
}

function pickNearest(
  q: NearestNpcQuery,
  filter?: (npc: WorldNpc) => boolean,
): WorldNpc | null {
  let best: WorldNpc | null = null;
  let bestScore = Infinity;
  for (const npc of q.npcs) {
    if (npc.districtId !== q.districtId) continue;
    if (filter && !filter(npc)) continue;
    const d = distance(q.x, q.y, npc.x, npc.y);
    if (d > INTERACT_RANGE) continue;
    const score = npcPickScore(q, npc);
    if (score < bestScore) {
      best = npc;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Doorway trigger radius — covers the painted plus-shaped exit pad
 * (center ± cardinals), not just the exact arrow tile.
 */
/** Playtest #32: slightly larger so Avenida→Torre Entrar is not a pixel hunt. */
export const EXIT_STAND_RANGE = 2.35;
/** Hysteresis: latch clears only after leaving this larger radius (stops bounce-back). */
export const EXIT_CLEAR_RANGE = 3.2;
/** Tiles inward from the reciprocal pad on arrival (must exceed CLEAR). */
export const EXIT_ARRIVAL_OFFSET = 7;
/** Cooldown after travel before any pad can re-arm (≥1.5s run toward pad). */
export const EXIT_COOLDOWN_MS = 1600;
/** Dwell on the pad before walk-in fires (playtest #26 accidental triggers). */
export const EXIT_DWELL_MS = 220;

/** Inward facing + spawn offset so arrival is never standing on the pad. */
export function arrivalSpawnFromPad(pad: {
  x: number;
  y: number;
  districtId: DistrictId;
}): { x: number; y: number; dx: number; dy: number } {
  // West-edge pads face east; east-edge pads face west.
  const dx = pad.x < 20 ? 1 : -1;
  const dy = 0;
  return {
    x: pad.x + dx * EXIT_ARRIVAL_OFFSET,
    y: pad.y + dy * EXIT_ARRIVAL_OFFSET,
    dx,
    dy,
  };
}

export type NearestExitQuery = {
  exits: readonly DistrictExit[];
  districtId: DistrictId;
  x: number;
  y: number;
  range?: number;
};

export function nearestExit(q: NearestExitQuery): DistrictExit | null {
  const range = q.range ?? EXIT_STAND_RANGE;
  let best: DistrictExit | null = null;
  let bestDist = Infinity;
  for (const exit of q.exits) {
    if (exit.districtId !== q.districtId) continue;
    const d = distance(q.x, q.y, exit.x, exit.y);
    if (d <= range && d < bestDist) {
      best = exit;
      bestDist = d;
    }
  }
  return best;
}

export function npcBodyVariant(id: string): 0 | 1 | 2 | 3 | 4 | 5 {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 6) as 0 | 1 | 2 | 3 | 4 | 5;
}

export function inRange(a: {
  x: number;
  y: number;
  tx: number;
  ty: number;
  range?: number;
}): boolean {
  return distance(a.x, a.y, a.tx, a.ty) <= (a.range ?? INTERACT_RANGE);
}

export function districtNpcs(): WorldNpc[] {
  return NPCS.map((n) => {
    const homeX = n.homeX ?? n.x;
    const homeY = n.homeY ?? n.y;
    // Any story/side-beat NPC stays planted so objective markers don't drift.
    const isQuest = QUEST_NPC_IDS.has(n.id) || Boolean(n.beatId);
    const wanderRadius = n.wanderRadius ?? (isQuest ? 0 : 1.1);
    return {
      ...n,
      homeX,
      homeY,
      wanderRadius,
      bodyVariant: n.bodyVariant ?? npcBodyVariant(n.id),
    };
  });
}

/** Tiny ambient drift, leashed to home; never into the Neon Snap lane. */
export function tickNpcWander(npc: WorldNpc, dt: number, phase: number): void {
  const homeX = npc.homeX ?? npc.x;
  const homeY = npc.homeY ?? npc.y;
  const radius = npc.wanderRadius ?? 0;
  if (radius <= 0.01) {
    npc.x = homeX;
    npc.y = homeY;
    return;
  }
  const { x, y } = leashWanderPoint({ homeX, homeY, radius, dt, phase });
  if (npc.districtId === 'avenida-odds' && inNeonSnapLane(x, y)) {
    npc.x = homeX;
    npc.y = homeY;
    return;
  }
  npc.x = x;
  npc.y = y;
}

function leashWanderPoint(o: {
  homeX: number;
  homeY: number;
  radius: number;
  dt: number;
  phase: number;
}): { x: number; y: number } {
  const ox = Math.sin(o.phase * 0.7 + o.homeX) * o.radius * 0.55;
  const oy = Math.cos(o.phase * 0.55 + o.homeY) * o.radius * 0.45;
  let nx = o.homeX + ox * Math.min(1, o.dt * 2);
  let ny = o.homeY + oy * Math.min(1, o.dt * 2);
  const dx = nx - o.homeX;
  const dy = ny - o.homeY;
  const d = Math.hypot(dx, dy);
  if (d > o.radius) {
    nx = o.homeX + (dx / d) * o.radius;
    ny = o.homeY + (dy / d) * o.radius;
  }
  return { x: nx, y: ny };
}

export function districtExits(): DistrictExit[] {
  return [...EXITS];
}
