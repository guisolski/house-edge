import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { slideStep } from '../../src/world/slide';
import { setLocale, t } from '../../src/i18n';
import { AVENIDA_DRONE_STEALTH, droneFreePathExists } from '../../src/systems/stealth';

function stubStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

describe('v1.22.13 Avenida clear east lane', () => {
  beforeEach(stubStorage);

  it('hold-east from west plaza on y10–13 clears past world x=750', () => {
    const map = buildDistrictMap('avenida-odds');
    for (const y of [10, 11, 12, 13]) {
      let x = 3;
      let cy = y;
      for (let i = 0; i < 40; i += 1) {
        const next = slideStep(map, x, cy, 1, 0);
        expect(next, `blocked at ${x},${cy} (start y=${y})`).not.toBeNull();
        x = next!.x;
        cy = next!.y;
        if (x * 48 > 750) break;
      }
      expect(x * 48, `y=${y}`).toBeGreaterThan(750);
      expect(isWalkable(map, x, cy)).toBe(true);
    }
  });

  it('Neon Snap still has no drone-free bypass', () => {
    const map = buildDistrictMap('avenida-odds');
    expect(
      droneFreePathExists(AVENIDA_DRONE_STEALTH, (x, y) => isWalkable(map, x, y)),
    ).toBe(false);
  });

  it('zero-displacement wall-push fires after 1s against a continuous wall', () => {
    const session = new GameSession();
    session.startNew();
    session.world.unlock('avenida-odds');
    session.travelTo('avenida-odds');
    session.player.setPosition(16, 10);
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    const before = session.player.getStats();
    expect(session.move(0, -1)).toBe(false);
    expect(session.player.getStats()).toMatchObject({ x: before.x, y: before.y });
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 999);
    expect(session.move(0, -1)).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 1001);
    expect(session.move(0, -1)).toBe(true);
  });
});

describe('v1.22.13 plain dialogue + Torre unlock copy', () => {
  beforeEach(() => {
    stubStorage();
    setLocale('en');
  });

  it('plain dialogue arm needs key-up only (no 400ms mash quiet)', () => {
    const session = new GameSession();
    session.startNew();
    session.noteInteractPressed('KeyE');
    session.armPlainDialogueAdvance(true);
    expect(session.allowModalConfirm('KeyE')).toBe(false);
    expect(session.allowModalConfirm('Enter')).toBe(true);
    session.noteInteractRelease('KeyE');
    expect(session.allowModalConfirm('KeyE')).toBe(true);
  });

  it('Torre unlock detail names Margin, not a vague current bet', () => {
    expect(t('ui.obj.unlockTorreDetail')).toMatch(/Margin/i);
    expect(t('ui.obj.unlockTorreDetail')).not.toMatch(/current bet/i);
    expect(t('ui.toast.pathLockedTorre')).toMatch(/Margin/i);
  });

  it('dialogueHasChoices reflects lastDialogue; locked Torre toast fires', () => {
    const session = new GameSession();
    session.startNew();
    expect(session.dialogueHasChoices()).toBe(false);
    session.world.unlock('avenida-odds');
    session.travelTo('avenida-odds');
    // East Torre pad while still locked.
    session.player.setPosition(43, 12);
    const locked = session.nearbyLockedExit();
    expect(locked?.toDistrict).toBe('torre-casa');
    expect(session.interact(false)).toBe(false);
  });

  it('corner-slip works on vertical protrusions too', () => {
    const map = buildDistrictMap('avenida-odds');
    // Continuous sealed strip — both forward-diagonals blocked → stop.
    expect(slideStep(map, 20, 10, 0, -1)).toBeNull();
    expect(isWalkable(map, 20, 14)).toBe(false);
    // dialogueHasChoices false until a choice beat paints lastDialogue.
    const session = new GameSession();
    session.startNew();
    session.armPlainDialogueAdvance(false);
    expect(session.allowModalConfirm()).toBe(true);
    expect(session.dialogueHasChoices()).toBe(false);
  });
});
