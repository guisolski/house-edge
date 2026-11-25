/** Player-facing UI copy — resolved through i18n (en / pt-BR). */

import pkg from '../../package.json';
import { t } from '../i18n';

type UiBag = {
  title: string;
  tagline: string;
  newGame: string;
  continue: string;
  resume: string;
  menu: string;
  mute: string;
  unmute: string;
  credits: string;
  reputation: string;
  interact: string;
  bet: string;
  travel: string;
  grind: string;
  upgrades: string;
  story: string;
  close: string;
  takeBet: string;
  walkAway: string;
  confirmBet: string;
  cancel: string;
  stakeUp: string;
  stakeDown: string;
  version: string;
  wonEnding: string;
  endingBlurb: string;
  creditsTitle: string;
  creditsThanks: string;
  skipCredits: string;
  continueExploring: string;
  playAgain: string;
  playAgainConfirm: string;
  playAgainYes: string;
  playAgainNo: string;
  hintKeyboard: string;
  hintGamepad: string;
  hintTouch: string;
  hintMenuKeyboard: string;
  hintMenuGamepad: string;
  hintMenuTouch: string;
  noJobs: string;
  noStory: string;
  promptTalk: string;
  promptExit: string;
  promptBet: string;
  lockpickHintKeyboard: string;
  lockpickHintGamepad: string;
  lockpickHintTouch: string;
  needleMissHint: string;
  language: string;
  languageEn: string;
  languagePt: string;
  settings: string;
  tutorialSkip: string;
  tutorialNext: string;
  tutorialDone: string;
};

/** Live UI strings. Prefer `t('ui.*')` for new code; this keeps call sites stable. */
export const UI: UiBag = new Proxy({} as UiBag, {
  get(_target, prop: string | symbol): string {
    if (typeof prop !== 'string') return '';
    if (prop === 'version') return `v${pkg.version}`;
    return t(`ui.${prop}`);
  },
});
