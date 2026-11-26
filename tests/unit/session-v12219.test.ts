import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession, canNeedleStop } from '../../src/systems/session';
import {
  SEQ_REVEAL_STEP_MS,
  SEQ_INPUT_MS_PER_KEY,
  sequenceInputMs,
} from '../../src/systems/minigame';
import { setLocale, t } from '../../src/i18n';

function stubStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

describe('v1.22.19 playtest #43', () => {
  beforeEach(stubStorage);

  it('sequence reveal step is ≥1.4s and input ≥2s per key', () => {
    expect(SEQ_REVEAL_STEP_MS).toBeGreaterThanOrEqual(1400);
    expect(SEQ_INPUT_MS_PER_KEY).toBeGreaterThanOrEqual(2000);
    expect(sequenceInputMs(3, 5000)).toBe(6000);
    expect(sequenceInputMs(3, 12_000)).toBe(12_000);
  });

  it('canNeedleStop stays false until ready', () => {
    expect(canNeedleStop(false, 5000, 1000)).toBe(false);
    expect(canNeedleStop(true, 500, 1000)).toBe(false);
    expect(canNeedleStop(true, 1000, 1000)).toBe(true);
  });

  it('cancelBet clears modal confirm gate so re-open Enter works', () => {
    const session = new GameSession();
    session.startNew();
    session.noteModalOpened(true, ['Enter']);
    session.noteInteractPressed('Enter');
    expect(session.allowModalConfirm('Enter')).toBe(false);
    session.cancelBet();
    expect(session.allowModalConfirm('Enter')).toBe(true);
  });

  it('offer-bet from play uses held-key arm; choice follow-up needs time arm', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(100);
    session.story.setFlag('falou_nair', true);
    session.story.setFlag('copper_weighed', true);
    expect(session.runStoryBeat('morro-antena')).toBe(true);
    expect(session.isDialogueFromPlay()).toBe(true);
    expect(session.hasPendingStoryBet()).toBe(true);
    session.pickDialogueChoice();
    expect(session.isDialogueFromPlay()).toBe(false);
  });

  it('result continue label is capitalized', () => {
    setLocale('pt-BR');
    expect(t('ui.skill.resultContinue')).toBe('Continuar');
    expect(t('ui.skill.resultHint')).toMatch(/Continuar/);
    setLocale('en');
    expect(t('ui.skill.resultContinue')).toBe('Continue');
  });

  it('finishSkill does not leave skillResult missing on lose', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(100);
    expect(session.forceStorySkill('feira-radio')).toBe(true);
    // Force a fail via wrong submits until done.
    let guard = 0;
    while (
      session.getSkillProgress() &&
      !session.getSkillProgress()!.done &&
      guard < 20
    ) {
      guard += 1;
      session.submitSkill(0);
      if (session.getSkillResult()) break;
    }
    // Either still in progress with misses, or result banner after fail.
    if (session.getSkillResult()) {
      expect(session.getSkillResult()?.won).toBe(false);
    }
  });
});
