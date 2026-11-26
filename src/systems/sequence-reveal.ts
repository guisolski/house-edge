/**
 * Playtest #42: pure sequence memorize reveal — clock-driven, no DOM.
 * Input stays locked until `done`; each step is visible ≥ SEQ_REVEAL_STEP_MS.
 */

import { SEQ_REVEAL_STEP_MS, sequenceRevealMs, type SeqKey } from './minigame';

export type SequenceRevealState = {
  seq: SeqKey[];
  /** Keys shown so far (1..seq.length during reveal; seq.length when holding full). */
  shown: number;
  /** Epoch ms when the current step started. */
  stepStartedAt: number;
  /** True after the full hold beat — input may arm. */
  done: boolean;
};

export function startSequenceReveal(seq: SeqKey[], now: number): SequenceRevealState {
  return {
    seq,
    shown: Math.min(1, Math.max(0, seq.length)),
    stepStartedAt: now,
    done: seq.length === 0,
  };
}

/** Advance reveal by wall-clock `now`. Safe to call every frame / interval. */
export function tickSequenceReveal(
  state: SequenceRevealState,
  now: number,
  stepMs = SEQ_REVEAL_STEP_MS,
): SequenceRevealState {
  if (state.done || state.seq.length === 0) return { ...state, done: true };
  if (now - state.stepStartedAt < stepMs) return state;
  if (state.shown < state.seq.length) {
    return {
      ...state,
      shown: state.shown + 1,
      stepStartedAt: now,
    };
  }
  // Full sequence held one more beat → done.
  return { ...state, done: true, stepStartedAt: now };
}

/** Label glyphs: first `shown` real keys, rest as · */
export function sequenceRevealGlyphs(seq: SeqKey[], shown: number): string {
  return seq.map((k, i) => (i < shown ? k : '·')).join('  ');
}

export function sequenceRevealTotalMs(seqLen: number): number {
  return sequenceRevealMs(seqLen);
}

export { SEQ_REVEAL_STEP_MS };
