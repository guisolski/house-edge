import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import { BETS } from '../../src/content/bets';
import {
  attemptSkill,
  choiceClueIndirect,
  lockpickClueDeducible,
  lockpickClueIsDecoy,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';
import {
  EXIT_CLEAR_RANGE,
  EXIT_STAND_RANGE,
  districtExits,
} from '../../src/systems/interaction';
import { shouldClearExitLatch } from '../../src/systems/interact-priority';
import { getBeat } from '../../src/content/story';

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

const DRONE_FLAGS = [
  'nair_ok',
  'antena_ok',
  'luna_ok',
  'fios_ok',
  'ze_ok',
  'feira_ok',
  'prova_ok',
  'twist_ok',
  'checkpoint_ok',
  'courier_ok',
  'influencer_ok',
] as const;

describe('v1.17.0 stealth Neon Snap', () => {
  beforeEach(stubStorage);

  it('offerBet on avenida-drone starts in-world stealth, not a sequence panel', () => {
    const s = new GameSession(1);
    s.startNew();
    for (const flag of DRONE_FLAGS) s.story.setFlag(flag, true);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.player.addCredits(200);
    expect(s.runStoryBeat('avenida-drone')).toBe(true);
    expect(s.acceptStoryBet()).toBe(true);
    expect(s.isStealthActive()).toBe(true);
    expect(s.ui.is('play')).toBe(true);
    expect(s.ui.is('skill')).toBe(false);
    const credits = s.player.getStats().credits;
    const st = s.getStealthProgress()!;
    const d = st.drones[0]!;
    s.player.setPosition(d.x + Math.cos(d.facing) * 1.5, d.y + Math.sin(d.facing) * 1.5);
    s.tickStealthFrame(0.05);
    expect(s.player.getStats().credits).toBe(credits);
    expect(s.completeStealthPerfect()).toBe(true);
    expect(s.isStealthActive()).toBe(false);
  });

  it('completeSkillPerfect skips active stealth', () => {
    const s = new GameSession(2);
    s.startNew();
    for (const flag of DRONE_FLAGS) s.story.setFlag(flag, true);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.player.addCredits(200);
    s.runStoryBeat('avenida-drone');
    s.acceptStoryBet();
    expect(s.completeSkillPerfect()).toBe(true);
    expect(s.story.getCompleted()).toContain('avenida-drone');
  });

  it('cancelBet clears stealth; completeStealthPerfect no-ops when idle', () => {
    const s = new GameSession(9);
    s.startNew();
    expect(s.completeStealthPerfect()).toBe(false);
    for (const flag of DRONE_FLAGS) s.story.setFlag(flag, true);
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.player.addCredits(200);
    s.runStoryBeat('avenida-drone');
    s.acceptStoryBet();
    expect(s.isStealthActive()).toBe(true);
    s.cancelBet();
    expect(s.isStealthActive()).toBe(false);
    expect(s.ui.is('play')).toBe(true);
  });

  it('finishSkill lose path resets streak without credit loss', () => {
    const s = new GameSession(10);
    s.startNew();
    s.player.addCredits(200);
    s.story.setFlag('conheceu_rita', true);
    s.story.setFlag('falou_nair', true);
    // Open a lockpick story skill and snap the pick.
    s.world.unlock('feira-central');
    s.player.setDistrict('feira-central');
    for (const f of [
      'ze_ok',
      'kiko_ok',
      'catador_ok',
      'bia_ok',
      'dancer_ok',
      'forro_ok',
    ]) {
      s.story.setFlag(f, true);
    }
    // Force skill via offer after setting pending story beat manually if needed.
    expect(s.runStoryBeat('feira-lockbox')).toBe(true);
    expect(s.acceptStoryBet()).toBe(true);
    const before = s.player.getStats().credits;
    let guard = 0;
    while (s.ui.is('skill') && guard < 8) {
      s.submitSkill(0);
      guard += 1;
    }
    expect(s.player.getStats().credits).toBe(before);
  });
});

describe('v1.17.0 clue audit (deducible, no answer/synonym leak)', () => {
  it('covers validator false / non-gate branches', () => {
    expect(lockpickClueDeducible({ kind: 'timing', prompt: 'x', target: 0.5 })).toBe(
      true,
    );
    expect(
      lockpickClueDeducible({
        kind: 'lockpick',
        prompt: 'x',
        target: 0,
        pins: [1, 2, 0],
        clue: 'too short',
      }),
    ).toBe(false);
    expect(
      lockpickClueDeducible({
        kind: 'lockpick',
        prompt: 'x',
        target: 0,
        pins: [1, 2, 0],
        clue: 'a very long decoy clue with absolutely no positional tumbler hooks forever',
      }),
    ).toBe(false);
    expect(choiceClueIndirect({ kind: 'timing', prompt: 'x', target: 0.5 })).toBe(true);
    expect(
      choiceClueIndirect({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['the and', 'the and'],
        clue: 'sixteen-plus chars of street whisper only',
      }),
    ).toBe(true);
  });

  it('every choice/puzzle/negotiate clue passes indirect + synonym ban', () => {
    const skillBets = BETS.filter(
      (b) =>
        b.skill === 'choice' ||
        b.skill === 'puzzle' ||
        b.skill === 'negotiate' ||
        b.skill === 'duel',
    );
    for (const bet of skillBets) {
      const def = skillForBet(bet.id, bet.skill)!;
      for (const phase of def.phases) {
        if (
          phase.kind !== 'choice' &&
          phase.kind !== 'puzzle' &&
          phase.kind !== 'negotiate'
        ) {
          continue;
        }
        expect(
          choiceClueIndirect(phase),
          `${bet.id} clue="${phase.clue}" answer=${phase.options?.[phase.target]}`,
        ).toBe(true);
      }
    }
  });

  it('every lockpick clue is decoy + deducible', () => {
    for (const bet of BETS.filter((b) => b.skill === 'lockpick')) {
      const phase = skillForBet(bet.id, 'lockpick')!.phases[0]!;
      expect(lockpickClueIsDecoy(phase), bet.id).toBe(true);
      expect(lockpickClueDeducible(phase), `${bet.id}: ${phase.clue}`).toBe(true);
    }
  });

  it('rejects synonym leak (hum/buzz) and dog-eared label', () => {
    expect(
      choiceClueIndirect({
        kind: 'puzzle',
        prompt: 'x',
        target: 1,
        options: ['Sun crate', 'Hum crate', 'Empty crate'],
        clue: 'Barraca points at the humming box under the tarp.',
      }),
    ).toBe(false);
    expect(
      choiceClueIndirect({
        kind: 'puzzle',
        prompt: 'x',
        target: 0,
        options: ['Dog-eared', 'Gold foil', 'Shrink-wrap'],
        clue: 'thumb on the dog-eared corner of the deck',
      }),
    ).toBe(false);
  });
});

describe('v1.17.0 pad latch hysteresis', () => {
  beforeEach(stubStorage);

  it('clear range is larger than trigger range', () => {
    expect(EXIT_CLEAR_RANGE).toBeGreaterThan(EXIT_STAND_RANGE);
  });

  it('latch stays until player leaves the clear radius', () => {
    const exits = districtExits().filter((e) => e.districtId === 'avenida-odds');
    const pad = exits[0]!;
    expect(
      shouldClearExitLatch({ x: pad.x + 2, y: pad.y }, exits, EXIT_CLEAR_RANGE),
    ).toBe(false);
    expect(
      shouldClearExitLatch({ x: pad.x + 5, y: pad.y }, exits, EXIT_CLEAR_RANGE),
    ).toBe(true);
  });

  it('travelTo engages latch so reciprocal pad does not fire immediately', () => {
    const s = new GameSession(3);
    s.startNew();
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('feira-central');
    const exit = districtExits().find(
      (e) => e.districtId === 'feira-central' && e.toDistrict === 'avenida-odds',
    )!;
    s.player.setPosition(exit.x, exit.y);
    expect(s.travelTo('avenida-odds')).toBe(true);
    expect(s.nearbyExit()).toBeNull();
  });
});

describe('v1.17.0 epilogue Saúde + sequence fail tension', () => {
  beforeEach(stubStorage);

  it('pickDialogueChoice appends Nair Saúde after either epilogue choice', () => {
    for (const flag of ['epi_feed', 'epi_rest'] as const) {
      const s = new GameSession(4);
      s.startNew();
      s.story.setFlag('casa_quebrada', true);
      s.player.setDistrict('morro-neon');
      expect(s.runStoryBeat('epilogue-laje')).toBe(true);
      const beat = getBeat('epilogue-laje')!;
      const choice = beat.dialogue
        .find((l) => l.choices)
        ?.choices?.find((c) => c.setsFlag === flag);
      expect(choice).toBeTruthy();
      s.pickDialogueChoice(choice!.setsFlag, choice!.reply);
      const texts = s.getDialogue().map((l) => l.text);
      expect(texts.some((t) => t.includes('Saúde'))).toBe(true);
      expect(texts.at(-1)).toMatch(/Saúde/);
    }
  });

  it('sequence maxMisses fails the encounter', () => {
    const def = skillForBet('antena-sinal', 'hack')!;
    expect(def.phases[0]!.maxMisses).toBe(2);
    let p = startSkill(def);
    p = attemptSkill(p, { phaseIndex: 0, value: 0 }); // wrong
    expect(p.done).toBe(false);
    p = attemptSkill(p, { phaseIndex: 0, value: 0 });
    expect(p.done).toBe(true);
    expect(p.won).toBe(false);
  });
});

describe('v1.17.0 elevator ride delay', () => {
  beforeEach(stubStorage);

  it('runElevatorRide stays in transition briefly before VIP floor', () => {
    vi.useFakeTimers();
    const s = new GameSession(5);
    s.startNew();
    for (const id of [
      'boteco-nair',
      'morro-antena',
      'luna-beco',
      'morro-fios',
      'seu-ze-banca',
      'feira-kiko',
      'feira-catador',
      'bia-set',
      'feira-dancer',
      'feira-forro',
      'feira-lockbox',
      'feira-radio',
      'feira-tipster',
      'feira-courier',
      'prova-luna',
      'avenida-twist',
      'avenida-checkpoint',
      'avenida-courier',
      'avenida-influencer',
      'avenida-drone',
      'avenida-radar',
      'avenida-server',
      'avenida-atm',
      'avenida-stealth',
      'avenida-betrayal',
      'lobby-margin',
      'morro-return-nair',
      'torre-foyer',
      'torre-pit',
    ]) {
      s.story.completeBeat(id);
    }
    for (const f of [
      'conheceu_rita',
      'falou_nair',
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
      'drone_ok',
      'stealth_ok',
      'lockbox_ok',
      'server_ok',
      'betrayal_ok',
    ]) {
      s.story.setFlag(f, true);
    }
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.world.unlock('torre-casa');
    s.player.setDistrict('torre-casa');
    s.player.addCredits(500);
    expect(s.runStoryBeat('torre-elevator')).toBe(true);
    expect(s.acceptStoryBet()).toBe(true);
    if (s.ui.is('skill')) s.completeSkillPerfect();
    expect(s.isVipFloor()).toBe(true);
    expect(s.ui.is('transition')).toBe(true);
    vi.advanceTimersByTime(1200);
    expect(s.ui.is('play')).toBe(true);
    vi.useRealTimers();
  });
});
