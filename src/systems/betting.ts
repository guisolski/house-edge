import type { BetDefinition, BetResult, Odds } from '../core/types';
import type { Rng } from '../core/rng';

/** Fair probability from fractional odds after house edge. */
export function impliedWinChance(odds: Odds, houseEdge: number): number {
  const fair = odds.denominator / (odds.numerator + odds.denominator);
  return clamp01(fair * (1 - clamp01(houseEdge)));
}

export function payoutForWin(stake: number, odds: Odds): number {
  if (stake <= 0) return 0;
  return Math.floor(stake * (odds.numerator / odds.denominator + 1));
}

export function resolveBet(
  bet: BetDefinition,
  rng: Rng,
  stakeOverride?: number,
): BetResult {
  const stake = stakeOverride ?? bet.stake;
  const roll = rng.next();
  // Always derive from odds + house edge so UI odds match the roll.
  const chance = impliedWinChance(bet.odds, bet.houseEdge);
  const won = roll < chance;
  const payout = won ? payoutForWin(stake, bet.odds) : 0;
  return {
    betId: bet.id,
    won,
    stake,
    payout,
    net: payout - stake,
    roll,
  };
}

export function formatWinChance(odds: Odds, houseEdge: number): string {
  const pct = Math.round(impliedWinChance(odds, houseEdge) * 100);
  return `${pct}%`;
}

export function clampStake(bet: BetDefinition, stake: number, credits: number): number {
  const min = bet.stakeMin ?? Math.max(1, Math.floor(bet.stake / 2));
  const max = Math.min(bet.stakeMax ?? bet.stake * 3, credits);
  return Math.min(max, Math.max(min, stake));
}

export function canAfford(credits: number, stake: number): boolean {
  return credits >= stake && stake > 0;
}

export function applyHouseFlavor(edge: number): string {
  if (edge >= 0.25) return 'The house is getting fat, mano.';
  if (edge >= 0.15) return 'Crooked odds — classic Casa Suprema.';
  if (edge >= 0.08) return 'The house takes its cut, as always.';
  return 'Almost clean… almost.';
}

export function formatOdds(odds: Odds): string {
  return `${odds.numerator}:${odds.denominator}`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
