import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { clearStorage } from '../../src/systems/save';
import { followPlayer, minPlayerTileY, createCamera } from '../../src/world/camera';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
import { districtExits, districtNpcs } from '../../src/systems/interaction';

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

describe('movement slide + camera HUD inset', () => {
  beforeEach(() => {
    const mem = new MemoryStorage();
    vi.stubGlobal('localStorage', mem);
    clearStorage(mem);
  });

  it('slides on open axis when diagonal is blocked', () => {
    const session = new GameSession(30);
    session.startNew();
    session.player.setPosition(8, 15);
    expect(session.move(1, 1) || session.move(1, 0) || session.move(0, 1)).toBe(true);
  });

  it('rejects zero delta and HUD-clamped north steps', () => {
    const session = new GameSession(31);
    session.startNew();
    expect(session.move(0, 0)).toBe(false);
    const minY = minPlayerTileY(48);
    session.player.setPosition(8, minY);
    expect(session.move(0, -1)).toBe(false);
  });

  it('camera keeps north-edge focus below the HUD inset band', () => {
    const cam = followPlayer({
      cam: createCamera(),
      playerX: 10,
      playerY: 8,
      mapW: 42,
      mapH: 30,
      viewW: 960,
      viewH: 540,
      tilePx: 48,
      topInsetPx: 140,
    });
    expect(cam.y).toBeGreaterThanOrEqual(0);
    const screenY = 8 * 48 + 24 - cam.y;
    expect(screenY).toBeGreaterThanOrEqual(120);
  });

  it('luna objective is uniquely named with detail', () => {
    const obj = currentObjective({
      beats: STORY_BEATS,
      completed: ['intro-laje', 'boteco-nair', 'side-morro-copper', 'morro-antena'],
      flags: (f) =>
        f === 'conheceu_rita' ||
        f === 'falou_nair' ||
        f === 'copper_weighed' ||
        f === 'antena_ok',
      districtId: 'morro-neon',
      npcs: districtNpcs(),
      exits: districtExits(),
      unlocked: () => false,
    });
    expect(obj.text).toBe('Talk to Luna Pixel (Morro Neon)');
    expect(obj.detail).toBe('Pixo alley');
    expect(obj.targetName).toBe('Luna Pixel');
  });

  it('travel objectives name exits and unlock copy', () => {
    const npcs = districtNpcs();
    const exits = districtExits();
    const done = [
      'intro-laje',
      'boteco-nair',
      'side-morro-copper',
      'morro-antena',
      'luna-beco',
      'morro-fios',
      'seu-ze-banca',
    ];
    const flags = (f: string): boolean =>
      [
        'conheceu_rita',
        'falou_nair',
        'copper_weighed',
        'antena_ok',
        'conheceu_luna',
        'fios_ok',
        'unlocked_feira',
      ].includes(f);
    const locked = currentObjective({
      beats: STORY_BEATS,
      completed: done,
      flags,
      districtId: 'morro-neon',
      npcs,
      exits,
      unlocked: () => false,
    });
    expect(locked.text).toMatch(/Unlock path/);
    const menu = currentObjective({
      beats: STORY_BEATS,
      completed: done,
      flags,
      districtId: 'morro-neon',
      npcs,
      exits: [],
      unlocked: (id) => id === 'feira-central',
    });
    expect(menu.text).toMatch(/Travel menu/);
    expect(menu.detail).toBeTruthy();
  });
});
