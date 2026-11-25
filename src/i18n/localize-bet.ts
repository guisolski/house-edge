/** Localize bet title/description for UI panels. */

import type { BetDefinition } from '../core/types';
import { t } from './index';

function lookup(key: string, fallback: string): string {
  const v = t(key);
  return v !== key ? v : fallback;
}

export function localizeBet(bet: BetDefinition): BetDefinition {
  return {
    ...bet,
    title: lookup(`bet.${bet.id}.title`, bet.title),
    description: lookup(`bet.${bet.id}.description`, bet.description),
  };
}
