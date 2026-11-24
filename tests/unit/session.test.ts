import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('GameSession basics', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('starts a new game and moves the player', () => {
    const session = new GameSession(42);
    session.startNew();
    const before = session.player.getStats();
    session.move(1, 0);
    expect(session.player.getStats().x).toBe(before.x + 1);
  });

  it('places bets and rejects unaffordable stakes', () => {
    const session = new GameSession(1);
    session.startNew();
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.placeBet('agua-gelada')).toBe(false);
    session.player.addCredits(100);
    expect(session.placeBet('agua-gelada')).toBe(true);
  });

  it('runs story beats via proximity dialogue flow', () => {
    const session = new GameSession(2);
    session.startNew();
    expect(session.story.getFlag('conheceu_rita')).toBe(true);
    expect(session.runStoryBeat('boteco-nair')).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
    expect(session.getDialogue().length).toBeGreaterThan(0);
    expect(session.availableStory().length).toBeGreaterThan(0);
  });

  it('interacts with nearby npc and blocks out of range', () => {
    const session = new GameSession(7);
    session.startNew();
    expect(session.interact()).toBe(false);
    session.player.setPosition(14, 15);
    expect(session.nearbyNpc()?.id).toBe('dona-nair');
    expect(session.interact()).toBe(true);
  });
});

describe('GameSession persistence', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('travels only to unlocked districts and persists audio', () => {
    const session = new GameSession(3);
    session.startNew();
    expect(session.travelTo('feira-central')).toBe(false);
    session.world.unlock('feira-central');
    expect(session.travelTo('feira-central')).toBe(true);
    session.setMuted(true);
    session.setMasterVolume(0.2);
    expect(session.getAudio()).toEqual({ muted: true, masterVolume: 0.2 });
    session.persist();
    const loaded = new GameSession(3);
    expect(loaded.tryLoad()).toBe(true);
    expect(loaded.player.getStats().districtId).toBe('feira-central');
  });

  it('tryLoad returns false without save', () => {
    expect(new GameSession(4).tryLoad()).toBe(false);
  });

  it('opens travel/jobs/menu only from play', () => {
    const session = new GameSession(8);
    session.startNew();
    expect(session.openMenu()).toBe(true);
    expect(session.openTravel()).toBe(false);
    session.closeModal();
    expect(session.openJobs()).toBe(true);
  });
});
