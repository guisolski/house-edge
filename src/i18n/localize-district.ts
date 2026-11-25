/** Localized district display names for travel UI + prompts. */

import type { DistrictId } from '../core/types';
import { DISTRICTS } from '../content/districts';
import { t } from './index';

const SHORT_FALLBACK: Record<string, string> = {
  'morro-neon': 'Morro Neon',
  'feira-central': 'Central Fair',
  'avenida-odds': 'Odds Avenue',
  'torre-casa': 'Casa Tower',
};

export function localizeDistrictName(id: string): string {
  const key = `district.${id}.name`;
  const v = t(key);
  if (v !== key) return v;
  return DISTRICTS.find((d) => d.id === id)?.name ?? SHORT_FALLBACK[id] ?? id;
}

/** Shorter tower / fair labels for markers (matches prior English short names). */
export function localizeDistrictShort(id: string): string {
  if (id === 'torre-casa') return localizeDistrictName('torre-casa');
  return localizeDistrictName(id);
}

export function isDistrictId(id: string): id is DistrictId {
  return DISTRICTS.some((d) => d.id === id);
}
