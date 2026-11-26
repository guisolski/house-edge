/** Playtest #42/#44/#45: skill win/lose + lockpick feedback formatting. */

import { t, tf } from '../i18n';

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

/** Playtest #45: plain post-test line — "Pino 1 baixo, Pino 2 certo". */
export function formatLockpickVerdictLine(verdicts: ('ok' | 'low' | 'high')[]): string {
  return verdicts
    .map((v, i) => {
      const n = String(i + 1);
      if (v === 'ok') return tf('ui.skill.pinPlainOk', { n });
      if (v === 'low') return tf('ui.skill.pinPlainLow', { n });
      return tf('ui.skill.pinPlainHigh', { n });
    })
    .join(', ');
}

/** Short chip label under each pin. */
export function formatLockpickPinVerdict(v: 'ok' | 'low' | 'high' | undefined): string {
  if (v === 'ok') return t('ui.skill.pinChipOk');
  if (v === 'low') return t('ui.skill.pinChipLow');
  if (v === 'high') return t('ui.skill.pinChipHigh');
  return '';
}
