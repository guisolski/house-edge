/**
 * Playtest #42/#45/#48: pure sequence memorize reveal — clock-driven, no DOM.
 * Progressive glyphs → explicit ≥2s full-sequence HOLD → input arms.
 */

import {
  SEQ_FULL_HOLD_MS,
  SEQ_REVEAL_STEP_MS,
  sequenceRevealMs,
  type SeqKey,
} from './minigame';

export type SequenceRevealPhase = 'reveal' | 'hold' | 'done';

export type SequenceRevealState = {
  seq: SeqKey[];
  /** Keys shown so far (1..seq.length during reveal; seq.length when holding full). */
  shown: number;
  /** Epoch ms when the current step (or full hold) started. */
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
  fullHoldMs = SEQ_FULL_HOLD_MS,
): SequenceRevealState {
  if (state.done || state.seq.length === 0) return { ...state, done: true };
  const need = state.shown < state.seq.length ? stepMs : fullHoldMs;
  if (now - state.stepStartedAt < need) return state;
  if (state.shown < state.seq.length) {
    return {
      ...state,
      shown: state.shown + 1,
      stepStartedAt: now,
    };
  }
  // Full sequence held ≥ fullHoldMs → done.
  return { ...state, done: true, stepStartedAt: now };
}

/** Current memorize phase for UI (bar / e2e). */
export function sequenceRevealPhase(
  state: SequenceRevealState,
  _now?: number,
): SequenceRevealPhase {
  if (state.done || state.seq.length === 0) return 'done';
  if (state.shown >= state.seq.length) return 'hold';
  return 'reveal';
}

/** 0..1 progress through the full-sequence hold beat. */
export function sequenceHoldProgress(
  state: SequenceRevealState,
  now: number,
  fullHoldMs = SEQ_FULL_HOLD_MS,
): number {
  if (state.done) return 1;
  if (state.shown < state.seq.length) return 0;
  const hold = Math.max(1, fullHoldMs);
  return Math.min(1, Math.max(0, (now - state.stepStartedAt) / hold));
}

/** Label glyphs: first `shown` real keys, rest as · */
export function sequenceRevealGlyphs(seq: SeqKey[], shown: number): string {
  return seq.map((k, i) => (i < shown ? k : '·')).join('  ');
}

export function sequenceRevealTotalMs(seqLen: number): number {
  return sequenceRevealMs(seqLen);
}

export { SEQ_FULL_HOLD_MS, SEQ_REVEAL_STEP_MS };
