import type { BetDefinition, BetResult, Odds } from '../core/types';
import type { Rng } from '../core/rng';
import { STORY_GATE_BET_IDS } from '../content/bets';
import { t } from '../i18n';

/** Fair probability from fractional odds after house edge. */
export function impliedWinChance(odds: Odds, houseEdge: number): number {
  const fair = odds.denominator / (odds.numerator + odds.denominator);
  return clamp01(fair * (1 - clamp01(houseEdge)));
}

/**
 * Pity applies only to story-gate bets (not grind).
 * +8% per consecutive loss, max 2 stacks → +16%, soft ceiling 62%.
 * Never pull an already-friendly base (e.g. onboarding ~72%) down below itself.
 */
export function pityWinChance(
  odds: Odds,
  houseEdge: number,
  consecutiveLosses = 0,
  opts: { storyGate?: boolean; luckBonus?: number } = {},
): number {
  const base = impliedWinChance(odds, houseEdge) + (opts.luckBonus ?? 0);
  if (!opts.storyGate) return clamp01(base);
  const stacks = Math.min(2, Math.max(0, consecutiveLosses));
  const withPity = base + stacks * 0.08;
  return clamp01(Math.max(base, Math.min(0.62, withPity)));
}

export function payoutForWin(stake: number, odds: Odds): number {
  if (stake <= 0) return 0;
  return Math.floor(stake * (odds.numerator / odds.denominator + 1));
}

export type ResolveOpts = {
  stake?: number;
  consecutiveLosses?: number;
  luckBonus?: number;
};

export function resolveBet(
  bet: BetDefinition,
  rng: Rng,
  opts: ResolveOpts | number = {},
): BetResult {
  const o: ResolveOpts = typeof opts === 'number' ? { stake: opts } : opts;
  return rollBet(bet, rng, o.stake ?? bet.stake, {
    losses: o.consecutiveLosses ?? 0,
    luck: o.luckBonus ?? 0,
  });
}

function rollBet(
  bet: BetDefinition,
  rng: Rng,
  stake: number,
  opts: { losses: number; luck: number },
): BetResult {
  const roll = rng.next();
  const chance = pityWinChance(bet.odds, bet.houseEdge, opts.losses, {
    storyGate: isSoftStakeBet(bet),
    luckBonus: opts.luck,
  });
  const won = roll < chance;
  const payout = won ? payoutForWin(stake, bet.odds) : 0;
  return { betId: bet.id, won, stake, payout, net: payout - stake, roll };
}

export function formatWinChance(
  odds: Odds,
  houseEdge: number,
  consecutiveLosses = 0,
  storyGate = false,
): string {
  const pct = Math.round(
    pityWinChance(odds, houseEdge, consecutiveLosses, { storyGate }) * 100,
  );
  return `${pct}%`;
}

export function clampStake(bet: BetDefinition, stake: number, credits: number): number {
  let min = bet.stakeMin ?? Math.max(1, Math.floor(bet.stake / 2));
  const max = Math.min(bet.stakeMax ?? bet.stake * 3, credits);
  // Soft story bets: allow a tiny stake when broke — never force an all-in min.
  if (isSoftStakeBet(bet) && credits > 0 && credits < min) {
    min = 1;
  }
  if (max < min) return Math.max(0, Math.min(credits, stake));
  return Math.min(max, Math.max(min, stake));
}

/** Default offer ≈ 12% of bankroll (clamped 10–15% band), never all credits. */
export function defaultStake(bet: BetDefinition, credits: number): number {
  if (credits <= 0) return 0;
  const pct = Math.max(1, Math.round(credits * 0.12));
  const half = Math.max(1, Math.floor(credits * 0.5));
  const neverAll = credits <= 2 ? 1 : Math.min(pct, half, credits - 1);
  return clampStake(bet, neverAll, credits);
}

export function isSoftStakeBet(bet: BetDefinition): boolean {
  return bet.kind === 'story' || STORY_GATE_BET_IDS.has(bet.id);
}

export function canAfford(credits: number, stake: number): boolean {
  return credits >= stake && stake > 0;
}

export function applyHouseFlavor(edge: number): string {
  if (edge >= 0.25) return t('ui.flavor.fat');
  if (edge >= 0.15) return t('ui.flavor.crooked');
  if (edge >= 0.08) return t('ui.flavor.cut');
  return t('ui.flavor.almost');
}

export function formatOdds(odds: Odds): string {
  return `${odds.numerator}:${odds.denominator}`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
