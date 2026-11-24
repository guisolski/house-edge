import type { GameSave, PlayerStats, DistrictId } from '../core/types';

export const SAVE_VERSION = 1 as const;
const STORAGE_KEY = 'house-edge-save-v1';

export function createDefaultSave(): GameSave {
  return {
    version: SAVE_VERSION,
    player: {
      credits: 120,
      reputation: 0,
      agua: 1,
      fichas: 3,
      x: 8,
      y: 15,
      districtId: 'morro-neon',
    },
    flags: {},
    completedBeats: [],
    unlockedDistricts: ['morro-neon'],
    muted: false,
    masterVolume: 0.7,
    upgrades: {},
  };
}

export function serializeSave(save: GameSave): string {
  return JSON.stringify(save);
}

export function parseSave(raw: string): GameSave | null {
  try {
    const data = JSON.parse(raw) as Partial<GameSave>;
    if (data.version !== SAVE_VERSION) return null;
    if (!data.player || !Array.isArray(data.unlockedDistricts)) return null;
    return normalizeSave(data);
  } catch {
    return null;
  }
}

export function saveToStorage(
  save: GameSave,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, serializeSave(save));
}

export function loadFromStorage(
  storage: Pick<Storage, 'getItem'> = localStorage,
): GameSave | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return parseSave(raw);
}

export function clearStorage(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

function normalizeSave(data: Partial<GameSave>): GameSave {
  const base = createDefaultSave();
  return {
    version: SAVE_VERSION,
    player: { ...base.player, ...(data.player as PlayerStats) },
    flags: data.flags ?? {},
    completedBeats: data.completedBeats ?? [],
    unlockedDistricts: (data.unlockedDistricts as DistrictId[]) ?? ['morro-neon'],
    muted: data.muted ?? false,
    masterVolume: data.masterVolume ?? 0.7,
    upgrades: data.upgrades ?? {},
  };
}
