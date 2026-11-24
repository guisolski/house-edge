import type { DistrictDef } from '../core/types';
import { Palette } from './palette';

/** LD-2/LD-7: distinct district identity + landmarks. */
export const DISTRICTS: readonly DistrictDef[] = [
  {
    id: 'morro-neon',
    name: 'Morro Neon',
    blurb: 'Favela lajes, botecos, LED tower weenie on the ridge.',
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
    blurb: 'Calçadão plaza landmark, pastel stalls, cane juice odds.',
    unlockFlag: 'unlocked_feira',
    width: 44,
    height: 32,
    spawn: { x: 6, y: 16 },
    color: Palette.brasilYellow,
    accent: Palette.neonCyan,
  },
  {
    id: 'avenida-odds',
    name: 'Odds Avenue',
    blurb: 'Glass OddsCorp corridor; checkpoints and pixo.',
    unlockFlag: 'unlocked_avenida',
    width: 46,
    height: 30,
    spawn: { x: 6, y: 15 },
    color: Palette.brasilBlue,
    accent: Palette.neonLime,
  },
  {
    id: 'torre-casa',
    name: 'Casa Suprema Tower',
    blurb: 'The Casa weenie — final table.',
    unlockFlag: 'unlocked_torre',
    width: 36,
    height: 28,
    spawn: { x: 8, y: 14 },
    color: Palette.neonMagenta,
    accent: Palette.brasilYellow,
  },
] as const;
