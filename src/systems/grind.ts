import type { BetDefinition, DistrictId } from '../core/types';
import { BETS } from '../content/bets';

export type GrindJob = {
  id: string;
  label: string;
  /** If set, opens a bet. Otherwise pays flatPay with no risk. */
  betId?: string;
  /** Guaranteed credits for safe odd jobs (no stake). */
  flatPay?: number;
  minReputation: number;
  districtId: string;
};

const DISTRICTS: DistrictId[] = [
  'morro-neon',
  'feira-central',
  'avenida-odds',
  'torre-casa',
];

/** Safe odd jobs — always available even at negative rep / 0 credits. */
const SAFE_JOBS: readonly GrindJob[] = DISTRICTS.map((districtId) => ({
  id: `safe-${districtId}`,
  label: '[SAFE] Odd jobs — flat 20cr, no bet',
  flatPay: 20,
  minReputation: -999,
  districtId,
}));

/** Optional side-hustle RNG bets — clearly labeled, never story gates. */
const BET_JOBS: readonly GrindJob[] = [
  {
    id: 'job-agua',
    label: '[SIDE HUSTLE · RNG] Boteco water rotation',
    betId: 'agua-gelada',
    minReputation: 0,
    districtId: 'morro-neon',
  },
  {
    id: 'job-laje',
    label: '[SIDE HUSTLE · RNG] Rooftop draw booth',
    betId: 'laje-lottery',
    minReputation: 0,
    districtId: 'morro-neon',
  },
  {
    id: 'job-corrida',
    label: '[SIDE HUSTLE · RNG] Laje moto dash',
    betId: 'corrida-moto',
    minReputation: 2,
    districtId: 'morro-neon',
  },
  {
    id: 'job-pastel',
    label: '[SIDE HUSTLE · RNG] Surprise-pastel stall',
    betId: 'pastel-surpresa',
    minReputation: 0,
    districtId: 'feira-central',
  },
  {
    id: 'job-freela',
    label: '[SIDE HUSTLE · RNG] Fair deliveries',
    betId: 'freela-entregas',
    minReputation: 0,
    districtId: 'feira-central',
  },
  {
    id: 'job-samba',
    label: '[SIDE HUSTLE · RNG] Forró set odds',
    betId: 'samba-odds',
    minReputation: 1,
    districtId: 'feira-central',
  },
  {
    id: 'job-pixo',
    label: '[SIDE HUSTLE · RNG] Commissioned pixo',
    betId: 'pixo-challenge',
    minReputation: 0,
    districtId: 'avenida-odds',
  },
  {
    id: 'job-atm',
    label: '[SIDE HUSTLE · RNG] Casa ATM glitch hunt',
    betId: 'avenida-atm',
    minReputation: 0,
    districtId: 'avenida-odds',
  },
  {
    id: 'job-vip',
    label: '[SIDE HUSTLE · RNG] VIP table rake skim',
    betId: 'torre-vip',
    minReputation: 0,
    districtId: 'torre-casa',
  },
  {
    id: 'job-duelo-grind',
    label: '[SIDE HUSTLE · RNG] Rematch at the high table',
    betId: 'duelo-casa',
    minReputation: 3,
    districtId: 'torre-casa',
  },
];

const JOBS: readonly GrindJob[] = [...SAFE_JOBS, ...BET_JOBS];

export function listJobs(districtId: string, reputation: number): GrindJob[] {
  return JOBS.filter((j) => j.districtId === districtId && reputation >= j.minReputation);
}

export function getJob(id: string): GrindJob | undefined {
  return JOBS.find((j) => j.id === id);
}

export function jobBet(job: GrindJob): BetDefinition | undefined {
  if (!job.betId) return undefined;
  return BETS.find((b) => b.id === job.betId);
}

export function estimateHourly(job: GrindJob, betsPerHour = 12): number {
  if (job.flatPay) return job.flatPay * betsPerHour;
  const bet = jobBet(job);
  if (!bet) return 0;
  const chance =
    bet.winChance ?? bet.odds.denominator / (bet.odds.numerator + bet.odds.denominator);
  const payoutGain = chance * (bet.stake * (bet.odds.numerator / bet.odds.denominator));
  const lossDrag = (1 - chance) * bet.stake * 0.2;
  return Math.floor((payoutGain - lossDrag) * betsPerHour);
}
