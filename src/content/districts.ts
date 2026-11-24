import type { DistrictDef } from '../core/types';
import { Palette } from './palette';

export const DISTRICTS: readonly DistrictDef[] = [
  {
    id: 'morro-neon',
    name: 'Morro Neon',
    blurb:
      'A vertical favela lit by LED veins. Botecos, rooftop lajes, and street odds terminals.',
    unlockFlag: null,
    width: 24,
    height: 18,
    spawn: { x: 8, y: 12 },
    color: Palette.brasilGreen,
    accent: Palette.neonMagenta,
  },
  {
    id: 'feira-central',
    name: 'Central Fair',
    blurb:
      'A 24h open market with Copacabana-wave sidewalks, pastel stalls, cane juice, and live odds.',
    unlockFlag: 'unlocked_feira',
    width: 28,
    height: 20,
    spawn: { x: 4, y: 10 },
    color: Palette.brasilYellow,
    accent: Palette.neonCyan,
  },
  {
    id: 'avenida-odds',
    name: 'Odds Avenue',
    blurb:
      'Brazilian bet corporations in glass and pixo. Industrial funk on the asphalt.',
    unlockFlag: 'unlocked_avenida',
    width: 30,
    height: 18,
    spawn: { x: 6, y: 9 },
    color: Palette.brasilBlue,
    accent: Palette.neonLime,
  },
  {
    id: 'torre-casa',
    name: 'Casa Suprema Tower',
    blurb: 'HQ of the megacorp that addicted the country to odds. Heart of the scheme.',
    unlockFlag: 'unlocked_torre',
    width: 20,
    height: 16,
    spawn: { x: 10, y: 14 },
    color: Palette.neonMagenta,
    accent: Palette.brasilYellow,
  },
] as const;
