/** Seedable PRNG (mulberry32) for deterministic bets and tests. */

export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number =>
    advance(state, (s) => {
      state = s;
    });
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    chance: (probability) => next() < clamp01(probability),
    pick: (items) => pickItem(items, next),
  };
}

function advance(state: number, set: (s: number) => void): number {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  set(nextState);
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickItem<T>(items: readonly T[], next: () => number): T {
  if (items.length === 0) throw new Error('Cannot pick from empty list');
  return items[Math.floor(next() * items.length)] as T;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
