/** QA-only URL helpers: `?minigame=` and `?timescale=` (playtest #46). */

export type DebugMinigameId =
  'lockpick' | 'sequence' | 'needle' | 'offer' | 'hack' | 'quiz';

/** Bet id opened for each sandbox panel kind. */
export const DEBUG_MINIGAME_BETS: Record<DebugMinigameId, string> = {
  lockpick: 'feira-lockbox',
  sequence: 'feira-radio',
  needle: 'samba-odds',
  offer: 'torre-negotiate',
  hack: 'antena-sinal',
  quiz: 'feira-tipster',
};

export function parseDebugMinigame(
  raw: string | null | undefined,
): DebugMinigameId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key in DEBUG_MINIGAME_BETS) return key as DebugMinigameId;
  return null;
}

/**
 * Slow all minigame timers/reveals. Clamped to (0, 1] — never speeds up.
 * `?timescale=0.33` → clocks run at 33% speed.
 */
export function parseDebugTimescale(raw: string | null | undefined): number {
  if (raw == null || raw === '') return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(1, n);
}

/** Scale a duration by 1/timescale so timers feel slower when timescale < 1. */
export function scaleQaMs(ms: number, timescale: number): number {
  const t = timescale > 0 ? timescale : 1;
  return Math.round(ms / t);
}
