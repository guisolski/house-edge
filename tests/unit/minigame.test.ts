import { describe, expect, it } from 'vitest';
import { BETS } from '../../src/content/bets';
import {
  allTimingPhases,
  assistAfterMiss,
  attemptSkill,
  choiceClueCoversAnswer,
  judgePhase,
  judgeTimingStop,
  perfectAttempt,
  phaseSequence,
  SEQ_KEYS,
  skillForBet,
  startSkill,
  timingZone,
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

    const lock = skillForBet('avenida-server', 'lockpick');
    expect(lock?.phases[0]?.kind).toBe('lockpick');
    expect(lock?.phases[0]?.pins?.length).toBe(4);
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

  it('assistAfterMiss widens timing and is a no-op for choice phases', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    p = attemptSkill(p, { phaseIndex: 0, value: 0 });
    expect(p.justMissed).toBe(true);
    const before = p.def.phases[0]!.window ?? 0;
    p = assistAfterMiss(p);
    expect(p.justMissed).toBe(false);
    expect(p.def.phases[0]!.window).toBeGreaterThan(before);
    p = attemptSkill(p, perfectAttempt(p));
    p = attemptSkill(p, { phaseIndex: 1, value: 0 });
    const choiceWin = p.def.phases[1]!.window;
    p = assistAfterMiss(p);
    expect(p.def.phases[1]!.window).toBe(choiceWin);
  });

  it('choiceClueIndirect rejects missing/direct clues; fallback stays indirect', () => {
    expect(
      choiceClueCoversAnswer({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['Alpha', 'Beta'],
      }),
    ).toBe(false);
    // Direct token "beta" fails indirect rule.
    expect(
      choiceClueCoversAnswer({
        kind: 'choice',
        prompt: 'x',
        target: 1,
        options: ['Alpha', 'Beta'],
        clue: 'pick beta somehow from the street',
      }),
    ).toBe(false);
    expect(skillForBet('nope', undefined)).toBeNull();
    const fallback = skillForBet('unknown-timing-bet', 'timing')!;
    expect(fallback.phases[0]!.kind).toBe('timing');
    const chase = skillForBet('unknown-chase-bet', 'chase')!;
    expect(phaseSequence(chase.phases[0]!).length).toBeGreaterThan(0);
    expect(judgePhase(chase.phases[0]!, 0)).toBe(true);
    const puzzle = skillForBet('unknown-puzzle-bet', 'puzzle')!;
    expect(choiceClueCoversAnswer(puzzle.phases[0]!)).toBe(true);
  });

  it('every needle gate: centre + edges pass, outside fails (matches drawn zone)', () => {
    const gates = allTimingPhases();
    expect(gates.length).toBeGreaterThan(5);
    for (const { betId, phase } of gates) {
      const z = timingZone(phase);
      expect(judgeTimingStop(z.target, z), `${betId} centre`).toBe(true);
      expect(judgeTimingStop(z.lo, z), `${betId} lo edge`).toBe(true);
      expect(judgeTimingStop(z.hi, z), `${betId} hi edge`).toBe(true);
      expect(judgeTimingStop(z.lo - 0.001, z), `${betId} below`).toBe(false);
      expect(judgeTimingStop(z.hi + 0.001, z), `${betId} above`).toBe(false);
      // Drawn zone uses the same lo/hi (regression: hardcoded centre 0.5).
      expect(z.lo).toBeCloseTo(Math.max(0, phase.target - (phase.window ?? 0.12)), 5);
      expect(z.hi).toBeCloseTo(Math.min(1, phase.target + (phase.window ?? 0.12)), 5);
    }
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

  it('Simon sequence shows keys and retries phase on a wrong tap', () => {
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
    const wrong = (SEQ_KEYS.indexOf(seq[1]!) + 1) % SEQ_KEYS.length;
    p = attemptSkill(p, { phaseIndex: 0, value: wrong });
    expect(p.done).toBe(false);
    expect(p.justMissed).toBe(true);
    expect(p.seqIndex).toBe(0);
    expect(p.misses).toBe(1);
  });

  it('duel phase miss retries the same phase (does not reset the duel)', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    p = attemptSkill(p, perfectAttempt(p));
    expect(p.phaseIndex).toBe(1);
    p = attemptSkill(p, { phaseIndex: 1, value: 0 }); // wrong choice
    expect(p.done).toBe(false);
    expect(p.phaseIndex).toBe(1);
    expect(p.cleared).toBe(1);
    expect(p.misses).toBe(1);
  });

  it('perfect attempts clear a full duel including Simon phase 3', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    let p = startSkill(def);
    while (!p.done) p = attemptSkill(p, perfectAttempt(p));
    expect(p.won).toBe(true);
    expect(p.cleared).toBe(3);
  });

  it('every choice/puzzle story gate has an indirect clue (no answer tokens)', () => {
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
    // Direct answer token in clue fails the indirect rule.
    expect(
      choiceClueCoversAnswer({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['Alpha'],
        clue: 'obviously pick Alpha here',
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
    for (const kind of [
      'timing',
      'choice',
      'puzzle',
      'chase',
      'hack',
      'duel',
      'lockpick',
      'evade',
      'negotiate',
    ] as const) {
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
