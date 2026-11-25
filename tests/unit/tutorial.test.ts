import { describe, expect, it } from 'vitest';
import {
  advanceTutorial,
  consumeMinigameTip,
  createTutorialState,
  skipTutorial,
  tutorialCopyKey,
  tutorialFinished,
  tutorialFlags,
  tutorialStepId,
} from '../../src/systems/tutorial';

describe('tutorial', () => {
  it('starts active for new games', () => {
    const s = createTutorialState();
    expect(s.active).toBe(true);
    expect(tutorialStepId(s)).toBe('move');
  });

  it('skips when tutorialDone flag is set', () => {
    const s = createTutorialState({ tutorialDone: true });
    expect(s.active).toBe(false);
    expect(tutorialFinished(s)).toBe(true);
  });

  it('advances through all steps then finishes', () => {
    let s = createTutorialState();
    const seen: string[] = [];
    while (s.active) {
      const id = tutorialStepId(s);
      if (id) seen.push(id);
      s = advanceTutorial(s);
    }
    expect(seen).toEqual(['move', 'interact', 'objective', 'bets', 'creditsRep']);
    expect(tutorialFlags(s).tutorialDone).toBe(true);
  });

  it('skip finishes immediately', () => {
    const s = skipTutorial(createTutorialState());
    expect(tutorialFinished(s)).toBe(true);
    expect(tutorialStepId(s)).toBeNull();
  });

  it('adapts move/interact copy keys to input mode', () => {
    expect(tutorialCopyKey('move', 'keyboard')).toBe('ui.tutorial.move.keyboard');
    expect(tutorialCopyKey('move', 'touch')).toBe('ui.tutorial.move.touch');
    expect(tutorialCopyKey('interact', 'gamepad')).toBe('ui.tutorial.interact.gamepad');
    expect(tutorialCopyKey('objective', 'keyboard')).toBe('ui.tutorial.objective');
  });

  it('shows each minigame tip only once', () => {
    let s = createTutorialState();
    const first = consumeMinigameTip(s, 'timing');
    expect(first.tip).toBe('timing');
    s = first.state;
    const second = consumeMinigameTip(s, 'timing');
    expect(second.tip).toBeNull();
    expect(tutorialFlags(second.state).tip_timing).toBe(true);
  });
});
