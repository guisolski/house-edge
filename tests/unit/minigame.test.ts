import { describe, expect, it } from 'vitest';
import { BETS } from '../../src/content/bets';
import {
  attemptSkill,
  choiceClueCoversAnswer,
  judgePhase,
  perfectAttempt,
  phaseSequence,
  SEQ_KEYS,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';

describe('minigame skill system', () => {
  it('maps story bets to skill defs (no pure RNG)', () => {
    const antena = skillForBet('antena-sinal', 'hack');
    expect(antena?.kind).toBe('hack');
    expect(phaseSequence(antena!.phases[0]!).length).toBe(3);

    const first = skillForBet('agua-gelada', 'timing');
    expect(first?.phases[0]?.window).toBeGreaterThanOrEqual(0.2);

    const duel = skillForBet('duelo-casa', 'duel');
    expect(duel?.phases).toHaveLength(3);
  });

  it('timing succeeds inside the green window', () => {
    const phase = {
      kind: 'timing' as const,
      prompt: 'x',
      target: 0.5,
      window: 0.1,
    };
    expect(judgePhase(phase, 0.55)).toBe(true);
    expect(judgePhase(phase, 0.7)).toBe(false);
  });

  it('choice/puzzle require the exact target index', () => {
    const phase = {
      kind: 'choice' as const,
      prompt: 'x',
      target: 1,
      options: ['a', 'b', 'c'],
    };
    expect(judgePhase(phase, 1)).toBe(true);
    expect(judgePhase(phase, 0)).toBe(false);
  });

  it('Simon sequence shows keys and fails on a wrong tap', () => {
    const def = skillForBet('fio-corrida', 'chase')!;
    const seq = phaseSequence(def.phases[0]!);
    expect(seq.length).toBeGreaterThanOrEqual(3);
    let p = startSkill(def);
    p = attemptSkill(p, {
      phaseIndex: 0,
      value: SEQ_KEYS.indexOf(seq[0]!),
    });
    expect(p.done).toBe(false);
    expect(p.seqIndex).toBe(1);
    // Wrong key fails the encounter.
    const wrong = (SEQ_KEYS.indexOf(seq[1]!) + 1) % SEQ_KEYS.length;
    p = attemptSkill(p, { phaseIndex: 0, value: wrong });
    expect(p.done).toBe(true);
    expect(p.won).toBe(false);
  });

  it('duel requires all phases; one miss fails the encounter', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    p = attemptSkill(p, perfectAttempt(p));
    expect(p.done).toBe(false);
    p = attemptSkill(p, { phaseIndex: 1, value: 0 }); // wrong choice
    expect(p.done).toBe(true);
    expect(p.won).toBe(false);
  });

  it('perfect attempts clear a full duel including Simon phase 3', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    while (!p.done) p = attemptSkill(p, perfectAttempt(p));
    expect(p.won).toBe(true);
    expect(p.cleared).toBe(3);
  });

  it('every choice/puzzle story gate has a clue naming the correct answer', () => {
    const skillBets = BETS.filter(
      (b) => b.skill === 'choice' || b.skill === 'puzzle' || b.skill === 'duel',
    );
    expect(skillBets.length).toBeGreaterThan(5);
    for (const bet of skillBets) {
      const def = skillForBet(bet.id, bet.skill)!;
      for (const phase of def.phases) {
        if (phase.kind !== 'choice' && phase.kind !== 'puzzle') continue;
        expect(
          choiceClueCoversAnswer(phase),
          `${bet.id} phase "${phase.prompt}" clue="${phase.clue}"`,
        ).toBe(true);
      }
    }
    expect(
      choiceClueCoversAnswer({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['Alpha'],
        clue: 'nope',
      }),
    ).toBe(false);
    expect(
      choiceClueCoversAnswer({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['Alpha'],
      }),
    ).toBe(false);
    expect(
      choiceClueCoversAnswer({
        kind: 'timing',
        prompt: 'x',
        target: 0.5,
      }),
    ).toBe(true);
  });

  it('covers every skill kind blurb and multi-phase progress', () => {
    for (const kind of ['timing', 'choice', 'puzzle', 'chase', 'hack', 'duel'] as const) {
      const def = skillForBet(`cov-${kind}`, kind);
      expect(def?.blurb.length).toBeGreaterThan(0);
      expect(def?.phases.length).toBeGreaterThan(0);
    }
    const weird = skillForBet('x', 'not-a-kind' as never);
    expect(weird?.blurb).toMatch(/Skill check|Stop|Read|Find|Reproduce|Match|Multi/i);
    const def = skillForBet('pastel-surpresa', 'puzzle')!;
    let p = startSkill(def);
    p = attemptSkill(p, { phaseIndex: 0, value: 2 });
    expect(p.won).toBe(true);
    expect(attemptSkill(p, { phaseIndex: 0, value: 0 }).done).toBe(true);
  });
});
