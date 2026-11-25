import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import {
  INTERACT_RANGE,
  districtExits,
  districtNpcs,
} from '../../src/systems/interaction';
import { padClearOfNpcOverlap } from '../../src/systems/interact-priority';
import {
  decodePins,
  encodePins,
  judgePhase,
  perfectAttempt,
  phasePins,
  skillForBet,
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

function stubStorage(): void {
  const mem = new MemoryStorage();
  vi.stubGlobal('localStorage', mem);
  clearStorage(mem);
}

describe('session v1.15.0 dialogue and elevator', () => {
  beforeEach(stubStorage);

  it('strips dialogue choices after pick so option 2 does not loop', () => {
    const session = new GameSession(15);
    session.startNew();
    session.story.setFlag('conheceu_rita', true);
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    session.player.setPosition(nair.x, nair.y);
    expect(session.interact()).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
    expect(session.hasOpenDialogueChoices()).toBe(true);
    session.pickDialogueChoice(
      'rita_quiet',
      'Quiet. Style’s locked — next tap Take the bet.',
    );
    expect(session.hasOpenDialogueChoices()).toBe(false);
    expect(session.story.getFlag('rita_quiet')).toBe(true);
    const lines = session.getDialogue();
    expect(lines.some((l) => l.choices?.length)).toBe(false);
    expect(lines.at(-1)?.text).toMatch(/Take the bet|Style/i);
  });

  it('VIP elevator wins when standing on the pad over Augusto', () => {
    const session = new GameSession(16);
    session.startNew();
    session.world.unlock('torre-casa');
    session.travelTo('torre-casa');
    (session as unknown as { vipFloor: boolean }).vipFloor = true;
    const elev = session.npcs.find((n) => n.id === 'elevator-vip')!;
    const ceo = session.npcs.find((n) => n.id === 'ceo')!;
    expect(Math.hypot(ceo.x - elev.x, ceo.y - elev.y)).toBeGreaterThan(INTERACT_RANGE);
    session.player.setPosition(elev.x, elev.y);
    expect(session.nearbyElevatorPad()?.id).toBe('elevator-vip');
    expect(session.nearbyNpc()?.id).toBe('elevator-vip');
  });

  it('every exit and elevator pad stays clear of NPC interact radii', () => {
    const npcs = districtNpcs();
    for (const exit of districtExits()) {
      const here = npcs.filter((n) => n.districtId === exit.districtId);
      expect(
        padClearOfNpcOverlap(exit, here, INTERACT_RANGE),
        `${exit.id} overlapped`,
      ).toBe(true);
    }
    for (const elev of npcs.filter((n) => n.id.startsWith('elevator'))) {
      const here = npcs.filter(
        (n) => n.districtId === elev.districtId && n.floor === elev.floor,
      );
      expect(
        padClearOfNpcOverlap(elev, here, INTERACT_RANGE),
        `${elev.id} overlapped`,
      ).toBe(true);
    }
  });

  it('nearbyElevatorPad is null when far; E on pad descends VIP car', () => {
    const session = new GameSession(18);
    session.startNew();
    session.world.unlock('torre-casa');
    session.travelTo('torre-casa');
    (session as unknown as { vipFloor: boolean }).vipFloor = true;
    session.player.setPosition(2, 2);
    expect(session.nearbyElevatorPad()).toBeNull();
    const elev = session.npcs.find((n) => n.id === 'elevator-vip')!;
    session.player.setPosition(elev.x, elev.y);
    expect(session.interact()).toBe(true);
    expect(session.isVipFloor()).toBe(false);
  });

  it('epilogue choice finishes into credits without bouncing to play', () => {
    const session = new GameSession(17);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    expect(session.runStoryBeat('epilogue-laje')).toBe(true);
    expect(session.getPendingStoryBeat()).toBe('epilogue-laje');
    session.pickDialogueChoice('epi_feed', 'Feed stays warm.');
    expect(session.hasOpenDialogueChoices()).toBe(false);
    session.closeModal();
    expect(session.ui.is('ending')).toBe(true);
    expect(session.showingCreditsRoll()).toBe(true);
  });
});

describe('session v1.15.0 lockpick and job edges', () => {
  beforeEach(stubStorage);

  it('lockpick skill encodes pins and perfectAttempt wins', () => {
    const def = skillForBet('feira-lockbox', 'lockpick')!;
    expect(def.kind).toBe('lockpick');
    const phase = def.phases[0]!;
    expect(phase.kind).toBe('lockpick');
    expect(judgePhase(phase, encodePins([0, 0, 0]))).toBe(false);
    expect(judgePhase(phase, encodePins(phase.pins!))).toBe(true);
    expect(decodePins(encodePins([1, 2, 0]), 3)).toEqual([1, 2, 0]);
    expect(phasePins({ kind: 'lockpick', prompt: 'x', target: 0, steps: 2 })).toEqual([
      1, 2,
    ]);
    const fallback = skillForBet('unknown-lock-bet', 'lockpick')!;
    expect(fallback.phases[0]?.pins?.length).toBe(3);
    let p = startSkill(def);
    p = attemptSkill(p, perfectAttempt(p));
    expect(p.done).toBe(true);
    expect(p.won).toBe(true);
  });

  it('covers stake/job edge branches and pin clamp', () => {
    expect(encodePins([9, -2, 1.6])).toBe(encodePins([2, 0, 2]));
    const session = new GameSession(19);
    session.startNew();
    expect(session.adjustStake(5)).toBe(0);
    expect(session.getPendingBet()).toBeNull();
    for (let i = 0; i < 40; i += 1) {
      (session as unknown as { lastSafeJobMs: number }).lastSafeJobMs = 0;
      if (!session.doSafeJob('safe-morro-neon')) break;
    }
    (session as unknown as { lastSafeJobMs: number }).lastSafeJobMs = 0;
    expect(session.doSafeJob('safe-morro-neon')).toBe(false);
    session.setMasterVolume(2);
    expect(session.getAudio().masterVolume).toBe(1);
    session.setMasterVolume(-1);
    expect(session.getAudio().masterVolume).toBe(0);
    (session as unknown as { safeJobUses: number; lastSafeJobMs: number }).safeJobUses =
      0;
    (session as unknown as { lastSafeJobMs: number }).lastSafeJobMs = Date.now();
    expect(session.doSafeJob('safe-morro-neon')).toBe(false);
    expect(session.getPendingStake()).toBe(0);
    session.story.completeBeat('side-morro-copper');
    (session as unknown as { safeJobUses: number; lastSafeJobMs: number }).safeJobUses =
      0;
    (session as unknown as { lastSafeJobMs: number }).lastSafeJobMs = 0;
    const catador = session.npcs.find((n) => n.id === 'catador-morro')!;
    session.player.setPosition(catador.x, catador.y);
    expect(session.interact()).toBe(true);
  });
});
