import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { STORY_BEATS } from '../../src/content/story';
import { clearStorage } from '../../src/systems/save';
import { listJobs } from '../../src/systems/grind';
import { pityWinChance } from '../../src/systems/betting';
import { getBet } from '../../src/content/bets';

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

/** Simulate a stubborn player: take every story bet, grind safe jobs if broke, retry until win. */
function simulatePlaythrough(seed: number): {
  completed: boolean;
  storyBets: number;
  safeJobs: number;
} {
  const session = new GameSession(seed);
  session.startNew();
  let storyBets = 0;
  let safeJobs = 0;
  const maxSteps = 400;
  for (let step = 0; step < maxSteps; step += 1) {
    if (session.story.getCompleted().includes('torre-final')) {
      return { completed: true, storyBets, safeJobs };
    }
    const next = STORY_BEATS.find(
      (b) =>
        !session.story.getCompleted().includes(b.id) &&
        b.requiredFlags.every((f) => session.story.getFlag(f)),
    );
    if (!next) break;
    if (next.districtId !== session.player.getStats().districtId) {
      if (!session.world.isUnlocked(next.districtId)) break;
      session.travelTo(next.districtId);
    }
    if (!next.betId) {
      session.runStoryBeat(next.id);
      session.closeModal();
      continue;
    }
    // Ensure we can afford the stake via safe jobs.
    while (session.player.getStats().credits < 8 && safeJobs < 80) {
      const job = listJobs(session.player.getStats().districtId, -999).find(
        (j) => j.flatPay,
      );
      if (!job) break;
      session.doSafeJob(job.id);
      safeJobs += 1;
    }
    session.runStoryBeat(next.id);
    if (!session.acceptStoryBet()) {
      // Broke: grind then retry next loop.
      continue;
    }
    session.confirmBet();
    storyBets += 1;
  }
  return {
    completed: session.story.getCompleted().includes('torre-final'),
    storyBets,
    safeJobs,
  };
}

describe('Monte Carlo story completion', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('pity rises and story gates stay near even-money', () => {
    const pixo = getBet('pixo-challenge')!;
    expect(pityWinChance(pixo.odds, pixo.houseEdge, 0)).toBeGreaterThanOrEqual(0.4);
    expect(pityWinChance(pixo.odds, pixo.houseEdge, 3)).toBeGreaterThanOrEqual(0.7);
  });

  it('median playthrough completes with a modest story-bet budget', () => {
    const runs = 80;
    const results = Array.from({ length: runs }, (_, i) => simulatePlaythrough(i + 1));
    const completed = results.filter((r) => r.completed);
    expect(completed.length / runs).toBeGreaterThanOrEqual(0.95);
    const bets = completed.map((r) => r.storyBets).sort((a, b) => a - b);
    const median = bets[Math.floor(bets.length / 2)] ?? Infinity;
    // 9 story bets if always win; pity + retries should keep median under ~22.
    expect(median).toBeLessThanOrEqual(22);
  });

  it('zero-credit negative-rep state still has a safe job', () => {
    const session = new GameSession(99);
    session.startNew();
    session.player.addCredits(-session.player.getStats().credits);
    session.player.addReputation(-20);
    const jobs = listJobs('morro-neon', session.player.getStats().reputation);
    expect(jobs.some((j) => j.flatPay)).toBe(true);
    expect(session.doSafeJob(jobs.find((j) => j.flatPay)!.id)).toBe(true);
    expect(session.player.getStats().credits).toBeGreaterThan(0);
  });
});
