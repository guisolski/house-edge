/** Localized NPC display name for UI (tags, prompts, dialogue speakers). */

import { t } from './index';
import { npcEn } from './npc-en';

export type NamedNpc = { id: string; name: string };

/** English fallback from catalog (same strings interaction.ts uses as name). */
export function englishNpcName(id: string): string {
  return npcEn[`npc.${id}.name` as keyof typeof npcEn] ?? id;
}

/** UI display name for the active locale; falls back to npc.name then id. */
export function localizedNpcName(npc: NamedNpc): string {
  const key = `npc.${npc.id}.name`;
  const v = t(key);
  if (v !== key) return v;
  return npc.name || englishNpcName(npc.id);
}
