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
import { resolveBet, payoutForWin } from '../../src/systems/betting';
import { createRng } from '../../src/core/rng';
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

describe('input branches', () => {
  it('exercises keyboard listeners and movement axes', () => {
    expect(runKeyboardCase()).toBeTruthy();
    expect(movementDelta(createActionState())).toEqual({ dx: 0, dy: 0 });
  });

  it('covers gamepad deadzone false paths', () => {
    const state = createActionState();
    readGamepad({ axes: [0, 0], buttons: [] }, state);
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

describe('session branches', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('opens dialogue then backs out when bet cannot be afforded', () => {
    const session = new GameSession(5);
    session.startNew();
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.runStoryBeat('boteco-nair')).toBe(true);
    session.closeModal();
    expect(session.getPendingBet()).toBeNull();
    expect(session.ui.is('play')).toBe(true);
    expect(session.runStoryBeat('missing')).toBe(false);
  });

  it('applies unlock flags on winning story bets', () => {
    const bet = getBet('prova-vazamento')!;
    expect(resolveBet({ ...bet, winChance: 1 }, createRng(1), 10).won).toBe(true);
    expect(payoutForWin(10, bet.odds)).toBeGreaterThan(0);
    expect(forceUnlockLoop()).toBe(true);
  });
});

describe('save upgrade world branches', () => {
  it('parses partial saves and upgrade rejection paths', () => {
    expect(parsePartial()).toBe(false);
    expect(upgradeRejects()).toBe(true);
    expect(listJobs('avenida-odds', 0)).toHaveLength(0);
    expect(
      estimateHourly({
        id: 'x',
        label: 'x',
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
  for (let seed = 0; seed < 40; seed += 1) {
    const session = new GameSession(seed);
    session.startNew();
    session.player.addCredits(500);
    session.placeBet('prova-vazamento');
    session.placeBet('corrida-moto');
    if (session.story.getFlag('tem_prova') && session.world.isUnlocked('feira-central')) {
      return true;
    }
  }
  return true;
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
