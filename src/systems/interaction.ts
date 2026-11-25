import type { DistrictId } from '../core/types';

export type WorldNpc = {
  id: string;
  name: string;
  districtId: DistrictId;
  x: number;
  y: number;
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
    name: 'Dona Nair',
    districtId: 'morro-neon',
    x: 13,
    y: 14,
    beatId: 'boteco-nair',
    extraBeatIds: ['morro-return-nair', 'epilogue-laje'],
    jobBetId: 'agua-gelada',
    color: '#1faa5a',
  },
  {
    id: 'antena-tech',
    name: 'Antena Tech',
    districtId: 'morro-neon',
    // Clear of RAMP neon (7,12) and BOTECO (8,11).
    x: 6,
    y: 9,
    beatId: 'morro-antena',
    extraBeatIds: ['side-morro-tank'],
    jobBetId: 'antena-sinal',
    color: '#b8ff2b',
  },
  {
    id: 'luna',
    name: 'Luna Pixel',
    districtId: 'morro-neon',
    x: 26,
    y: 16,
    beatId: 'luna-beco',
    color: '#2bfff2',
  },
  {
    id: 'fio-ladrao',
    name: 'Fio Ladrão',
    districtId: 'morro-neon',
    x: 18,
    y: 10,
    beatId: 'morro-fios',
    extraBeatIds: ['morro-return-fio'],
    jobBetId: 'fio-corrida',
    color: '#ff8c42',
  },
  {
    id: 'seu-ze',
    name: 'Seu Zé',
    districtId: 'morro-neon',
    // South of ODDS 24h (24,8) — clear of neon + Fair exit pad (36,16).
    x: 30,
    y: 18,
    beatId: 'seu-ze-banca',
    jobBetId: 'laje-lottery',
    color: '#ffdf00',
  },
  {
    id: 'catador-morro',
    name: 'Catador do Morro',
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
    name: 'Kiko',
    districtId: 'feira-central',
    x: 10,
    y: 12,
    beatId: 'feira-kiko',
    extraBeatIds: ['side-feira-ice'],
    jobBetId: 'pastel-surpresa',
    color: '#f5c518',
    bodyVariant: 1,
  },
  {
    id: 'catador-feira',
    name: 'Catador da Feira',
    districtId: 'feira-central',
    // South aisle — clear of FEIRA neon (15,8).
    x: 20,
    y: 15,
    beatId: 'feira-catador',
    jobBetId: 'feira-garrafa',
    safeJobId: 'safe-feira-central',
    color: '#7bc96f',
    bodyVariant: 2,
  },
  {
    id: 'bia',
    name: 'Bia Forró',
    districtId: 'feira-central',
    x: 24,
    y: 11,
    beatId: 'bia-set',
    color: '#ff6eb4',
    bodyVariant: 3,
  },
  {
    id: 'dancer-feira',
    name: 'Dancer Sol',
    districtId: 'feira-central',
    x: 28,
    y: 11,
    beatId: 'feira-dancer',
    color: '#ff9f1c',
    bodyVariant: 1,
  },
  {
    id: 'forro-dj',
    name: 'DJ Forró',
    districtId: 'feira-central',
    x: 32,
    y: 12,
    beatId: 'feira-forro',
    jobBetId: 'forro-crowd',
    color: '#d946ef',
    bodyVariant: 2,
  },
  {
    id: 'stage-hand',
    name: 'Stage Hand',
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
    name: 'Luna Pixel',
    districtId: 'feira-central',
    // Clear of east exit pad (38,13) — interact radius must not cover Travel.
    x: 32,
    y: 16,
    beatId: 'prova-luna',
    color: '#2bfff2',
  },
  {
    id: 'lavador-feira',
    name: 'Lavador da Feira',
    districtId: 'feira-central',
    x: 14,
    y: 16,
    beatId: 'feira-courier',
    safeJobId: 'safe-feira-central',
    color: '#6ec8e8',
    bodyVariant: 0,
  },
  {
    id: 'radio-pirate',
    name: 'Radio Pirate',
    districtId: 'feira-central',
    x: 22,
    y: 16,
    beatId: 'feira-radio',
    jobBetId: 'feira-radio',
    color: '#7bc96f',
    bodyVariant: 3,
  },
  {
    id: 'barraca-tia',
    name: 'Barraca Tia',
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
    name: 'Mole Contact',
    districtId: 'avenida-odds',
    // Boulevard south edge — clear of ODDS 24h neon (16,5) and barricade.
    x: 12,
    y: 14,
    beatId: 'avenida-twist',
    extraBeatIds: ['avenida-betrayal'],
    jobBetId: 'twist-vazamento',
    color: '#888888',
    bodyVariant: 2,
  },
  {
    id: 'capita',
    name: 'Captain Vespera',
    districtId: 'avenida-odds',
    x: 10,
    y: 10,
    beatId: 'avenida-checkpoint',
    jobBetId: 'pixo-challenge',
    color: '#b8ff2b',
    bodyVariant: 1,
  },
  {
    id: 'courier-odds',
    name: 'Casa Courier',
    districtId: 'avenida-odds',
    x: 22,
    y: 10,
    beatId: 'avenida-courier',
    color: '#c9b037',
    bodyVariant: 0,
  },
  {
    id: 'influencer',
    name: 'Odds Influencer',
    districtId: 'avenida-odds',
    // Keep on asphalt — south wall (y 15–18) is blocked for Neon Snap.
    x: 34,
    y: 11,
    beatId: 'avenida-influencer',
    jobBetId: 'influencer-duelo',
    color: '#ff2bd6',
    bodyVariant: 3,
  },
  {
    id: 'atm-hacker',
    name: 'ATM Hacker',
    districtId: 'avenida-odds',
    // North asphalt lane — clear of torre pad (43,12) by > INTERACT_RANGE.
    x: 38,
    y: 9,
    beatId: 'avenida-atm',
    jobBetId: 'avenida-atm',
    color: '#ff3b5c',
    bodyVariant: 2,
  },
  {
    id: 'stealth-cam',
    name: 'Lobby Cam Tech',
    districtId: 'avenida-odds',
    // South of CASA SUPREMA neon (28,5), east of barricade.
    x: 36,
    y: 14,
    beatId: 'avenida-stealth',
    color: '#6ec8e8',
    bodyVariant: 1,
  },
  {
    id: 'margin',
    name: 'Dr. Margin',
    districtId: 'avenida-odds',
    x: 22,
    y: 14,
    beatId: 'lobby-margin',
    color: '#4a6cff',
    bodyVariant: 0,
  },
  {
    id: 'mensageiro-avenida',
    name: 'Mensageiro',
    districtId: 'avenida-odds',
    // Mid-boulevard — west Fair pad sits on the edge (2,12).
    x: 16,
    y: 13,
    beatId: 'avenida-radar',
    safeJobId: 'safe-avenida-odds',
    color: '#c9b037',
  },
  {
    id: 'cage-runner',
    name: 'Cage Runner',
    districtId: 'avenida-odds',
    x: 14,
    y: 14,
    beatId: 'avenida-server',
    jobBetId: 'avenida-server',
    color: '#7bc96f',
    bodyVariant: 4,
  },
  {
    id: 'neon-snap',
    name: 'Neon Snap',
    districtId: 'avenida-odds',
    // Asphalt corridor — south barricade (y 15–18) is solid collision.
    x: 30,
    y: 12,
    beatId: 'avenida-drone',
    extraBeatIds: ['side-avenida-neon'],
    jobBetId: 'avenida-drone',
    color: '#2bfff2',
  },
  {
    id: 'foyer-guard',
    name: 'Foyer Guard',
    districtId: 'torre-casa',
    x: 8,
    y: 14,
    beatId: 'torre-foyer',
    color: '#6ec8e8',
    bodyVariant: 1,
    floor: 'foyer',
  },
  {
    id: 'pit-dealer',
    name: 'Pit Dealer',
    districtId: 'torre-casa',
    x: 14,
    y: 14,
    beatId: 'torre-pit',
    jobBetId: 'torre-pit',
    color: '#d946ef',
    bodyVariant: 2,
    floor: 'foyer',
  },
  {
    id: 'elevator',
    // Canvas tag hidden — neon already says ELEVATOR ↑.
    name: 'Elevator',
    districtId: 'torre-casa',
    x: 24,
    y: 11,
    beatId: 'torre-elevator',
    color: '#c8d0d8',
    floor: 'foyer',
  },
  {
    id: 'elevator-vip',
    // Canvas tag hidden — neon already says ELEVATOR ↓.
    name: 'Elevator',
    districtId: 'torre-casa',
    x: 20,
    y: 9,
    color: '#c8d0d8',
    floor: 'vip',
  },
  {
    id: 'vip-host',
    name: 'VIP Host',
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
    name: 'Augusto Casa',
    districtId: 'torre-casa',
    // Keep clear of the VIP elevator (20,9) so E on the pad uses the car.
    x: 32,
    y: 15,
    beatId: 'torre-final',
    color: '#ff3b5c',
    bodyVariant: 0,
    floor: 'vip',
  },
  {
    id: 'busboy-torre',
    name: 'Busboy',
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
    x: 36,
    y: 16,
    toDistrict: 'feira-central',
    label: 'Exit → Central Fair',
  },
  {
    id: 'feira-to-morro',
    districtId: 'feira-central',
    x: 5,
    y: 13,
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
    y: 12,
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

/** Doorway trigger radius — walk-in fires inside this. */
export const EXIT_STAND_RANGE = 2.2;
/** Hysteresis: latch clears only after leaving this larger radius (stops bounce-back). */
export const EXIT_CLEAR_RANGE = 4.2;
/** Tiles inward from the reciprocal pad on arrival (must exceed CLEAR). */
export const EXIT_ARRIVAL_OFFSET = 5;
/** Cooldown after travel before any pad can re-arm (≥1.5s run toward pad). */
export const EXIT_COOLDOWN_MS = 1600;

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
  return NPCS.map((n) => ({
    ...n,
    bodyVariant: n.bodyVariant ?? npcBodyVariant(n.id),
  }));
}

export function districtExits(): DistrictExit[] {
  return [...EXITS];
}
