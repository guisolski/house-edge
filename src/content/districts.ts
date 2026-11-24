import type { DistrictDef } from '../core/types';
import { Palette } from './palette';

/** LD-2/LD-7: distinct district identity + landmarks. Sizes match maps.ts. */
export const DISTRICTS: readonly DistrictDef[] = [
  {
    id: 'morro-neon',
    name: 'Morro Neon',
    blurb: 'Favela lajes, stairs, stacked houses, LED tower on the ridge.',
    unlockFlag: null,
    width: 42,
    height: 30,
    spawn: { x: 8, y: 15 },
    color: Palette.brasilGreen,
    accent: Palette.neonMagenta,
  },
  {
    id: 'feira-central',
    name: 'Central Fair',
    blurb: 'Calçadão plaza, pastel stalls, wave paving.',
    unlockFlag: 'unlocked_feira',
    width: 44,
    height: 28,
    spawn: { x: 8, y: 14 },
    color: Palette.brasilYellow,
    accent: Palette.neonCyan,
  },
  {
    id: 'avenida-odds',
    name: 'Odds Avenue',
    blurb: 'Wide neon boulevard with glass OddsCorp towers.',
    unlockFlag: 'unlocked_avenida',
    width: 48,
    height: 28,
    spawn: { x: 6, y: 12 },
    color: Palette.brasilBlue,
    accent: Palette.neonLime,
  },
  {
    id: 'torre-casa',
    name: 'Casa Suprema Tower',
    blurb: 'Corporate casino floor — the final table.',
    unlockFlag: 'unlocked_torre',
    width: 44,
    height: 28,
    spawn: { x: 8, y: 13 },
    color: Palette.neonMagenta,
    accent: Palette.brasilYellow,
  },
] as const;
