import { describe, expect, it } from 'vitest';
import {
  applyHouseFlavor,
  canAfford,
  clampStake,
  formatOdds,
  formatWinChance,
  impliedWinChance,
  payoutForWin,
  resolveBet,
} from '../../src/systems/betting';
import { createRng } from '../../src/core/rng';
import { getBet } from '../../src/content/bets';

describe('betting', () => {
  it('computes implied chance with house edge', () => {
    const chance = impliedWinChance({ numerator: 1, denominator: 1 }, 0.1);
    expect(chance).toBeCloseTo(0.45, 5);
  });

  it('pays stake plus fractional odds', () => {
    expect(payoutForWin(100, { numerator: 2, denominator: 1 })).toBe(300);
    expect(payoutForWin(0, { numerator: 2, denominator: 1 })).toBe(0);
  });

  it('resolveBet is deterministic with seed', () => {
    const bet = getBet('agua-gelada');
    expect(bet).toBeDefined();
    const result = resolveBet(bet!, createRng(10));
    expect(result.betId).toBe('agua-gelada');
    expect(result.stake).toBe(10);
    expect(typeof result.won).toBe('boolean');
  });

  it('canAfford and flavor helpers', () => {
    expect(canAfford(10, 10)).toBe(true);
    expect(canAfford(9, 10)).toBe(false);
    expect(formatOdds({ numerator: 3, denominator: 2 })).toBe('3:2');
    expect(applyHouseFlavor(0.3)).toMatch(/fat/i);
    expect(applyHouseFlavor(0.16)).toMatch(/Crooked/i);
    expect(applyHouseFlavor(0.09)).toMatch(/cut/i);
    expect(applyHouseFlavor(0.01)).toMatch(/Almost/i);
  });

  it('clamps stake and formats win chance from odds', () => {
    const bet = getBet('agua-gelada')!;
    expect(clampStake(bet, 1, 100)).toBe(bet.stakeMin ?? 5);
    expect(clampStake(bet, 999, 25)).toBe(25);
    expect(formatWinChance(bet.odds, bet.houseEdge)).toMatch(/%$/);
    expect(impliedWinChance({ numerator: 1, denominator: 1 }, 2)).toBeLessThan(1);
  });
});
