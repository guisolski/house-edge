import { describe, expect, it } from 'vitest';
import {
  attemptSkill,
  judgePhase,
  perfectAttempt,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';

describe('minigame skill system', () => {
  it('maps story bets to skill defs (no pure RNG)', () => {
    const antena = skillForBet('antena-sinal', 'hack');
    expect(antena?.kind).toBe('hack');
    expect(antena?.phases[0]?.steps).toBe(3);

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

  it('duel requires all phases; one miss fails the encounter', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    p = attemptSkill(p, perfectAttempt(p));
    expect(p.done).toBe(false);
    p = attemptSkill(p, { phaseIndex: 1, value: 0 }); // wrong choice
    expect(p.done).toBe(true);
    expect(p.won).toBe(false);
  });

  it('perfect attempts clear a full duel', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    while (!p.done) p = attemptSkill(p, perfectAttempt(p));
    expect(p.won).toBe(true);
    expect(p.cleared).toBe(3);
  });

  it('covers every skill kind blurb and multi-phase progress', () => {
    for (const kind of ['timing', 'choice', 'puzzle', 'chase', 'hack', 'duel'] as const) {
      const def = skillForBet(`cov-${kind}`, kind);
      expect(def?.blurb.length).toBeGreaterThan(0);
      expect(def?.phases.length).toBeGreaterThan(0);
    }
    // Force default blurb branch via cast.
    const weird = skillForBet('x', 'not-a-kind' as never);
    expect(weird?.blurb).toMatch(/Skill check|Stop|Read|Find|Tap|Match|Multi/i);
    const def = skillForBet('pastel-surpresa', 'puzzle')!;
    let p = startSkill(def);
    p = attemptSkill(p, { phaseIndex: 0, value: 2 });
    expect(p.won).toBe(true);
    // Extra attempt after done is a no-op.
    expect(attemptSkill(p, { phaseIndex: 0, value: 0 }).done).toBe(true);
  });
});
