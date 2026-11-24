import type { DistrictId } from '../core/types';

export type WorldNpc = {
  id: string;
  name: string;
  districtId: DistrictId;
  x: number;
  y: number;
  beatId?: string;
  jobBetId?: string;
  color: string;
};

export type DistrictExit = {
  id: string;
  districtId: DistrictId;
  x: number;
  y: number;
  toDistrict: DistrictId;
  label: string;
};

const INTERACT_RANGE = 1.6;

const NPCS: readonly WorldNpc[] = [
  {
    id: 'dona-nair',
    name: 'Dona Nair',
    districtId: 'morro-neon',
    x: 14,
    y: 15,
    beatId: 'boteco-nair',
    jobBetId: 'agua-gelada',
    color: '#1faa5a',
  },
  {
    id: 'luna',
    name: 'Luna Pixel',
    districtId: 'morro-neon',
    x: 26,
    y: 14,
    beatId: 'luna-beco',
    color: '#2bfff2',
  },
  {
    id: 'seu-ze',
    name: 'Seu Zé',
    districtId: 'morro-neon',
    x: 32,
    y: 16,
    beatId: 'seu-ze-banca',
    jobBetId: 'laje-lottery',
    color: '#ffdf00',
  },
  {
    id: 'kiko',
    name: 'Kiko',
    districtId: 'feira-central',
    x: 16,
    y: 16,
    beatId: 'feira-kiko',
    jobBetId: 'pastel-surpresa',
    color: '#f5c518',
  },
  {
    id: 'bia',
    name: 'Bia Forró',
    districtId: 'feira-central',
    x: 28,
    y: 14,
    beatId: 'bia-set',
    color: '#ff6eb4',
  },
  {
    id: 'luna-feira',
    name: 'Luna Pixel',
    districtId: 'feira-central',
    x: 34,
    y: 16,
    beatId: 'prova-luna',
    color: '#2bfff2',
  },
  {
    id: 'capita',
    name: 'Captain Vespera',
    districtId: 'avenida-odds',
    x: 12,
    y: 15,
    beatId: 'avenida-checkpoint',
    jobBetId: 'pixo-challenge',
    color: '#b8ff2b',
  },
  {
    id: 'margin',
    name: 'Dr. Margin',
    districtId: 'avenida-odds',
    x: 30,
    y: 15,
    beatId: 'lobby-margin',
    color: '#002776',
  },
  {
    id: 'ceo',
    name: 'Augusto Casa',
    districtId: 'torre-casa',
    x: 18,
    y: 14,
    beatId: 'torre-final',
    color: '#ff3b5c',
  },
];

const EXITS: readonly DistrictExit[] = [
  {
    id: 'morro-to-feira',
    districtId: 'morro-neon',
    x: 40,
    y: 15,
    toDistrict: 'feira-central',
    label: 'Exit → Central Fair',
  },
  {
    id: 'feira-to-morro',
    districtId: 'feira-central',
    x: 2,
    y: 16,
    toDistrict: 'morro-neon',
    label: 'Exit → Morro Neon',
  },
  {
    id: 'feira-to-avenida',
    districtId: 'feira-central',
    x: 42,
    y: 16,
    toDistrict: 'avenida-odds',
    label: 'Exit → Odds Avenue',
  },
  {
    id: 'avenida-to-feira',
    districtId: 'avenida-odds',
    x: 2,
    y: 15,
    toDistrict: 'feira-central',
    label: 'Exit → Central Fair',
  },
  {
    id: 'avenida-to-torre',
    districtId: 'avenida-odds',
    x: 44,
    y: 15,
    toDistrict: 'torre-casa',
    label: 'Exit → Casa Tower',
  },
  {
    id: 'torre-to-avenida',
    districtId: 'torre-casa',
    x: 2,
    y: 14,
    toDistrict: 'avenida-odds',
    label: 'Exit → Odds Avenue',
  },
];

export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function nearestNpc(
  npcs: readonly WorldNpc[],
  districtId: DistrictId,
  x: number,
  y: number,
): WorldNpc | null {
  let best: WorldNpc | null = null;
  let bestDist = Infinity;
  for (const npc of npcs) {
    if (npc.districtId !== districtId) continue;
    const d = distance(x, y, npc.x, npc.y);
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
