import type { DistrictId, PlayerStats } from '../core/types';
import { EventBus } from '../core/event-bus';
import { createCharAnim, tickCharAnim, type CharAnimState } from './char-anim';

const START: PlayerStats = {
  credits: 120,
  reputation: 0,
  agua: 1,
  fichas: 3,
  x: 12,
  y: 16,
  districtId: 'morro-neon',
};

export class PlayerSystem {
  private stats: PlayerStats;
  /** Last non-zero move facing (tile steps). Used for E-target bias. */
  private faceDx = 1;
  private faceDy = 0;
  private anim: CharAnimState = createCharAnim('right');
  private lastStepDx = 0;
  private lastStepDy = 0;
  private running = false;
  private movedThisPulse = false;

  constructor(
    private readonly bus: EventBus,
    initial: PlayerStats = { ...START },
  ) {
    this.stats = { ...initial };
  }

  getStats(): PlayerStats {
    return { ...this.stats };
  }

  getFacing(): { dx: number; dy: number } {
    return { dx: this.faceDx, dy: this.faceDy };
  }

  getAnim(): CharAnimState {
    return this.anim;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  /** Advance locomotion anim; call once per render frame. */
  tickAnim(dt: number): CharAnimState {
    const dx = this.movedThisPulse ? this.lastStepDx : 0;
    const dy = this.movedThisPulse ? this.lastStepDy : 0;
    this.anim = tickCharAnim(this.anim, {
      dx,
      dy,
      running: this.running && this.movedThisPulse,
      dt,
    });
    this.movedThisPulse = false;
    return this.anim;
  }

  triggerTalk(): void {
    this.anim = tickCharAnim(this.anim, {
      dx: 0,
      dy: 0,
      running: false,
      talk: true,
      dt: 0,
    });
  }

  setFacing(dx: number, dy: number): void {
    if (!dx && !dy) return;
    this.faceDx = Math.sign(dx);
    this.faceDy = Math.sign(dy);
    this.lastStepDx = this.faceDx;
    this.lastStepDy = this.faceDy;
    this.movedThisPulse = true;
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
    // Playtest #31: never go negative — retries shouldn't tank the hill.
    const next = Math.max(0, this.stats.reputation + delta);
    const applied = next - this.stats.reputation;
    this.stats = {
      ...this.stats,
      reputation: next,
    };
    this.bus.emit('player:reputation-changed', {
      reputation: this.stats.reputation,
      delta: applied,
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
