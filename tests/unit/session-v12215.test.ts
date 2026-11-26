import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  SEQ_KEYS,
  SEQ_REVEAL_STEP_MS,
  isSequencePhase,
  phaseSequence,
  sequenceRevealMs,
} from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
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

describe('v1.22.15 lockpick copy', () => {
  beforeEach(stubStorage);

  it('uses one short testar/test verb across hint + button (pt-BR + en)', () => {
    setLocale('pt-BR');
    const hint = t('ui.lockpickHintKeyboard');
    expect(hint.length).toBeLessThanOrEqual(56);
    expect(hint).toMatch(/Enter testar/);
    expect(hint).not.toMatch(/Enviar/i);
    expect(t('ui.skill.submitLock')).toBe('Testar');
    expect(hint).toMatch(/certo\/baixo\/alto/);
    expect(t('ui.lockpickHintGamepad')).toMatch(/testar/i);
    expect(t('ui.lockpickHintTouch')).toMatch(/Testar/);

    setLocale('en');
    const enHint = t('ui.lockpickHintKeyboard');
    expect(enHint.length).toBeLessThanOrEqual(56);
    expect(enHint).toMatch(/Enter test/i);
    expect(enHint).not.toMatch(/Submit/i);
    expect(t('ui.skill.submitLock')).toBe('Test');
    expect(enHint).toMatch(/set\/low\/high/);
    expect(t('ui.lockpickHintGamepad')).toMatch(/test/i);
    expect(t('ui.lockpickHintTouch')).toMatch(/Test/);
  });
});

describe('v1.22.15 sequence memorize reveal', () => {
  it('each step is ≥600ms and feira-radio reveal covers all keys', () => {
    expect(SEQ_REVEAL_STEP_MS).toBeGreaterThanOrEqual(600);
    const seq = phaseSequence(SKILL_PHASE_TABLE['feira-radio']!);
    expect(seq).toEqual(['←', '→', '↑']);
    expect(sequenceRevealMs(seq.length)).toBeGreaterThanOrEqual(seq.length * 600);
  });

  it('every sequence phase has a non-empty sequence and reveal budget', () => {
    for (const [id, phase] of Object.entries(SKILL_PHASE_TABLE)) {
      if (!isSequencePhase(phase)) continue;
      const seq = phaseSequence(phase);
      expect(seq.length, id).toBeGreaterThan(0);
      expect(sequenceRevealMs(seq.length), id).toBeGreaterThanOrEqual(
        seq.length * SEQ_REVEAL_STEP_MS,
      );
    }
  });
});

describe('v1.22.15 skill result banner', () => {
  beforeEach(stubStorage);

  it('finishSkill keeps a dismissible result with credits/rep deltas', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(200);
    session.world.unlock('feira-central');
    session.travelTo('feira-central');
    session.story.setFlag('lockbox_ok', true);
    expect(session.runStoryBeat('feira-radio')).toBe(true);
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.ui.is('skill')).toBe(true);
    // Drive the sequence to completion without the harness auto-dismiss.
    let guard = 0;
    while (
      session.getSkillProgress() &&
      !session.getSkillProgress()!.done &&
      guard < 32
    ) {
      guard += 1;
      const p = session.getSkillProgress()!;
      const phase = p.def.phases[p.phaseIndex]!;
      const seq = phaseSequence(phase);
      session.submitSkill(SEQ_KEYS.indexOf(seq[p.seqIndex]!));
    }
    const result = session.getSkillResult();
    expect(result).not.toBeNull();
    expect(result!.won).toBe(true);
    expect(result!.creditsDelta).toBeGreaterThan(0);
    expect(typeof result!.repDelta).toBe('number');
    expect(session.ui.is('skill')).toBe(true);
    session.dismissSkillResult();
    expect(session.getSkillResult()).toBeNull();
    expect(session.ui.is('play')).toBe(true);
  });
});
