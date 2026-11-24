import type { BetDefinition } from '../core/types';
import { BETS } from '../content/bets';

export type GrindJob = {
  id: string;
  label: string;
  betId: string;
  minReputation: number;
  districtId: string;
};

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
    minReputation: 2,
    districtId: 'morro-neon',
  },
  {
    id: 'job-corrida',
    label: 'Laje moto dash',
    betId: 'corrida-moto',
    minReputation: 5,
    districtId: 'morro-neon',
  },
  {
    id: 'job-pastel',
    label: 'Surprise-pastel stall',
    betId: 'pastel-surpresa',
    minReputation: 3,
    districtId: 'feira-central',
  },
  {
    id: 'job-freela',
    label: 'Fair deliveries',
    betId: 'freela-entregas',
    minReputation: 6,
    districtId: 'feira-central',
  },
  {
    id: 'job-pixo',
    label: 'Commissioned pixo',
    betId: 'pixo-challenge',
    minReputation: 10,
    districtId: 'avenida-odds',
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
  const payoutGain =
    bet.winChance * (bet.stake * (bet.odds.numerator / bet.odds.denominator));
  const lossDrag = (1 - bet.winChance) * bet.stake * 0.2;
  return Math.floor((payoutGain - lossDrag) * betsPerHour);
}
