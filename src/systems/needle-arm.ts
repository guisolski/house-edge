/**
 * Playtest #46: needle Stop/E is structurally impossible during countdown + grace.
 * Countdown shows Em 3…2…1; input arms only after the needle has started moving
 * and a short grace window has elapsed.
 */

/** Wall-clock countdown before the needle starts moving. */
export const NEEDLE_COUNTDOWN_MS = 3000;

/** After motion starts, ignore Stop/E for this long (first-frame mash). */
export const NEEDLE_ARM_GRACE_MS = 150;

export type NeedleArmState = {
  /** performance.now() when the panel opened / countdown began. */
  startedAt: number;
  countdownMs: number;
  graceMs: number;
  /** True once the first motion frame has run. */
  motionStarted: boolean;
  /** performance.now() when motion started (grace clock). */
  motionStartedAt: number;
};

export function startNeedleArm(
  now: number,
  countdownMs = NEEDLE_COUNTDOWN_MS,
  graceMs = NEEDLE_ARM_GRACE_MS,
): NeedleArmState {
  return {
    startedAt: now,
    countdownMs,
    graceMs,
    motionStarted: false,
    motionStartedAt: 0,
  };
}

/** Countdown still running — Stop must stay disabled. */
export function needleInCountdown(state: NeedleArmState, now: number): boolean {
  return now < state.startedAt + state.countdownMs;
}

/** Seconds left for "Em N…" (ceil, min 1 while in countdown). */
export function needleCountdownSeconds(state: NeedleArmState, now: number): number {
  if (!needleInCountdown(state, now)) return 0;
  return Math.max(1, Math.ceil((state.startedAt + state.countdownMs - now) / 1000));
}

/** First motion frame — start the grace clock. */
export function markNeedleMotionStarted(
  state: NeedleArmState,
  now: number,
): NeedleArmState {
  if (state.motionStarted) return state;
  return { ...state, motionStarted: true, motionStartedAt: now };
}

/**
 * True only after countdown elapsed, motion has started, and grace has passed.
 * Used by Stop / E / Enter / Space / gamepad A / touch.
 */
export function canNeedleInput(
  state: NeedleArmState | null | undefined,
  now: number,
): boolean {
  if (!state) return false;
  if (needleInCountdown(state, now)) return false;
  if (!state.motionStarted) return false;
  return now >= state.motionStartedAt + state.graceMs;
}

/** Absolute time when input first becomes legal (for tests / e2e budgets). */
export function needleInputArmAt(state: NeedleArmState): number {
  const motionAt = state.startedAt + state.countdownMs;
  return motionAt + state.graceMs;
}
