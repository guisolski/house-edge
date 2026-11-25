/** Localize skill phase prompts/options/clues for display (logic stays English). */

import { t } from './index';
import type { SkillDef, SkillPhase } from '../systems/minigame';

function lookup(key: string, fallback: string): string {
  const v = t(key);
  return v !== key ? v : fallback;
}

/** Prefix for a phase: `skill.{betId}` or `skill.{betId}.phase.{i}` when multi-phase. */
function phasePrefix(betId: string, phaseIndex: number, multi: boolean): string {
  return multi ? `skill.${betId}.phase.${phaseIndex}` : `skill.${betId}`;
}

export function localizePhase(
  betId: string,
  phase: SkillPhase,
  phaseIndex = 0,
  multi = false,
): SkillPhase {
  const prefix = phasePrefix(betId, phaseIndex, multi);
  const prompt = lookup(`${prefix}.prompt`, phase.prompt);
  const clue = phase.clue ? lookup(`${prefix}.clue`, phase.clue) : undefined;
  const options = phase.options?.map((opt, i) => lookup(`${prefix}.option.${i}`, opt));
  return { ...phase, prompt, clue, options: options ?? phase.options };
}

export function localizeSkillDef(betId: string, def: SkillDef): SkillDef {
  const multi = def.phases.length > 1;
  const titleKey = `skill.${betId}.title`;
  const blurbKey = `skill.${betId}.blurb`;
  const title = lookup(titleKey, def.title);
  const blurb = lookup(blurbKey, def.blurb);
  return {
    ...def,
    title,
    blurb,
    phases: def.phases.map((p, i) => localizePhase(betId, p, i, multi)),
  };
}
