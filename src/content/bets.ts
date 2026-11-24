import type { BetDefinition, Odds } from '../core/types';

/** Keep winChance aligned with displayed odds + house edge. */
function chance(odds: Odds, houseEdge: number): number {
  const fair = odds.denominator / (odds.numerator + odds.denominator);
  return Math.min(1, Math.max(0, fair * (1 - Math.min(1, Math.max(0, houseEdge)))));
}

function bet(def: Omit<BetDefinition, 'winChance'>): BetDefinition {
  return { ...def, winChance: chance(def.odds, def.houseEdge) };
}

/**
 * Story-gate bets stay near even-money so a ~20 min playthrough is completable.
 * Harsh longshots are reserved for optional grind only.
 */
export const BETS: readonly BetDefinition[] = [
  bet({
    id: 'agua-gelada',
    kind: 'purchase',
    title: 'Ice-cold water at the boteco',
    description: 'Even drinking water is a wager. Casa Suprema taxed the filter.',
    stake: 8,
    stakeMin: 4,
    stakeMax: 30,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.08,
    reputationDeltaWin: 1,
    reputationDeltaLose: 0,
  }),
  bet({
    id: 'laje-lottery',
    kind: 'draw',
    title: 'Rooftop number draw',
    description:
      'Old street lotteries are gone — wiped out by the corps. The laje now runs a corp-licensed draw.',
    stake: 12,
    stakeMin: 5,
    stakeMax: 40,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.1,
    reputationDeltaWin: 2,
    reputationDeltaLose: 0,
  }),
  bet({
    id: 'corrida-moto',
    kind: 'race',
    title: 'Rooftop moto race',
    description: 'Illegal dash between antennas and clotheslines. Back the local rider.',
    stake: 18,
    stakeMin: 8,
    stakeMax: 60,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.08,
    unlocksDistrict: 'feira-central',
    reputationDeltaWin: 3,
    reputationDeltaLose: -1,
  }),
  bet({
    id: 'pastel-surpresa',
    kind: 'purchase',
    title: 'Surprise pastel from the fair',
    description: 'Might be beef, cheese… or a Casa debt chip.',
    stake: 12,
    stakeMin: 5,
    stakeMax: 40,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.06,
    reputationDeltaWin: 2,
    reputationDeltaLose: 0,
  }),
  bet({
    id: 'freela-entregas',
    kind: 'job',
    title: 'Delivery freela',
    description: 'Drop a package in the alley without corp militia stopping you.',
    stake: 15,
    stakeMin: 5,
    stakeMax: 50,
    odds: { numerator: 3, denominator: 2 },
    houseEdge: 0.05,
    reputationDeltaWin: 3,
    reputationDeltaLose: -1,
  }),
  bet({
    id: 'pixo-challenge',
    kind: 'story',
    title: 'Pixo on the OddsCorp facade',
    description: 'Climb the scaffold, paint the truth, climb down alive.',
    stake: 20,
    stakeMin: 8,
    stakeMax: 60,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.08,
    reputationDeltaWin: 5,
    reputationDeltaLose: -1,
  }),
  bet({
    id: 'samba-odds',
    kind: 'dialogue',
    title: 'Samba vs corp jingle',
    description: 'Who wins the duel: the hill malandro or the influencer on payroll?',
    stake: 15,
    stakeMin: 5,
    stakeMax: 50,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.08,
    reputationDeltaWin: 3,
    reputationDeltaLose: 0,
  }),
  bet({
    id: 'prova-vazamento',
    kind: 'story',
    title: 'Algorithm leak wager',
    description: "Bet whether Luna's pendrive holds Casa Suprema's source RNG.",
    stake: 20,
    stakeMin: 8,
    stakeMax: 70,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.06,
    unlocksFlag: 'tem_prova',
    reputationDeltaWin: 6,
    reputationDeltaLose: -1,
  }),
  bet({
    id: 'audiencia-publica',
    kind: 'story',
    title: 'Rigged public hearing',
    description: 'On Odds Avenue, even the council mic comes with a house edge.',
    stake: 25,
    stakeMin: 10,
    stakeMax: 80,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.1,
    unlocksFlag: 'escandalo_aberto',
    reputationDeltaWin: 8,
    reputationDeltaLose: -1,
  }),
  bet({
    id: 'duelo-casa',
    kind: 'story',
    title: 'Final duel at the Tower',
    description: 'You vs the Casa Suprema CEO. Winner takes the city.',
    stake: 35,
    stakeMin: 12,
    stakeMax: 120,
    odds: { numerator: 1, denominator: 1 },
    houseEdge: 0.1,
    unlocksFlag: 'casa_quebrada',
    reputationDeltaWin: 15,
    reputationDeltaLose: -2,
  }),
  bet({
    id: 'torre-vip',
    kind: 'job',
    title: 'VIP table rake skim',
    description: 'Skim a cut from the Tower VIP table before security notices.',
    stake: 40,
    stakeMin: 15,
    stakeMax: 120,
    odds: { numerator: 2, denominator: 1 },
    houseEdge: 0.12,
    reputationDeltaWin: 4,
    reputationDeltaLose: -2,
  }),
  bet({
    id: 'avenida-atm',
    kind: 'job',
    title: 'Casa ATM glitch hunt',
    description: 'Find the rounding bug in an Odds Avenue ATM before midnight.',
    stake: 20,
    stakeMin: 8,
    stakeMax: 70,
    odds: { numerator: 3, denominator: 2 },
    houseEdge: 0.1,
    reputationDeltaWin: 3,
    reputationDeltaLose: -1,
  }),
] as const;

export function getBet(id: string): BetDefinition | undefined {
  return BETS.find((b) => b.id === id);
}

/** Story-linked bet ids used for pity + soft stakes. */
export const STORY_GATE_BET_IDS: ReadonlySet<string> = new Set([
  'agua-gelada',
  'laje-lottery',
  'corrida-moto',
  'pastel-surpresa',
  'samba-odds',
  'prova-vazamento',
  'pixo-challenge',
  'audiencia-publica',
  'duelo-casa',
]);
