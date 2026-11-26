import { describe, expect, it } from 'vitest';
import {
  SEQ_REVEAL_STEP_MS,
  sequenceRevealGlyphs,
  sequenceRevealTotalMs,
  startSequenceReveal,
  tickSequenceReveal,
} from '../../src/systems/sequence-reveal';
import { phaseSequence, isSequencePhase } from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE as TABLE } from '../../src/content/skill-phases';

describe('sequence reveal state machine (fake clock)', () => {
  it('antena R G B advances one glyph per step then done', () => {
    const seq = ['R', 'G', 'B'] as const;
    let t = 1000;
    let s = startSequenceReveal([...seq], t);
    expect(s.done).toBe(false);
    expect(sequenceRevealGlyphs(s.seq, s.shown)).toBe('R  ·  ·');

    t += SEQ_REVEAL_STEP_MS - 1;
    s = tickSequenceReveal(s, t);
    expect(s.shown).toBe(1);

    t += 1;
    s = tickSequenceReveal(s, t);
    expect(s.shown).toBe(2);
    expect(sequenceRevealGlyphs(s.seq, s.shown)).toBe('R  G  ·');

    t += SEQ_REVEAL_STEP_MS;
    s = tickSequenceReveal(s, t);
    expect(s.shown).toBe(3);
    expect(sequenceRevealGlyphs(s.seq, s.shown)).toBe('R  G  B');
    expect(s.done).toBe(false);

    // Full hold beat
    t += SEQ_REVEAL_STEP_MS;
    s = tickSequenceReveal(s, t);
    expect(s.done).toBe(true);
  });

  it('reveal always finishes within sequenceRevealTotalMs', () => {
    for (const [id, phase] of Object.entries(TABLE)) {
      if (!isSequencePhase(phase)) continue;
      const seq = phaseSequence(phase);
      const budget = sequenceRevealTotalMs(seq.length);
      let t = 0;
      let s = startSequenceReveal(seq, t);
      const deadline = budget + 1;
      while (!s.done && t <= deadline + SEQ_REVEAL_STEP_MS) {
        t += 50;
        s = tickSequenceReveal(s, t);
      }
      expect(s.done, id).toBe(true);
      expect(t, id).toBeLessThanOrEqual(budget + 50);
    }
  });

  it('step ms is ≥1400 (playtest #43)', () => {
    expect(SEQ_REVEAL_STEP_MS).toBeGreaterThanOrEqual(1400);
  });
});
