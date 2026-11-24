import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });

  it('int stays within inclusive bounds', () => {
    const rng = createRng(99);
    for (let i = 0; i < 40; i += 1) {
      const n = rng.int(2, 5);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('chance respects probability bounds', () => {
    const rng = createRng(1);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });

  it('pick throws on empty list and returns an item otherwise', () => {
    const rng = createRng(3);
    expect(() => rng.pick([])).toThrow();
    expect(rng.pick(['a', 'b'])).toMatch(/a|b/);
  });
});
