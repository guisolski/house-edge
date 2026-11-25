import { beforeEach, describe, expect, it } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { setLocale } from '../../src/i18n';

function mockStorage(): void {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
    configurable: true,
  });
}

describe('session tutorial + locale dialogue', () => {
  beforeEach(mockStorage);

  it('starts tutorial on new game and advances to done', () => {
    const s = new GameSession(7);
    s.startNew();
    expect(s.getTutorial().active).toBe(true);
    expect(s.tutorialStep()).toBe('move');
    while (s.getTutorial().active) s.advanceTutorialStep();
    expect(s.tutorialStep()).toBeNull();
    expect(s.story.getFlag('tutorialDone')).toBe(true);
  });

  it('skipTutorialNow marks the flag', () => {
    const s = new GameSession(8);
    s.startNew();
    s.skipTutorialNow();
    expect(s.getTutorial().active).toBe(false);
    expect(s.story.getFlag('tutorialDone')).toBe(true);
  });

  it('peekMinigameTip returns once per kind', () => {
    const s = new GameSession(9);
    s.startNew();
    s.skipTutorialNow();
    expect(s.peekMinigameTip('timing')).toBe('timing');
    expect(s.peekMinigameTip('timing')).toBeNull();
    expect(s.peekMinigameTip('not-a-kind')).toBeNull();
  });

  it('localizes Dona Nair dialogue in pt-BR', () => {
    setLocale('pt-BR');
    const s = new GameSession(10);
    s.startNew();
    s.skipTutorialNow();
    expect(s.runStoryBeat('boteco-nair')).toBe(true);
    const line = s.getDialogue()[0];
    expect(line?.speaker).toBe('Dona Nair');
    expect(line?.text).toMatch(/Rita|água|corp/i);
    setLocale('en');
  });
});
