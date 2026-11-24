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
});
