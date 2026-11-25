import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import {
  skillForBet,
  judgePhase,
  startSkill,
  attemptSkill,
} from '../../src/systems/minigame';

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

describe('session skill encounters', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('opens skill UI for story gates and perfect-clears', () => {
    const session = new GameSession(42);
    session.startNew();
    session.player.setPosition(13, 14);
    expect(session.interact()).toBe(true);
    session.pickDialogueChoice('rita_loud', 'Loud it is.');
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.ui.is('skill')).toBe(true);
    expect(session.getSkillProgress()?.def.kind).toBe('timing');
    expect(session.completeSkillPerfect()).toBe(true);
    expect(session.story.getCompleted()).toContain('boteco-nair');
  });

  it('failed skill attempt costs stake and leaves beat retryable', () => {
    const session = new GameSession(7);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    const before = session.player.getStats().credits;
    expect(session.acceptStoryBet()).toBe(true);
    // Miss the timing window hard.
    expect(session.submitSkill(0)).toBe(true);
    expect(session.player.getStats().credits).toBeLessThan(before);
    expect(session.story.getCompleted().includes('boteco-nair')).toBe(false);
    expect(session.ui.is('play')).toBe(true);
  });

  it('prioritizes objective NPC over exit for E', () => {
    const session = new GameSession(3);
    session.startNew();
    session.world.unlock('feira-central');
    // Stand on Fair exit while objective is still Nair elsewhere — exit wins if no NPC.
    session.player.setPosition(36, 16);
    expect(session.nearbyExit()?.toDistrict).toBe('feira-central');
    // Place player on Nair so objective NPC wins.
    session.player.setPosition(13, 14);
    const npc = session.nearbyNpc();
    expect(npc?.name).toBe('Dona Nair');
    expect(session.interact()).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
  });

  it('elevator ride relocates to VIP floor after skill win', () => {
    const session = new GameSession(11);
    session.startNew();
    for (const id of [
      'boteco-nair',
      'side-morro-copper',
      'morro-antena',
      'luna-beco',
      'morro-fios',
      'seu-ze-banca',
      'feira-kiko',
      'feira-catador',
      'bia-set',
      'feira-dancer',
      'feira-forro',
      'feira-radio',
      'feira-tipster',
      'feira-courier',
      'prova-luna',
      'avenida-twist',
      'avenida-checkpoint',
      'avenida-courier',
      'avenida-influencer',
      'avenida-radar',
      'avenida-atm',
      'avenida-stealth',
      'lobby-margin',
      'morro-return-nair',
      'torre-foyer',
      'torre-pit',
    ]) {
      session.story.completeBeat(id);
    }
    for (const f of [
      'conheceu_rita',
      'falou_nair',
      'copper_weighed',
      'antena_ok',
      'conheceu_luna',
      'fios_ok',
      'unlocked_feira',
      'unlocked_avenida',
      'unlocked_torre',
      'escandalo_aberto',
      'morro_return_ok',
      'foyer_ok',
      'pit_ok',
      'dancer_ok',
      'courier_shadow_ok',
      'stealth_ok',
    ]) {
      session.story.setFlag(f, true);
    }
    session.world.unlock('torre-casa');
    session.travelTo('torre-casa');
    session.player.addCredits(80);
    session.runStoryBeat('torre-elevator');
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.completeSkillPerfect()).toBe(true);
    const s = session.player.getStats();
    expect(s.x).toBe(30);
    expect(s.y).toBe(8);
    expect(session.story.getCompleted()).toContain('torre-elevator');
  });

  it('nearbyAltNpc returns a different NPC when crowded', () => {
    const session = new GameSession(5);
    session.startNew();
    session.player.setPosition(13, 14);
    const primary = session.nearbyNpc();
    expect(primary).toBeTruthy();
    const alt = session.nearbyAltNpc();
    if (alt) expect(alt.id).not.toBe(primary!.id);
  });

  it('grind offerBet stays on RNG panel; cancel clears skill', () => {
    const session = new GameSession(8);
    session.startNew();
    session.story.completeBeat('boteco-nair');
    expect(session.offerBet('agua-gelada')).toBe(true);
    expect(session.ui.is('bet')).toBe(true);
    session.cancelBet();
    expect(session.ui.is('play')).toBe(true);
    session.runStoryBeat('side-morro-copper');
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.ui.is('skill')).toBe(true);
    session.cancelBet();
    expect(session.getSkillProgress()).toBeNull();
  });

  it('submitSkill no-ops without progress; travel emits fade', () => {
    const session = new GameSession(2);
    session.startNew();
    expect(session.submitSkill(0.5)).toBe(false);
    expect(session.completeSkillPerfect()).toBe(false);
    session.world.unlock('feira-central');
    const flashes: string[] = [];
    session.bus.on('world:transition', (p) => flashes.push(p.kind));
    expect(session.travelTo('feira-central')).toBe(true);
    expect(flashes).toContain('fade');
    expect(session.travelTo('torre-casa')).toBe(false);
  });
});

describe('minigame branches', () => {
  it('covers chase/hack/choice judges and unknown bet fallback', () => {
    expect(judgePhase({ kind: 'chase', prompt: 'x', target: 3, steps: 3 }, 3)).toBe(true);
    expect(judgePhase({ kind: 'hack', prompt: 'x', target: 2, steps: 2 }, 1)).toBe(false);
    const fallback = skillForBet('unknown-bet', 'timing');
    expect(fallback?.phases[0]?.kind).toBe('timing');
    const choice = skillForBet('unknown-choice', 'choice');
    expect(choice?.phases[0]?.options?.length).toBeGreaterThan(0);
    let p = startSkill(skillForBet('fio-corrida', 'chase')!);
    p = attemptSkill(p, { phaseIndex: 0, value: 4 });
    expect(p.won).toBe(true);
    expect(skillForBet('x', undefined)).toBeNull();
    expect(skillForBet('x', 'duel')?.phases).toHaveLength(3);
  });
});
