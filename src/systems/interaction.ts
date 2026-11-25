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
    x: 10,
    y: 10,
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
    x: 30,
    y: 16,
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
    extraBeatIds: ['side-morro-copper'],
    safeJobId: 'safe-morro-neon',
    color: '#a0a0a0',
  },
  {
    id: 'kiko',
    name: 'Kiko',
    districtId: 'feira-central',
    x: 12,
    y: 14,
    beatId: 'feira-kiko',
    extraBeatIds: ['side-feira-ice'],
    jobBetId: 'pastel-surpresa',
    color: '#f5c518',
  },
  {
    id: 'catador-feira',
    name: 'Catador da Feira',
    districtId: 'feira-central',
    x: 20,
    y: 14,
    beatId: 'feira-catador',
    jobBetId: 'feira-garrafa',
    safeJobId: 'safe-feira-central',
    color: '#7bc96f',
  },
  {
    id: 'bia',
    name: 'Bia Forró',
    districtId: 'feira-central',
    x: 26,
    y: 14,
    beatId: 'bia-set',
    color: '#ff6eb4',
  },
  {
    id: 'forro-dj',
    name: 'DJ Forró',
    districtId: 'feira-central',
    x: 30,
    y: 14,
    beatId: 'feira-forro',
    jobBetId: 'forro-crowd',
    color: '#d946ef',
  },
  {
    id: 'luna-feira',
    name: 'Luna Pixel',
    districtId: 'feira-central',
    x: 34,
    y: 14,
    beatId: 'prova-luna',
    color: '#2bfff2',
  },
  {
    id: 'lavador-feira',
    name: 'Lavador da Feira',
    districtId: 'feira-central',
    x: 16,
    y: 15,
    beatId: 'feira-courier',
    safeJobId: 'safe-feira-central',
    color: '#6ec8e8',
  },
  {
    id: 'radio-pirate',
    name: 'Radio Pirate',
    districtId: 'feira-central',
    x: 26,
    y: 15,
    beatId: 'feira-radio',
    jobBetId: 'feira-radio',
    color: '#7bc96f',
  },
  {
    id: 'barraca-tia',
    name: 'Barraca Tia',
    districtId: 'feira-central',
    x: 8,
    y: 12,
    beatId: 'side-feira-mango',
    color: '#ff8c42',
  },
  {
    id: 'mole-contact',
    name: 'Mole Contact',
    districtId: 'avenida-odds',
    x: 20,
    y: 12,
    beatId: 'avenida-twist',
    jobBetId: 'twist-vazamento',
    color: '#888888',
  },
  {
    id: 'capita',
    name: 'Captain Vespera',
    districtId: 'avenida-odds',
    x: 12,
    y: 12,
    beatId: 'avenida-checkpoint',
    jobBetId: 'pixo-challenge',
    color: '#b8ff2b',
  },
  {
    id: 'influencer',
    name: 'Odds Influencer',
    districtId: 'avenida-odds',
    x: 36,
    y: 14,
    beatId: 'avenida-influencer',
    jobBetId: 'influencer-duelo',
    color: '#ff2bd6',
  },
  {
    id: 'atm-hacker',
    name: 'ATM Hacker',
    districtId: 'avenida-odds',
    // Spatially separate from story boulevard NPCs so side rematch doesn't steal E.
    x: 38,
    y: 17,
    beatId: 'avenida-atm',
    jobBetId: 'avenida-atm',
    color: '#ff3b5c',
  },
  {
    id: 'margin',
    name: 'Dr. Margin',
    districtId: 'avenida-odds',
    x: 28,
    y: 12,
    beatId: 'lobby-margin',
    color: '#4a6cff',
  },
  {
    id: 'mensageiro-avenida',
    name: 'Mensageiro',
    districtId: 'avenida-odds',
    x: 8,
    y: 11,
    beatId: 'avenida-radar',
    safeJobId: 'safe-avenida-odds',
    color: '#c9b037',
  },
  {
    id: 'neon-snap',
    name: 'Neon Snap',
    districtId: 'avenida-odds',
    x: 32,
    y: 17,
    beatId: 'side-avenida-neon',
    color: '#2bfff2',
  },
  {
    id: 'vip-host',
    name: 'VIP Host',
    districtId: 'torre-casa',
    x: 14,
    y: 10,
    beatId: 'torre-vip',
    jobBetId: 'torre-vip',
    color: '#ffd700',
  },
  {
    id: 'ceo',
    name: 'Augusto Casa',
    districtId: 'torre-casa',
    x: 18,
    y: 13,
    beatId: 'torre-final',
    color: '#ff3b5c',
  },
  {
    id: 'busboy-torre',
    name: 'Busboy',
    districtId: 'torre-casa',
    x: 24,
    y: 16,
    extraBeatIds: ['side-torre-tip'],
    safeJobId: 'safe-torre-casa',
    color: '#9aa0a6',
  },
];

/** Exit coords must be the single exit tile (see paintExitPad in maps.ts). */
const EXITS: readonly DistrictExit[] = [
  {
    id: 'morro-to-feira',
    districtId: 'morro-neon',
    x: 38,
    y: 16,
    toDistrict: 'feira-central',
    label: 'Exit → Central Fair',
  },
  {
    id: 'feira-to-morro',
    districtId: 'feira-central',
    x: 2,
    y: 13,
    toDistrict: 'morro-neon',
    label: 'Exit → Morro Neon',
  },
  {
    id: 'feira-to-avenida',
    districtId: 'feira-central',
    x: 41,
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
    x: 2,
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
  prefer?: (npc: WorldNpc) => boolean;
};

export function nearestNpc(q: NearestNpcQuery): WorldNpc | null {
  const preferred = pickNearest(q, q.prefer);
  return preferred ?? pickNearest(q);
}

function pickNearest(
  q: NearestNpcQuery,
  filter?: (npc: WorldNpc) => boolean,
): WorldNpc | null {
  let best: WorldNpc | null = null;
  let bestDist = Infinity;
  for (const npc of q.npcs) {
    if (npc.districtId !== q.districtId) continue;
    if (filter && !filter(npc)) continue;
    const d = distance(q.x, q.y, npc.x, npc.y);
    if (d <= INTERACT_RANGE && d < bestDist) {
      best = npc;
      bestDist = d;
    }
  }
  return best;
}

export function nearestExit(
  exits: readonly DistrictExit[],
  districtId: DistrictId,
  x: number,
  y: number,
): DistrictExit | null {
  let best: DistrictExit | null = null;
  let bestDist = Infinity;
  for (const exit of exits) {
    if (exit.districtId !== districtId) continue;
    const d = distance(x, y, exit.x, exit.y);
    if (d <= INTERACT_RANGE && d < bestDist) {
      best = exit;
      bestDist = d;
    }
  }
  return best;
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
  return [...NPCS];
}

export function districtExits(): DistrictExit[] {
  return [...EXITS];
}
