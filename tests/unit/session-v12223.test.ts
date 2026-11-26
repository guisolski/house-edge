import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  attemptSkill,
  judgeTimingStop,
  perfectAttempt,
  skillForBet,
  startSkill,
  timingZone,
} from '../../src/systems/minigame';
import { needleStartOutsideZone } from '../../src/systems/needle-arm';
import { setLocale, tf } from '../../src/i18n';

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

describe('v1.22.23 needle start outside zone', () => {
  it('needleStartOutsideZone is never inside the green zone', () => {
    const phase = skillForBet('samba-odds', 'timing')!.phases[0]!;
    const zone = timingZone(phase, 0);
    for (let seed = 0; seed < 40; seed += 1) {
      const pos = needleStartOutsideZone(zone, seed);
      expect(judgeTimingStop(pos, zone)).toBe(false);
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThan(1);
    }
  });
});

describe('v1.22.23 sequence miss → fail card, not silent replay', () => {
  beforeEach(stubStorage);

  it('soft miss sets Errou n/max miss card and keeps encounter live', () => {
    setLocale('pt-BR');
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(200);
    expect(session.forceStorySkill('feira-radio')).toBe(true);
    const p0 = session.getSkillProgress()!;
    const wrong = (perfectAttempt(p0).value + 1) % 8;
    session.submitSkill(wrong);
    const card = session.getSkillMissCard();
    expect(card).toBeTruthy();
    expect(card!.headline + card!.detail).toMatch(/Errou\s*1\s*\/\s*2|1\s*\/\s*2/i);
    expect(session.getSkillProgress()?.done).toBe(false);
    expect(session.getSkillResult()).toBeNull();
  });

  it('second sequence miss stays on miss card (no auto-lose Continuar banner)', () => {
    setLocale('pt-BR');
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(200);
    expect(session.forceStorySkill('feira-radio')).toBe(true);
    let p = session.getSkillProgress()!;
    const wrong = (perfectAttempt(p).value + 1) % 8;
    session.submitSkill(wrong);
    session.retrySkillMiss();
    p = session.getSkillProgress()!;
    session.submitSkill((perfectAttempt(p).value + 1) % 8);
    expect(session.getSkillMissCard()).toBeTruthy();
    expect(session.getSkillResult()).toBeNull();
    expect(session.getSkillProgress()?.done).toBe(false);
  });
});

describe('v1.22.23 QA sandbox + title nav helpers', () => {
  beforeEach(stubStorage);

  it('?minigame win does not finish a story beat or leave pending dialogue', () => {
    const session = new GameSession();
    session.startNew();
    session.skipTutorialNow();
    expect(session.debugOpenMinigame('needle')).toBe(true);
    expect(session.isQaSandbox()).toBe(true);
    while (session.getSkillProgress() && !session.getSkillProgress()!.done) {
      const p = session.getSkillProgress()!;
      session.clearNeedleArm();
      session.submitSkill(perfectAttempt(p).value);
      if (session.getSkillMissCard()) session.retrySkillMiss();
    }
    if (session.getSkillResult()) session.dismissSkillResult();
    expect(session.isQaSandbox()).toBe(false);
    expect(session.getPendingStoryBeat()).toBeNull();
    expect(session.ui.is('play')).toBe(true);
    expect(session.getDialogue().length).toBe(0);
  });

  it('skill title equals phase prompt for single-phase → prompt is redundant', () => {
    const def = skillForBet('torre-negotiate', 'negotiate')!;
    expect(def.title).toBe(def.phases[0]!.prompt);
  });

  it('miss feedback i18n key exists', () => {
    setLocale('pt-BR');
    expect(tf('ui.skill.missSeqFeedback', { current: '1', max: '2' })).toMatch(
      /Errou|1\/2/i,
    );
  });
});

describe('v1.22.23 sequence maxMisses does not auto-finish', () => {
  it('attemptSkill at maxMisses stays soft (done=false)', () => {
    const def = skillForBet('feira-radio', 'hack')!;
    let p = startSkill(def);
    const phase = def.phases[0]!;
    const cap = phase.maxMisses ?? 2;
    for (let i = 0; i < cap; i += 1) {
      const wrong = (perfectAttempt(p).value + 1) % 8;
      p = attemptSkill(p, { phaseIndex: 0, value: wrong });
      expect(p.done).toBe(false);
      expect(p.misses).toBe(i + 1);
    }
  });
});
