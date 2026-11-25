/** Apply locale catalogs to story dialogue lines. */

import type { DialogueLine } from '../core/types';
import { t } from './index';

export function localizeBeatDialogue(
  beatId: string,
  lines: DialogueLine[],
): DialogueLine[] {
  return lines.map((line, i) => localizeLine(beatId, i, line));
}

function localizeLine(beatId: string, i: number, line: DialogueLine): DialogueLine {
  const base = `story.${beatId}.${i}`;
  return {
    speaker: t(`${base}.speaker`),
    text: t(`${base}.text`),
    choices: line.choices?.map((c, j) => ({
      ...c,
      label: t(`${base}.choice.${j}.label`),
      reply: c.reply ? t(`${base}.choice.${j}.reply`) : undefined,
    })),
  };
}

/** Extra hush-chip line prepended before torre-final dialogue. */
export function localizeHushLine(): DialogueLine {
  return {
    speaker: t('story.torre-final.hush.speaker'),
    text: t('story.torre-final.hush.text'),
  };
}
