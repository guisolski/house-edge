import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createActionState, movementDelta } from '../../src/input/actions';
import { bindKeyboard } from '../../src/input/keyboard';
import { readGamepad } from '../../src/input/gamepad';
import { GameSession } from '../../src/systems/session';
import { clearStorage, parseSave, createDefaultSave } from '../../src/systems/save';
import { UpgradeSystem } from '../../src/systems/upgrade';
import { estimateHourly, listJobs } from '../../src/systems/grind';
import { WorldSystem } from '../../src/systems/world';
import { EventBus } from '../../src/core/event-bus';
import { DISTRICTS } from '../../src/content/districts';
import { resolveBet, payoutForWin, clampStake } from '../../src/systems/betting';
import { createRng } from '../../src/core/rng';
import { getBet } from '../../src/content/bets';
import type { BetDefinition } from '../../src/core/types';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
import { districtExits, districtNpcs } from '../../src/systems/interaction';
import { InputModeTracker } from '../../src/systems/input-mode';
import { tileAt, buildDistrictMap } from '../../src/world/maps';

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

describe('input branches', () => {
  it('exercises keyboard listeners and movement axes', () => {
    expect(runKeyboardCase()).toBeTruthy();
    expect(movementDelta(createActionState())).toEqual({ dx: 0, dy: 0 });
  });

  it('covers gamepad deadzone false paths', () => {
    const state = createActionState();
    readGamepad({ axes: [0, 0], buttons: [] }, state);
    readGamepad({ axes: [], buttons: [] }, state);
    readGamepad(
      {
        axes: [-1, 1],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
      },
      state,
    );
    expect(state.left).toBe(true);
  });
});

describe('coverage edge branches', () => {
  it('hits clampStake defaults, unlock text, and sparse tiles', () => {
    const bare: BetDefinition = {
      id: 'bare',
      kind: 'job',
      title: 'Bare',
      description: 'x',
      stake: 20,
      odds: { numerator: 1, denominator: 1 },
      houseEdge: 0.1,
      reputationDeltaWin: 1,
      reputationDeltaLose: -1,
    };
    expect(clampStake(bare, 5, 100)).toBe(10);
    expect(clampStake(bare, 90, 100)).toBe(60);
    const agua = getBet('agua-gelada')!;
    const savedChance = agua.winChance;
    delete agua.winChance;
    expect(
      estimateHourly({
        id: 'bare-job',
        labelKey: 'ui.grind.agua',
        betId: 'agua-gelada',
        minReputation: 0,
        districtId: 'morro-neon',
      }),
    ).toBeGreaterThan(0);
    agua.winChance = savedChance;
    const unlockHint = currentObjective({
      beats: STORY_BEATS,
      completed: [
        'intro-laje',
        'boteco-nair',
        'side-morro-copper',
        'morro-antena',
        'luna-beco',
        'morro-fios',
        'seu-ze-banca',
      ],
      flags: (f) =>
        !['casa_quebrada', 'free_roam', 'epilogue_done', 'unlocked_feira'].includes(f),
      districtId: 'morro-neon',
      npcs: districtNpcs(),
      exits: districtExits(),
      unlocked: () => false,
    });
    expect(unlockHint.text).toMatch(/Unlock path/);
    const orphan = currentObjective({
      beats: STORY_BEATS,
      completed: ['intro-laje'],
      flags: (f) => f === 'conheceu_rita',
      districtId: 'morro-neon',
      npcs: [],
      exits: districtExits(),
      unlocked: () => true,
    });
    expect(orphan.text.length).toBeGreaterThan(0);
    expect(parseSave(JSON.stringify({ version: 1 }))).toBeNull();
    const map = buildDistrictMap('morro-neon');
    const hole = { ...map, tiles: [...map.tiles] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (hole.tiles as any)[5] = undefined;
    expect(tileAt(hole, 5 % map.width, Math.floor(5 / map.width))).toBe('blocked');
    vi.useFakeTimers();
    const tracker = new InputModeTracker(40, 'keyboard');
    tracker.note('keyboard');
    tracker.note('touch');
    tracker.note('touch');
    vi.advanceTimersByTime(40);
    expect(tracker.get()).toBe('touch');
    vi.useRealTimers();
  });
});

describe('session branches', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('tops up story skill stakes when broke so the beat stays reachable', () => {
    const session = new GameSession(5);
    session.startNew();
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.runStoryBeat('boteco-nair')).toBe(true);
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.ui.is('skill')).toBe(true);
    expect(session.player.getStats().credits).toBeGreaterThan(0);
    expect(session.runStoryBeat('missing')).toBe(false);
  });

  it('applies unlock flags on winning story bets', () => {
    const bet = getBet('prova-vazamento')!;
    // Force near-certain win via tiny house edge and skewed odds.
    const forced = resolveBet(
      { ...bet, odds: { numerator: 1, denominator: 99 }, houseEdge: 0 },
      createRng(42),
      { stake: 10 },
    );
    expect(forced.won || forced.roll < 0.99).toBe(true);
    expect(payoutForWin(10, bet.odds)).toBeGreaterThan(0);
    expect(forceUnlockLoop()).toBe(true);
  });
});

