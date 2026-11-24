import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InputModeTracker } from '../../src/systems/input-mode';
import { UiStateMachine } from '../../src/systems/ui-state';
import {
  districtExits,
  districtNpcs,
  inRange,
  nearestExit,
  nearestNpc,
} from '../../src/systems/interaction';
import { buildDistrictMap, isWalkable, tileAt } from '../../src/world/maps';
import { createCamera, followPlayer } from '../../src/world/camera';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import { createActionState, movementDelta } from '../../src/input/actions';
import { readGamepad } from '../../src/input/gamepad';

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

describe('input mode tracker', () => {
  it('debounces and forces mode switches', () => {
    vi.useFakeTimers();
    const tracker = new InputModeTracker(100, 'keyboard');
    const seen: string[] = [];
    tracker.onChange((m) => seen.push(m));
    tracker.note('touch');
    expect(tracker.get()).toBe('keyboard');
    vi.advanceTimersByTime(100);
    expect(tracker.get()).toBe('touch');
    tracker.force('gamepad');
    expect(tracker.get()).toBe('gamepad');
    tracker.force('gamepad');
    expect(seen.filter((m) => m === 'gamepad').length).toBeGreaterThan(0);
    const off = tracker.onChange(() => undefined);
    off();
    vi.useRealTimers();
  });
});

describe('ui state machine', () => {
  it('allows play modals and dialogue-to-bet', () => {
    const ui = new UiStateMachine();
    expect(ui.get()).toBe('title');
    expect(ui.go('play')).toBe(true);
    expect(ui.canOpenModal()).toBe(true);
    expect(ui.go('dialogue')).toBe(true);
    expect(ui.go('bet')).toBe(true);
    expect(ui.go('menu')).toBe(false);
    ui.backToPlay();
    expect(ui.is('play')).toBe(true);
    expect(ui.go('ending')).toBe(true);
    ui.backToPlay();
    expect(ui.is('ending')).toBe(true);
  });
});

describe('maps and interaction', () => {
  it('builds walkable city maps with exits and npcs', () => {
    const map = buildDistrictMap('morro-neon');
    expect(map.width).toBeGreaterThan(20);
    expect(isWalkable(map, 8, 15)).toBe(true);
    expect(tileAt(map, -1, 0)).toBe('blocked');
    expect(tileAt(map, 0, 0)).toBe('grass');
    const npcs = districtNpcs();
    const exits = districtExits();
    expect(nearestNpc(npcs, 'morro-neon', 14, 15)?.id).toBe('dona-nair');
    expect(nearestNpc(npcs, 'morro-neon', 0, 0)).toBeNull();
    expect(nearestExit(exits, 'morro-neon', 40, 15)?.toDistrict).toBe('feira-central');
    expect(nearestExit(exits, 'morro-neon', 0, 0)).toBeNull();
    expect(inRange({ x: 0, y: 0, tx: 1, ty: 0 })).toBe(true);
  });

  it('camera follows player within map bounds', () => {
    const cam = followPlayer({
      cam: createCamera(),
      playerX: 20,
      playerY: 15,
      mapW: 42,
      mapH: 30,
      viewW: 960,
      viewH: 540,
      tilePx: 48,
    });
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(cam.y).toBeGreaterThanOrEqual(0);
  });
});

describe('objectives', () => {
  it('points at next story npc or exit', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const obj = currentObjective({
      beats: STORY_BEATS,
      completed: ['intro-laje'],
      flags: (f) => f === 'conheceu_rita',
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => false,
    });
    expect(obj.text).toContain('Dona Nair');
    expect(obj.targetX).toBe(14);
    const travel = currentObjective({
      beats: STORY_BEATS,
      completed: ['intro-laje', 'boteco-nair', 'luna-beco', 'seu-ze-banca'],
      flags: () => true,
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: (id) => id === 'feira-central',
    });
    expect(travel.text).toContain('Travel');
    const done = currentObjective({
      beats: STORY_BEATS,
      completed: STORY_BEATS.map((b) => b.id),
      flags: () => true,
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(done.text).toContain('complete');
  });
});

describe('session deep paths', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('completes dialogue into bet and confirms', () => {
    const session = new GameSession(9);
    session.startNew();
    session.player.setPosition(14, 15);
    expect(session.interact()).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
    session.closeModal();
    expect(session.ui.is('bet')).toBe(true);
    expect(session.confirmBet()).toBe(true);
    expect(session.objective().text.length).toBeGreaterThan(0);
  });

  it('travels via exit when unlocked and nearby', () => {
    const session = new GameSession(10);
    session.startNew();
    session.world.unlock('feira-central');
    session.player.setPosition(40, 15);
    expect(session.nearbyExit()?.toDistrict).toBe('feira-central');
    expect(session.interact()).toBe(true);
    expect(session.player.getStats().districtId).toBe('feira-central');
  });

  it('cancels bet and offers job from npc without beat', () => {
    const session = new GameSession(11);
    session.startNew();
    session.offerBet('agua-gelada');
    session.cancelBet();
    expect(session.ui.is('play')).toBe(true);
    session.story.completeBeat('boteco-nair');
    session.player.setPosition(14, 15);
    expect(session.interact()).toBe(true);
  });

  it('blocks move into walls and mute volume', () => {
    const session = new GameSession(12);
    session.startNew();
    expect(session.move(0, -20)).toBe(false);
    session.setMasterVolume(2);
    expect(session.getAudio().masterVolume).toBe(1);
    session.setMasterVolume(-1);
    expect(session.getAudio().masterVolume).toBe(0);
  });

  it('toasts come-back-later when npc beat is done and no job', () => {
    const session = new GameSession(13);
    session.startNew();
    for (const id of ['boteco-nair', 'luna-beco']) {
      session.story.completeBeat(id);
    }
    session.story.setFlag('falou_nair', true);
    session.story.setFlag('conheceu_luna', true);
    session.player.setPosition(26, 14);
    expect(session.nearbyNpc()?.id).toBe('luna');
    expect(session.interact()).toBe(false);
  });

  it('finishes dialogue-only path and locked exit nearby', () => {
    const session = new GameSession(14);
    session.startNew();
    // Force a no-bet dialogue finish via pending story without bet id
    session.runStoryBeat('boteco-nair');
    session.cancelBet();
    // locked exit: feira locked
    session.player.setPosition(40, 15);
    expect(session.nearbyExit()).toBeNull();
    expect(session.openTravel()).toBe(true);
  });

  it('covers input-mode cancel pending and movement both axes', () => {
    vi.useFakeTimers();
    const tracker = new InputModeTracker(50, 'keyboard');
    tracker.note('touch');
    tracker.note('keyboard');
    vi.advanceTimersByTime(50);
    expect(tracker.get()).toBe('keyboard');
    vi.useRealTimers();
    const state = createActionState();
    state.left = true;
    state.right = true;
    state.up = true;
    state.down = true;
    expect(movementDelta(state)).toEqual({ dx: 0, dy: 0 });
    readGamepad(
      {
        axes: [0.1, -0.1],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
      },
      state,
    );
  });
});
