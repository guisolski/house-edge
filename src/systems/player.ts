import type { DistrictId, PlayerStats } from '../core/types';
import { EventBus } from '../core/event-bus';

const START: PlayerStats = {
  credits: 120,
  reputation: 0,
  agua: 1,
  fichas: 3,
  x: 8,
  y: 15,
  districtId: 'morro-neon',
};

export class PlayerSystem {
  private stats: PlayerStats;

  constructor(
    private readonly bus: EventBus,
    initial: PlayerStats = { ...START },
  ) {
    this.stats = { ...initial };
  }

  getStats(): PlayerStats {
    return { ...this.stats };
  }

  setPosition(x: number, y: number): void {
    this.stats = { ...this.stats, x, y };
    this.bus.emit('player:moved', {
      x,
      y,
      districtId: this.stats.districtId,
    });
  }

  setDistrict(districtId: DistrictId): void {
    this.stats = { ...this.stats, districtId };
    this.bus.emit('district:entered', { districtId });
  }

  addCredits(delta: number): number {
    this.stats = {
      ...this.stats,
      credits: Math.max(0, this.stats.credits + delta),
    };
    this.bus.emit('player:credits-changed', {
      credits: this.stats.credits,
      delta,
    });
    return this.stats.credits;
  }

  addReputation(delta: number): number {
    this.stats = {
      ...this.stats,
      reputation: this.stats.reputation + delta,
    };
    this.bus.emit('player:reputation-changed', {
      reputation: this.stats.reputation,
      delta,
    });
    return this.stats.reputation;
  }

  addAgua(delta: number): number {
    this.stats = {
      ...this.stats,
      agua: Math.max(0, this.stats.agua + delta),
    };
    return this.stats.agua;
  }

  addFichas(delta: number): number {
    this.stats = {
      ...this.stats,
      fichas: Math.max(0, this.stats.fichas + delta),
    };
    return this.stats.fichas;
  }

  hydrate(stats: PlayerStats): void {
    this.stats = { ...stats };
  }
}
