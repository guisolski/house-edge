import type { BetDefinition, DistrictId } from '../core/types';
import { BETS } from '../content/bets';
import { t } from '../i18n';

export type GrindJob = {
  id: string;
  /** i18n key under ui.grind.* — resolve with jobLabel(). */
  labelKey: string;
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
  labelKey: 'ui.grind.safe',
  flatPay: 20,
  minReputation: -999,
  districtId,
}));

/** Optional side-hustle RNG bets — clearly labeled, never story gates. */
const BET_JOBS: readonly GrindJob[] = [
  {
    id: 'job-agua',
    labelKey: 'ui.grind.agua',
    betId: 'agua-gelada',
    minReputation: 0,
    districtId: 'morro-neon',
  },
  {
    id: 'job-laje',
    labelKey: 'ui.grind.laje',
    betId: 'laje-lottery',
    minReputation: 0,
    districtId: 'morro-neon',
  },
  {
    id: 'job-corrida',
    labelKey: 'ui.grind.corrida',
    betId: 'corrida-moto',
    minReputation: 2,
    districtId: 'morro-neon',
  },
  {
    id: 'job-pastel',
    labelKey: 'ui.grind.pastel',
    betId: 'pastel-surpresa',
    minReputation: 0,
    districtId: 'feira-central',
  },
  {
    id: 'job-freela',
    labelKey: 'ui.grind.freela',
    betId: 'freela-entregas',
    minReputation: 0,
    districtId: 'feira-central',
  },
  {
    id: 'job-samba',
    labelKey: 'ui.grind.samba',
    betId: 'samba-odds',
    minReputation: 1,
    districtId: 'feira-central',
  },
  {
    id: 'job-pixo',
    labelKey: 'ui.grind.pixo',
    betId: 'pixo-challenge',
    minReputation: 0,
    districtId: 'avenida-odds',
  },
  {
    id: 'job-atm',
    labelKey: 'ui.grind.atm',
    betId: 'avenida-atm',
    minReputation: 0,
    districtId: 'avenida-odds',
  },
  {
    id: 'job-vip',
    labelKey: 'ui.grind.vip',
    betId: 'torre-vip',
    minReputation: 0,
    districtId: 'torre-casa',
  },
  {
    id: 'job-duelo-grind',
    labelKey: 'ui.grind.duelo',
    betId: 'duelo-casa',
    minReputation: 3,
    districtId: 'torre-casa',
  },
];

const JOBS: readonly GrindJob[] = [...SAFE_JOBS, ...BET_JOBS];

export function jobLabel(job: GrindJob): string {
  return t(job.labelKey);
}

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
