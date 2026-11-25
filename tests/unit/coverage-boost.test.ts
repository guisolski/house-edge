import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import {
  buildDistrictMap,
  tileAt,
  isWalkable,
  probeMapBounds,
} from '../../src/world/maps';
import {
  currentObjective,
  firstHopExit,
  sideQuestMarkers,
} from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
import { districtExits, districtNpcs } from '../../src/systems/interaction';
import { UiStateMachine } from '../../src/systems/ui-state';
import {
  followPlayer,
  createCamera,
  viewportPadding,
  HUD_TOP_INSET_PX,
} from '../../src/world/camera';

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

describe('coverage boost v1.13', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('maps paint all districts and walkability edges', () => {
    probeMapBounds();
    for (const id of [
      'morro-neon',
      'feira-central',
      'avenida-odds',
      'torre-casa',
    ] as const) {
      const map = buildDistrictMap(id);
      expect(map.width).toBeGreaterThan(10);
      expect(isWalkable(map, Math.floor(map.width / 2), Math.floor(map.height / 2))).toBe(
        true,
      );
      expect(tileAt(map, -1, 0)).toBe('blocked');
      expect(tileAt(map, 0, -1)).toBe('blocked');
      expect(tileAt(map, map.width + 1, 0)).toBe('blocked');
    }
  });

  it('ui allows skill and transition edges', () => {
    const ui = new UiStateMachine();
    expect(ui.go('play')).toBe(true);
    expect(ui.go('dialogue')).toBe(true);
    expect(ui.go('skill')).toBe(true);
    expect(ui.go('transition')).toBe(true);
    expect(ui.go('play')).toBe(true);
    expect(ui.go('bet')).toBe(true);
    expect(ui.go('skill')).toBe(true);
  });

  it('session stake adjust, placeBet grind, choice no-ops', () => {
    const session = new GameSession(44);
    session.startNew();
    session.pickDialogueChoice();
    expect(session.adjustStake(5)).toBe(0);
    expect(session.offerBet('laje-lottery')).toBe(true);
    expect(session.ui.is('bet')).toBe(true);
    expect(session.adjustStake(5)).toBeGreaterThan(0);
    expect(session.placeBet('samba-odds', 10)).toBe(true);
    expect(session.returnToMenu()).toBe(false);
    session.closeModal();
  });

  it('camera padding and insets', () => {
    expect(HUD_TOP_INSET_PX).toBeGreaterThanOrEqual(140);
    const pad = viewportPadding({
      mapW: 10,
      mapH: 8,
      viewW: 960,
      viewH: 540,
      tilePx: 48,
    });
    expect(pad.padX).toBeGreaterThan(0);
    const cam = followPlayer({
      cam: createCamera(),
      playerX: 5,
      playerY: 20,
      mapW: 42,
      mapH: 30,
      viewW: 960,
      viewH: 540,
      tilePx: 48,
    });
    expect(cam.x).toBeGreaterThanOrEqual(0);
  });

  it('broke hints + locked exit toast + dialogue-only beat', () => {
    const session = new GameSession(99);
    session.startNew();
    session.player.addCredits(-session.player.getStats().credits);
    expect(session.isBroke()).toBe(true);
    expect(session.brokeHintText()).toMatch(/Broke/);
    expect(session.offerBet('agua-gelada')).toBe(false);
    // Locked exit near Fair while locked.
    session.player.setPosition(36, 16);
    expect(session.nearbyLockedExit()?.toDistrict).toBe('feira-central');
    expect(session.interact()).toBe(false);
    // Dialogue close declines pending story bet.
    session.player.addCredits(40);
    session.runStoryBeat('boteco-nair');
    expect(session.hasPendingStoryBet()).toBe(true);
    session.closeModal();
    expect(session.ui.is('play')).toBe(true);
    expect(session.openTravel()).toBe(true);
    expect(session.returnToMenu()).toBe(true);
    expect(session.openJobs()).toBe(true);
    expect(session.returnToMenu()).toBe(true);
    // Dialogue-only beat finish via accept without bet.
    session.player.addCredits(50);
    session.story.setFlag('tipster_ok', true);
    session.world.unlock('feira-central');
    session.travelTo('feira-central');
    // Complete priors so courier dialogue-only is available.
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
      'feira-lockbox',
      'feira-radio',
      'feira-tipster',
    ]) {
      session.story.completeBeat(id);
    }
    expect(session.runStoryBeat('feira-courier')).toBe(true);
    expect(session.acceptStoryBet()).toBe(false); // no bet — finishes dialogue beat
    expect(session.story.getCompleted()).toContain('feira-courier');
  });

  it('objective hop + free roam + side markers across districts', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const missing = currentObjective({
      beats: STORY_BEATS,
      completed: ['intro-laje'],
      flags: (f) => f === 'conheceu_rita',
      districtId: 'morro-neon',
      npcs: [],
      exits,
      unlocked: () => true,
    });
    // Empty floor roster must never show a player-facing "missing target" bug string.
    expect(missing.text).not.toMatch(/missing target/i);
    expect(missing.text).toMatch(/Find the next lead|Dona Nair/);
    const elev = currentObjective({
      beats: STORY_BEATS,
      completed: [
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
      ],
      flags: (f) =>
        ![
          'elevator_ok',
          'vip_ok',
          'negotiate_ok',
          'casa_quebrada',
          'free_roam',
          'epilogue_done',
        ].includes(f),
      districtId: 'torre-casa',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(elev.text).toMatch(/Elevator|Use/);
    const hop = firstHopExit(
      {
        beats: STORY_BEATS,
        completed: [],
        flags: () => false,
        districtId: 'morro-neon',
        npcs,
        exits,
        unlocked: (id) => id === 'feira-central' || id === 'avenida-odds',
      },
      'avenida-odds',
    );
    expect(hop?.toDistrict).toBe('feira-central');
    const free = currentObjective({
      beats: STORY_BEATS,
      completed: ['torre-final', 'epilogue-laje'],
      flags: (f) => f === 'casa_quebrada' || f === 'free_roam' || f === 'epilogue_done',
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(free.text).toMatch(/complete|Free roam|grind/i);
    const sides = sideQuestMarkers({
      beats: STORY_BEATS,
      completed: [],
      flags: (f) => f === 'passou_checkpoint',
      districtId: 'avenida-odds',
      npcs,
      exits,
      unlocked: () => true,
    });
    expect(Array.isArray(sides)).toBe(true);
  });
});
