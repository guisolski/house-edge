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
import {
  createCamera,
  followPlayer,
  minPlayerTileY,
  viewportPadding,
} from '../../src/world/camera';
import {
  currentObjective,
  firstHopExit,
  sideQuestMarkers,
} from '../../src/systems/objectives';
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

  it('returns Side Jobs Close to the main menu', () => {
    const ui = new UiStateMachine();
    expect(ui.go('play')).toBe(true);
    expect(ui.go('menu')).toBe(true);
    expect(ui.canOpenModal()).toBe(true);
    expect(ui.go('jobs')).toBe(true);
    expect(ui.go('menu')).toBe(true);
    expect(ui.is('menu')).toBe(true);
    expect(ui.go('travel')).toBe(true);
    expect(ui.go('menu')).toBe(true);
  });
});

function countExitPadsNear(
  map: ReturnType<typeof buildDistrictMap>,
  x: number,
  y: number,
): number {
  let n = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (tileAt(map, x + dx, y + dy) === 'exit') n += 1;
    }
  }
  return n;
}

describe('city maps', () => {
  it('builds walkable city maps with exits and npcs', () => {
    const map = buildDistrictMap('morro-neon');
    expect(buildDistrictMap('feira-central').props.length).toBeGreaterThan(0);
    expect(buildDistrictMap('avenida-odds').buildings[0]?.kind).toBe('avenida');
    expect(buildDistrictMap('torre-casa').landmark.kind).toBe('casa-tower');
    expect(map.width).toBeGreaterThanOrEqual(40);
    expect(['asphalt', 'plaza']).toContain(tileAt(map, 8, 15));
    expect(isWalkable(map, 8, 15)).toBe(true);
    expect(isWalkable(map, 13, 14)).toBe(true);
    expect(tileAt(map, -1, 0)).toBe('blocked');
    expect(tileAt(map, 0, 0)).toBe('blocked');
    expect(tileAt(map, 8, 14)).not.toBe('blocked');
    const torre = buildDistrictMap('torre-casa');
    expect(torre.width).toBeGreaterThanOrEqual(36);
    expect(tileAt(torre, 0, 0)).toBe('blocked');
    expect(tileAt(torre, 0, 13)).toBe('blocked');
    expect(tileAt(torre, 8, 13)).not.toBe('blocked');
    expect(tileAt(map, 36, 16)).toBe('exit');
    expect(map.buildings.length).toBeGreaterThan(8);
    expect(map.props.length).toBeGreaterThan(5);
    expect(map.signs.every((s) => s.label.length > 2)).toBe(true);
    expect(map.terraceEdges?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('map queries', () => {
  it('keeps Morro stairs walkable and NPC/exit queries tight', () => {
    const map = buildDistrictMap('morro-neon');
    for (let x = 18; x <= 23; x += 1) {
      expect(tileAt(map, x, 5)).toBe('stairs');
      expect(isWalkable(map, x, 5)).toBe(true);
    }
    expect(isWalkable(map, 17, 5)).toBe(false);
    expect(isWalkable(map, 24, 5)).toBe(false);
    const npcs = districtNpcs();
    const exits = districtExits();
    expect(nearestNpc({ npcs, districtId: 'morro-neon', x: 13, y: 14 })?.id).toBe(
      'dona-nair',
    );
    expect(nearestNpc({ npcs, districtId: 'morro-neon', x: 0, y: 0 })).toBeNull();
    expect(
      nearestNpc({
        npcs,
        districtId: 'morro-neon',
        x: 13,
        y: 14,
        prefer: (n) => n.id === 'catador-morro',
      })?.id,
    ).toBe('dona-nair');
    expect(
      nearestNpc({
        npcs,
        districtId: 'morro-neon',
        x: 4,
        y: 16,
        prefer: (n) => n.id === 'catador-morro',
      })?.id,
    ).toBe('catador-morro');
    expect(
      nearestExit({ exits, districtId: 'morro-neon', x: 36, y: 16 })?.toDistrict,
    ).toBe('feira-central');
    expect(nearestExit({ exits, districtId: 'morro-neon', x: 0, y: 0 })).toBeNull();
    expect(inRange({ x: 0, y: 0, tx: 1, ty: 0 })).toBe(true);
  });
});

describe('exit pads', () => {
  it('every exit doorway cluster overlaps a full-name destination sign', () => {
    const exits = districtExits();
    expect(exits.length).toBeGreaterThanOrEqual(6);
    for (const exit of exits) {
      const map = buildDistrictMap(exit.districtId);
      expect(tileAt(map, exit.x, exit.y)).toBe('exit');
      const pads = countExitPadsNear(map, exit.x, exit.y);
      expect(pads, `${exit.id} doorway`).toBeGreaterThanOrEqual(3);
      expect(pads).toBeLessThanOrEqual(9);
      const sign = map.signs.find(
        (s) =>
          (s.label.startsWith('>') || s.label.startsWith('EXIT')) &&
          Math.hypot(s.x - exit.x, s.y - exit.y) <= 3.5,
      );
      expect(sign, `${exit.id} needs destination sign`).toBeTruthy();
      expect(sign!.label).toMatch(/Central Fair|Morro Neon|Odds Avenue|Casa Tower/);
    }
    const torre = buildDistrictMap('torre-casa');
    for (let x = 8; x <= 20; x += 1) {
      expect(tileAt(torre, x, 12)).not.toBe('exit');
    }
    expect(tileAt(torre, 5, 12)).toBe('exit');
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
    const north = followPlayer({
      cam: createCamera(),
      playerX: 10,
      playerY: 1,
      mapW: 42,
      mapH: 30,
      viewW: 960,
      viewH: 540,
      tilePx: 48,
    });
    // North edge: camera stays within map — no off-world void strip.
    expect(north.y).toBe(0);
    const pad = viewportPadding({
      mapW: 20,
      mapH: 26,
      viewW: 1280,
      viewH: 540,
      tilePx: 48,
    });
    expect(pad.padX).toBeGreaterThan(0);
    expect(
      viewportPadding({ mapW: 40, mapH: 30, viewW: 640, viewH: 360, tilePx: 48 }).padY,
    ).toBe(0);
  });
});

describe('story beat targets', () => {
  it('tags every non-intro beat with a reachable NPC/object', () => {
    const npcs = districtNpcs();
    const untagged: string[] = [];
    for (const beat of STORY_BEATS) {
      if (beat.id === 'intro-laje') continue;
      const hit = npcs.find(
        (n) => n.beatId === beat.id || n.extraBeatIds?.includes(beat.id),
      );
      if (!hit) untagged.push(beat.id);
    }
    expect(untagged, `beats missing NPC/object tag: ${untagged.join(', ')}`).toEqual([]);
  });

  it('elevator beat names Elevator with a marker after pit', () => {
    const npcs = districtNpcs();
    const elev = npcs.find((n) => n.id === 'elevator');
    expect(elev?.beatId).toBe('torre-elevator');
    const done = new Set([
      'intro-laje',
      'boteco-nair',
      'side-morro-copper',
      'morro-antena',
      'luna-beco',
      'morro-fios',
      'seu-ze-banca',
      'feira-kiko',
      'feira-catador',
      'bia-set',
      'feira-forro',
      'feira-radio',
      'feira-tipster',
      'feira-courier',
      'prova-luna',
      'avenida-twist',
      'avenida-checkpoint',
      'avenida-influencer',
      'avenida-radar',
      'avenida-atm',
      'lobby-margin',
      'morro-return-nair',
      'torre-foyer',
      'torre-pit',
    ]);
    const on = new Set([
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
    ]);
    const obj = currentObjective({
      beats: STORY_BEATS,
      completed: [...done],
      flags: (f) => on.has(f),
      districtId: 'torre-casa',
      npcs,
      exits: districtExits(),
      unlocked: () => true,
    });
    expect(obj.text).toMatch(/Elevator/);
    expect(obj.text).not.toMatch(/look around|missing target/i);
    expect(obj.targetX).toBe(elev!.x);
    expect(obj.targetY).toBe(elev!.y);
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
    expect(obj.targetX).toBe(13);
    const travel = currentObjective({
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
        [
          'conheceu_rita',
          'falou_nair',
          'copper_weighed',
          'antena_ok',
          'conheceu_luna',
          'fios_ok',
          'unlocked_feira',
        ].includes(f),
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: (id) => id === 'feira-central',
    });
    expect(travel.text).toMatch(/Central Fair|Go to|Walk to/);
    const done = currentObjective({
      beats: STORY_BEATS,
      completed: STORY_BEATS.map((b) => b.id),
      flags: (f) => f === 'casa_quebrada' || f === 'epilogue_done' || f === 'free_roam',
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(done.text).toMatch(/complete|Free roam/);
  });
});

describe('objective routing', () => {
  it('routes multi-hop walks and surfaces free-roam + side markers', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const hop = firstHopExit(
      {
        beats: STORY_BEATS,
        completed: [],
        flags: () => false,
        districtId: 'torre-casa',
        npcs,
        exits,
        unlocked: (id) =>
          id === 'avenida-odds' || id === 'feira-central' || id === 'morro-neon',
      },
      'morro-neon',
    );
    expect(hop?.toDistrict).toBe('avenida-odds');
    const free = currentObjective({
      beats: STORY_BEATS,
      completed: ['torre-final'],
      flags: (f) => f === 'casa_quebrada' || f === 'free_roam',
      districtId: 'torre-casa',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(free.text).toMatch(/Free roam/);
    const onHill = currentObjective({
      beats: STORY_BEATS,
      completed: ['torre-final'],
      flags: (f) => f === 'casa_quebrada',
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(onHill.text).toMatch(/epilogue|Dona Nair/);
    const sides = sideQuestMarkers({
      beats: STORY_BEATS,
      completed: [],
      flags: (f) => f === 'falou_nair' || f === 'antena_ok',
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(sides.some((s) => /tank|Water/i.test(s.label))).toBe(true);
  });

  it('falls back to Travel menu and story-complete free roam', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const menu = currentObjective({
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
        [
          'conheceu_rita',
          'falou_nair',
          'copper_weighed',
          'antena_ok',
          'conheceu_luna',
          'fios_ok',
          'unlocked_feira',
        ].includes(f),
      districtId: 'morro-neon',
      npcs,
      exits: [],
      unlocked: (id) => id === 'feira-central',
    });
    expect(menu.text).toMatch(/Travel menu/);
    const doneFree = currentObjective({
      beats: STORY_BEATS,
      completed: STORY_BEATS.map((b) => b.id),
      flags: (f) => f === 'casa_quebrada' || f === 'epilogue_done',
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(doneFree.text).toContain('complete');
  });
});

describe('session story bet choice', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('completes dialogue into bet and confirms', () => {
    const session = new GameSession(9);
    session.startNew();
    session.player.setPosition(13, 14);
    expect(session.interact()).toBe(true);
    expect(session.ui.is('dialogue')).toBe(true);
    expect(session.hasPendingStoryBet()).toBe(true);
    expect(session.acceptStoryBet()).toBe(true);
    expect(session.ui.is('skill') || session.ui.is('bet')).toBe(true);
    if (session.ui.is('skill')) {
      expect(session.completeSkillPerfect()).toBe(true);
      return;
    }
    expect(session.getPendingStake()).toBeGreaterThan(0);
    session.adjustStake(5);
    expect(session.confirmBet()).toBe(true);
    expect(session.objective().text.length).toBeGreaterThan(0);
  });

  it('declining story bet leaves the beat retryable', () => {
    const session = new GameSession(19);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    session.declineStoryBet();
    expect(session.ui.is('play')).toBe(true);
    expect(session.story.getCompleted().includes('boteco-nair')).toBe(false);
    expect(session.runStoryBeat('boteco-nair')).toBe(true);
  });
});

describe('session deep paths', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('travels via exit when unlocked and nearby', () => {
    const session = new GameSession(10);
    session.startNew();
    session.world.unlock('feira-central');
    session.player.setPosition(36, 16);
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
    session.player.setPosition(13, 14);
    expect(session.interact()).toBe(true);
  });

  it('blocks move into walls and mute volume', () => {
    const session = new GameSession(12);
    session.startNew();
    // HUD north clamp — cannot walk into the top inset / sealed row.
    const minY = minPlayerTileY(48);
    session.player.setPosition(8, minY);
    expect(session.move(0, -1)).toBe(false);
    session.setMasterVolume(2);
    expect(session.getAudio().masterVolume).toBe(1);
    session.setMasterVolume(-1);
    expect(session.getAudio().masterVolume).toBe(0);
  });

  it('toasts come-back-later when npc beat is done and no job', () => {
    const session = new GameSession(13);
    session.startNew();
    for (const id of ['boteco-nair', 'morro-antena', 'luna-beco']) {
      session.story.completeBeat(id);
    }
    session.story.setFlag('falou_nair', true);
    session.story.setFlag('antena_ok', true);
    session.story.setFlag('conheceu_luna', true);
    session.player.setPosition(26, 16);
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
    session.player.setPosition(38, 14);
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
