import { describe, expect, it } from 'vitest';
import { estimateHourly, jobBet, listJobs } from '../../src/systems/grind';
import { UpgradeSystem, UPGRADES } from '../../src/systems/upgrade';

describe('grind', () => {
  it('lists jobs by district and reputation', () => {
    const jobs = listJobs('morro-neon', 0);
    expect(jobs.some((j) => j.id === 'job-agua')).toBe(true);
    expect(listJobs('morro-neon', 100).length).toBeGreaterThan(jobs.length);
    const bet = jobBet(jobs[0]!);
    expect(bet?.id).toBe(jobs[0]!.betId);
    expect(estimateHourly(jobs[0]!)).toBeTypeOf('number');
  });
});

describe('UpgradeSystem', () => {
  it('buys upgrades with costs and bonuses', () => {
    const upgrades = new UpgradeSystem();
    expect(upgrades.canBuy('sorte', 10)).toBe(false);
    const cost = upgrades.buy('sorte', 500);
    expect(cost).toBe(UPGRADES[0]!.cost);
    expect(upgrades.getLevel('sorte')).toBe(1);
    expect(upgrades.luckBonus()).toBeCloseTo(0.02);
    expect(upgrades.waterDiscount()).toBe(0);
    expect(upgrades.buy('filtro-agua', 500)).toBeTruthy();
    expect(upgrades.waterDiscount()).toBe(0.2);
    expect(upgrades.fameBonus()).toBe(0);
    expect(upgrades.nextCost('sorte')).toBe(UPGRADES[0]!.cost * 2);
    expect(upgrades.canBuy('sorte', upgrades.nextCost('sorte') - 1)).toBe(false);
    expect(upgrades.canBuy('sorte', upgrades.nextCost('sorte'))).toBe(true);
    upgrades.hydrate({ fama: 2, 'filtro-agua': 1 });
    expect(upgrades.fameBonus()).toBe(2);
    expect(Object.keys(upgrades.export()).length).toBeGreaterThan(0);
    expect(upgrades.canBuy('filtro-agua', 9999)).toBe(false);
  });
});
