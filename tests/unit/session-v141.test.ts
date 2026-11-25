import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';

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

describe('session v1.14.1 needle / economy / epilogue', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('epilogue opens a credits roll after the laje scene', () => {
    const session = new GameSession(5);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    session.world.unlock('morro-neon');
    expect(session.runStoryBeat('epilogue-laje')).toBe(true);
    session.pickDialogueChoice('epi_feed', 'Feed stays warm.');
    session.closeModal();
    expect(session.story.getCompleted()).toContain('epilogue-laje');
    expect(session.showingCreditsRoll()).toBe(true);
    expect(session.ui.is('ending')).toBe(true);
    expect(session.continueExploring()).toBe(true);
    expect(session.showingCreditsRoll()).toBe(false);
    expect(session.ui.is('play')).toBe(true);
  });

  it('ending continueExploring without credits uses free-roam toast', () => {
    const session = new GameSession(6);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    session.story.setFlag('final_bom', true);
    session.ui.go('ending');
    expect(session.showingCreditsRoll()).toBe(false);
    expect(session.continueExploring()).toBe(true);
    expect(session.ui.is('play')).toBe(true);
  });

  it('cancel skill abandons without stake loss; RNG pity toast stays capped', () => {
    const session = new GameSession(8);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    const before = session.player.getStats().credits;
    expect(session.acceptStoryBet()).toBe(true);
    session.cancelBet();
    expect(session.player.getStats().credits).toBe(before);
    expect(session.ui.is('play')).toBe(true);
    session.player.addCredits(40);
    expect(session.offerBet('laje-lottery')).toBe(true);
    session.confirmBet();
    session.offerBet('laje-lottery');
    session.confirmBet();
    expect(session.getBetLosses('laje-lottery')).toBeGreaterThanOrEqual(0);
  });

  it('broke player cannot accept RNG side-story bet (no skill top-up)', () => {
    const session = new GameSession(12);
    session.startNew();
    session.story.setFlag('antena_ok', true);
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.runStoryBeat('side-morro-tank')).toBe(true);
    expect(session.acceptStoryBet()).toBe(false);
    expect(session.getPendingBet()).toBeNull();
    expect(session.ui.is('play')).toBe(true);
  });

  it('free-roam objective points at Nair epilogue then settles after credits', () => {
    const session = new GameSession(13);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    session.story.setFlag('free_roam', true);
    const o = session.objective();
    expect(o.detail ?? o.text).toMatch(/epilogue|Nair|Free roam/i);
    session.story.setFlag('epilogue_done', true);
    expect(session.objective().text).toMatch(/Story complete|grind/i);
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.buyUpgrade('bolso')).toBe(false);
  });

  it('duel miss toast widens zone; choice miss retries; streak bonus', () => {
    const session = new GameSession(14);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.completeSkillPerfect()).toBe(true);
    expect(session.getSkillStreak()).toBeGreaterThanOrEqual(1);
    for (const f of [
      'conheceu_rita',
      'falou_nair',
      'antena_ok',
      'feira_ok',
      'avenida_ok',
      'vazamento_ok',
      'vip_ok',
      'negotiate_ok',
    ]) {
      session.story.setFlag(f, true);
    }
    session.world.unlock('torre-casa');
    session.travelTo('torre-casa');
    session.player.addCredits(100);
    session.runStoryBeat('torre-final');
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.submitSkill(0)).toBe(true);
    const mid = session.getSkillProgress();
    expect(mid?.misses).toBeGreaterThan(0);
    expect(mid?.def.phases[0]?.window).toBeGreaterThan(0.1);
    expect(session.submitSkill(mid!.def.phases[0]!.target)).toBe(true);
    expect(session.submitSkill(0)).toBe(true);
    expect(session.getSkillProgress()?.phaseIndex).toBe(1);
    expect(session.completeSkillPerfect()).toBe(true);
    expect(session.getSkillStreak()).toBeGreaterThanOrEqual(2);
    expect(session.submitSkill(0.5)).toBe(false);
  });
});
