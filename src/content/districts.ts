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
    height: 26,
    spawn: { x: 8, y: 14 },
    color: Palette.brasilYellow,
    accent: Palette.neonCyan,
  },
  {
    id: 'avenida-odds',
    name: 'Odds Avenue',
    blurb: 'Wide neon boulevard with glass OddsCorp towers.',
    unlockFlag: 'unlocked_avenida',
    width: 46,
    height: 24,
    // Clear of west Fair exit pad (5,12) + stand margin so arrival isn't a bounce-back.
    spawn: { x: 12, y: 12 },
    color: Palette.brasilBlue,
    accent: Palette.neonLime,
  },
  {
    id: 'torre-casa',
    name: 'Casa Suprema Tower',
    blurb: 'Luxury casino floor — carpet, VIP tables, chandelier glow.',
    unlockFlag: 'unlocked_torre',
    width: 40,
    height: 24,
    spawn: { x: 10, y: 13 },
    color: Palette.neonMagenta,
    accent: Palette.brasilYellow,
  },
] as const;
