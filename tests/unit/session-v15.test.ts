import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import { listJobs } from '../../src/systems/grind';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('session v1.5 recovery and upgrades', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('blocks walking onto NPCs and enforces safe-job cooldown', () => {
    const session = new GameSession(3);
    session.startNew();
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    session.player.setPosition(nair.x - 1, nair.y);
    expect(session.move(1, 0)).toBe(false);
    const job = listJobs('morro-neon', -999).find((j) => j.flatPay)!;
    expect(session.doSafeJob(job.id)).toBe(true);
    expect(session.doSafeJob(job.id)).toBe(false);
  });

  it('buys upgrades from menu flow helpers', () => {
    const session = new GameSession(4);
    session.startNew();
    session.player.addCredits(500);
    expect(session.openUpgrades()).toBe(true);
    session.ui.go('play');
    expect(session.buyUpgrade('sorte')).toBe(true);
    expect(session.upgrades.getLevel('sorte')).toBe(1);
    expect(session.buyUpgrade('sorte')).toBe(true);
  });

  it('exit prompt only on pad tiles; continue exploring keeps save', () => {
    const session = new GameSession(5);
    session.startNew();
    session.world.unlock('feira-central');
    session.player.setPosition(37, 14);
    expect(session.nearbyExit()).toBeNull();
    session.player.setPosition(38, 14);
    expect(session.nearbyExit()?.toDistrict).toBe('feira-central');
    session.player.setPosition(38, 15);
    expect(session.nearbyExit()?.toDistrict).toBe('feira-central');

    session.ui.go('ending');
    const credits = session.player.getStats().credits;
    expect(session.continueExploring()).toBe(true);
    expect(session.ui.is('play')).toBe(true);
    expect(session.player.getStats().credits).toBe(credits);
    expect(session.openJobs()).toBe(true);
  });

  it('broke objective points at nearest odd-job NPC', () => {
    const session = new GameSession(6);
    session.startNew();
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.isBroke()).toBe(true);
    const hint = session.brokeHintText();
    expect(hint).toMatch(/odd jobs/i);
    expect(session.objective().text).toBe(hint);
    const giver = session.nearestSafeJobNpc();
    expect(giver?.safeJobId).toBeTruthy();
    expect(session.offerBet('agua-gelada')).toBe(false);
  });

  it('continueExploring no-ops off ending; cross-district broke hint', () => {
    const session = new GameSession(7);
    session.startNew();
    expect(session.continueExploring()).toBe(false);
    session.player.addCredits(-session.player.getStats().credits);
    // Strip local givers so hint names an out-of-district worker.
    for (const n of session.npcs) {
      if (n.districtId === 'morro-neon') n.safeJobId = undefined;
    }
    const hint = session.brokeHintText();
    expect(hint).toMatch(/find .+ \(/);
    expect(session.nearestSafeJobNpc()?.districtId).not.toBe('morro-neon');
    // No givers at all → Esc menu fallback copy.
    for (const n of session.npcs) n.safeJobId = undefined;
    expect(session.nearestSafeJobNpc()).toBeNull();
    expect(session.brokeHintText()).toMatch(/Esc/);
    expect(session.isBroke()).toBe(true);
    session.player.addCredits(50);
    expect(session.isBroke()).toBe(false);
    expect(session.brokeHintText()).toBeNull();
  });

  it('auto-travels when stepping onto exit; guards empty bet paths', () => {
    const session = new GameSession(8);
    session.startNew();
    session.world.unlock('feira-central');
    session.player.setPosition(37, 14);
    expect(session.move(1, 0)).toBe(true);
    expect(session.player.getStats().districtId).toBe('feira-central');
    expect(session.offerBet('no-such-bet')).toBe(false);
    expect(session.getPendingBet()).toBeNull();
    expect(session.adjustStake(5)).toBe(0);
    session.ui.go('menu');
    expect(session.interact()).toBe(false);
    expect(session.doSafeJob('missing-job')).toBe(false);
  });
});
