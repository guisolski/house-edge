/** Playtest #42/#44: skill win/lose headline formatting. */

import { tf } from '../i18n';

/**
 * Signed deltas for the result card.
 * Lose with 0 credit change omits the credits segment (never an em dash placeholder).
 */
export function formatSkillResultHeadline(
  won: boolean,
  creditsDelta: number,
  repDelta: number,
): string {
  const credits =
    creditsDelta > 0
      ? `+${creditsDelta}`
      : creditsDelta === 0
        ? '0'
        : `−${Math.abs(creditsDelta)}`;
  const rep = repDelta > 0 ? `+${repDelta}` : repDelta === 0 ? '0' : String(repDelta);
  if (won) return tf('ui.skill.resultWin', { credits, rep });
  if (creditsDelta === 0) return tf('ui.skill.resultLoseNoCredits', { rep });
  return tf('ui.skill.resultLose', { credits, rep });
}
