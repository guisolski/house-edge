/** Skippable New Game onboarding + first-time minigame tips. */

import type { InputMode } from './input-mode';

export type TutorialStepId = 'move' | 'interact' | 'objective' | 'bets' | 'creditsRep';

/** Player actions that can auto-advance the matching step. */
export type TutorialAction = 'moved' | 'interacted' | 'sawObjective' | 'firstBet';

export type MinigameTipId =
  'timing' | 'lockpick' | 'choice' | 'hack' | 'negotiate' | 'stealth' | 'duel';

const STEPS: TutorialStepId[] = ['move', 'interact', 'objective', 'bets', 'creditsRep'];

const ACTION_FOR_STEP: Partial<Record<TutorialStepId, TutorialAction>> = {
  move: 'moved',
  interact: 'interacted',
  objective: 'sawObjective',
  bets: 'firstBet',
};

export type TutorialState = {
  active: boolean;
  stepIndex: number;
  skipped: boolean;
  seenTips: Record<string, boolean>;
  /** Hide panel while a dialog/menu/minigame owns the screen. */
  overlayHidden: boolean;
};

function tipFlags(flags?: Record<string, boolean>): Record<string, boolean> {
  const keys = [
    'timing',
    'lockpick',
    'choice',
    'hack',
    'negotiate',
    'stealth',
    'duel',
  ] as const;
  const seen: Record<string, boolean> = {};
  for (const k of keys) seen[k] = Boolean(flags?.[`tip_${k}`]);
  return seen;
}

export function createTutorialState(flags?: Record<string, boolean>): TutorialState {
  const done = Boolean(flags?.tutorialDone);
  return {
    active: !done,
    stepIndex: 0,
    skipped: done,
    seenTips: tipFlags(flags),
    overlayHidden: false,
  };
}

export function tutorialStepId(state: TutorialState): TutorialStepId | null {
  if (!state.active || state.skipped) return null;
  return STEPS[state.stepIndex] ?? null;
}

export function tutorialPanelVisible(state: TutorialState): boolean {
  return state.active && !state.skipped && !state.overlayHidden;
}

export function setTutorialOverlayHidden(
  state: TutorialState,
  hidden: boolean,
): TutorialState {
  if (state.overlayHidden === hidden) return state;
  return { ...state, overlayHidden: hidden };
}

export function advanceTutorial(state: TutorialState): TutorialState {
  if (!state.active) return state;
  const next = state.stepIndex + 1;
  if (next >= STEPS.length) {
    return {
      ...state,
      active: false,
      stepIndex: STEPS.length,
      skipped: false,
      overlayHidden: false,
    };
  }
  return { ...state, stepIndex: next };
}

/** Advance when the player does the action matching the current step. */
export function noteTutorialAction(
  state: TutorialState,
  action: TutorialAction,
): TutorialState {
  const step = tutorialStepId(state);
  if (!step) return state;
  if (ACTION_FOR_STEP[step] !== action) return state;
  return advanceTutorial(state);
}

export function skipTutorial(state: TutorialState): TutorialState {
  return {
    ...state,
    active: false,
    skipped: true,
    stepIndex: STEPS.length,
    overlayHidden: false,
  };
}

export function tutorialFinished(state: TutorialState): boolean {
  return !state.active;
}

export function tutorialFlags(state: TutorialState): Record<string, boolean> {
  const flags: Record<string, boolean> = {
    tutorialDone: tutorialFinished(state),
  };
  for (const [k, v] of Object.entries(state.seenTips)) {
    if (v) flags[`tip_${k}`] = true;
  }
  return flags;
}

export function consumeMinigameTip(
  state: TutorialState,
  kind: string,
): { state: TutorialState; tip: MinigameTipId | null } {
  const id = kind as MinigameTipId;
  if (!(id in state.seenTips)) return { state, tip: null };
  if (state.seenTips[id]) return { state, tip: null };
  return {
    state: {
      ...state,
      seenTips: { ...state.seenTips, [id]: true },
    },
    tip: id,
  };
}

/** Resolve copy key for the current step + input device. */
export function tutorialCopyKey(step: TutorialStepId, mode: InputMode): string {
  if (step === 'move' || step === 'interact') {
    return `ui.tutorial.${step}.${mode}`;
  }
  return `ui.tutorial.${step}`;
}

export function minigameTipKey(id: MinigameTipId): string {
  return `ui.minigameTip.${id}`;
}

export function tutorialStepCount(): number {
  return STEPS.length;
}
