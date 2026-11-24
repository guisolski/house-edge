import type { BetDefinition } from '../core/types';
import { BETS } from '../content/bets';

export type GrindJob = {
  id: string;
  label: string;
  betId: string;
  minReputation: number;
  districtId: string;
};

/** Jobs in every district so Side Jobs is never empty once unlocked. */
const JOBS: readonly GrindJob[] = [
  {
    id: 'job-agua',
    label: 'Boteco water rotation',
    betId: 'agua-gelada',
    minReputation: 0,
    districtId: 'morro-neon',
  },
  {
    id: 'job-laje',
    label: 'Shift at the rooftop draw booth',
    betId: 'laje-lottery',
    minReputation: 0,
    districtId: 'morro-neon',
  },
  {
    id: 'job-corrida',
    label: 'Laje moto dash',
    betId: 'corrida-moto',
    minReputation: 3,
    districtId: 'morro-neon',
  },
  {
    id: 'job-pastel',
    label: 'Surprise-pastel stall',
    betId: 'pastel-surpresa',
    minReputation: 0,
    districtId: 'feira-central',
  },
  {
    id: 'job-freela',
    label: 'Fair deliveries',
    betId: 'freela-entregas',
    minReputation: 0,
    districtId: 'feira-central',
  },
  {
    id: 'job-samba',
    label: 'Forró set odds',
    betId: 'samba-odds',
    minReputation: 2,
    districtId: 'feira-central',
  },
  {
    id: 'job-pixo',
    label: 'Commissioned pixo',
    betId: 'pixo-challenge',
    minReputation: 0,
    districtId: 'avenida-odds',
  },
  {
    id: 'job-atm',
    label: 'Casa ATM glitch hunt',
    betId: 'avenida-atm',
    minReputation: 0,
    districtId: 'avenida-odds',
  },
  {
    id: 'job-vip',
    label: 'VIP table rake skim',
    betId: 'torre-vip',
    minReputation: 0,
    districtId: 'torre-casa',
  },
  {
    id: 'job-duelo-grind',
    label: 'Rematch at the high table',
    betId: 'duelo-casa',
    minReputation: 5,
    districtId: 'torre-casa',
  },
];

export function listJobs(districtId: string, reputation: number): GrindJob[] {
  return JOBS.filter((j) => j.districtId === districtId && reputation >= j.minReputation);
}

export function jobBet(job: GrindJob): BetDefinition | undefined {
  return BETS.find((b) => b.id === job.betId);
}

export function estimateHourly(job: GrindJob, betsPerHour = 12): number {
  const bet = jobBet(job);
  if (!bet) return 0;
  const chance =
    bet.winChance ?? bet.odds.denominator / (bet.odds.numerator + bet.odds.denominator);
  const payoutGain = chance * (bet.stake * (bet.odds.numerator / bet.odds.denominator));
  const lossDrag = (1 - chance) * bet.stake * 0.2;
  return Math.floor((payoutGain - lossDrag) * betsPerHour);
}