describe('save upgrade world branches', () => {
  it('parses partial saves and upgrade rejection paths', () => {
    expect(parsePartial()).toBe(false);
    expect(upgradeRejects()).toBe(true);
    expect(listJobs('avenida-odds', 0).length).toBeGreaterThan(0);
    expect(
      estimateHourly({
        id: 'x',
        labelKey: 'ui.grind.safe',
        betId: 'missing',
        minReputation: 0,
        districtId: 'x',
      }),
    ).toBe(0);
  });

  it('world rejects unknown unlocks and clamp without district', () => {
    const world = new WorldSystem(new EventBus(), DISTRICTS);
    expect(world.unlock('nope' as never)).toBe(false);
    expect(world.clampPosition('nope' as never, 9, 9)).toEqual({ x: 9, y: 9 });
  });
});

function runKeyboardCase(): boolean {
  const state = createActionState();
  const onAction = vi.fn();
  const handlers: Record<string, EventListener> = {};
  const target = {
    addEventListener: (type: string, fn: EventListener) => {
      handlers[type] = fn;
    },
    removeEventListener: vi.fn(),
  };
  const unbind = bindKeyboard(target as unknown as Window, state, onAction);
  const down = handlers.keydown as (e: KeyboardEvent) => void;
  const up = handlers.keyup as (e: KeyboardEvent) => void;
  down({ code: 'KeyW', preventDefault: vi.fn() } as unknown as KeyboardEvent);
  down({ code: 'KeyZ', preventDefault: vi.fn() } as unknown as KeyboardEvent);
  up({ code: 'KeyW' } as KeyboardEvent);
  up({ code: 'KeyZ' } as KeyboardEvent);
  unbind();
  return onAction.mock.calls.length > 0;
}

function forceUnlockLoop(): boolean {
  let sawFlag = false;
  let sawDistrict = false;
  for (let seed = 0; seed < 200; seed += 1) {
    const session = new GameSession(seed);
    session.startNew();
    session.player.addCredits(500);
    session.placeBet('prova-vazamento');
    session.placeBet('corrida-moto');
    if (session.story.getFlag('tem_prova')) sawFlag = true;
    if (session.world.isUnlocked('feira-central')) sawDistrict = true;
    if (sawFlag && sawDistrict) return true;
  }
  return sawFlag && sawDistrict;
}

function parsePartial(): boolean | undefined {
  const partial = JSON.stringify({
    version: 1,
    player: createDefaultSave().player,
    unlockedDistricts: ['morro-neon'],
  });
  return parseSave(partial)?.muted;
}

function upgradeRejects(): boolean {
  const upgrades = new UpgradeSystem();
  return (
    upgrades.buy('sorte', 1) === null &&
    upgrades.nextCost('nope' as never) === Infinity &&
    upgrades.canBuy('nope' as never, 999) === false
  );
}
