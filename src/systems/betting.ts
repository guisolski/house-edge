import type { BetDefinition, BetResult, Odds } from '../core/types';
import type { Rng } from '../core/rng';
import { STORY_GATE_BET_IDS } from '../content/bets';

/** Fair probability from fractional odds after house edge. */
export function impliedWinChance(odds: Odds, houseEdge: number): number {
  const fair = odds.denominator / (odds.numerator + odds.denominator);
  return clamp01(fair * (1 - clamp01(houseEdge)));
}

/** +10% absolute pity per consecutive loss on the same bet, capped. */
export function pityWinChance(
  odds: Odds,
  houseEdge: number,
  consecutiveLosses = 0,
): number {
  const base = impliedWinChance(odds, houseEdge);
  return Math.min(0.78, base + Math.max(0, consecutiveLosses) * 0.1);
}

export function payoutForWin(stake: number, odds: Odds): number {
  if (stake <= 0) return 0;
  return Math.floor(stake * (odds.numerator / odds.denominator + 1));
}

export function resolveBet(
  bet: BetDefinition,
  rng: Rng,
  stakeOverride?: number,
  consecutiveLosses = 0,
): BetResult {
  const stake = stakeOverride ?? bet.stake;
  const roll = rng.next();
  const chance = pityWinChance(bet.odds, bet.houseEdge, consecutiveLosses);
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

export function formatWinChance(
  odds: Odds,
  houseEdge: number,
  consecutiveLosses = 0,
): string {
  const pct = Math.round(pityWinChance(odds, houseEdge, consecutiveLosses) * 100);
  return `${pct}%`;
}

/**
 * Soft stake floor for story gates: if the player is broke-ish but not at 0,
 * allow staking whatever they have so the beat stays retryable.
 */
export function clampStake(bet: BetDefinition, stake: number, credits: number): number {
  let min = bet.stakeMin ?? Math.max(1, Math.floor(bet.stake / 2));
  const max = Math.min(bet.stakeMax ?? bet.stake * 3, credits);
  if (isSoftStakeBet(bet) && credits > 0 && credits < min) {
    min = Math.max(1, credits);
  }
  if (max < min) return Math.max(0, credits);
  return Math.min(max, Math.max(min, stake));
}

export function isSoftStakeBet(bet: BetDefinition): boolean {
  return bet.kind === 'story' || STORY_GATE_BET_IDS.has(bet.id);
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
