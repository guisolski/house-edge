import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import { districtNpcs, EXIT_STAND_RANGE } from '../../src/systems/interaction';
import { jobBet, listJobs } from '../../src/systems/grind';
import { GameSession } from '../../src/systems/session';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { skillForBet, startSkill, attemptSkill } from '../../src/systems/minigame';

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

describe('v1.22.9 mash gate + focus + world', () => {
  beforeEach(stubStorage);

  it('modal confirm stays blocked until key-up after noteModalOpened(true)', () => {
    const session = new GameSession();
    session.startNew();
    session.noteInteractPressed('Enter');
    session.noteModalOpened(true);
    expect(session.allowModalConfirm()).toBe(false);
    session.noteInteractRelease();
    // Still in arm / quiet.
    expect(session.allowModalConfirm()).toBe(false);
  });

  it('closing a modal with key already up does not blanket-block the next E', () => {
    const session = new GameSession();
    session.startNew();
    session.noteInteractPressed('Enter');
    session.noteInteractRelease();
    expect(session.ui.go('travel')).toBe(true);
    session.releaseModalToPlay();
    session.noteInteractPressed('KeyE');
    expect(session.allowInteractInput()).toBe(true);
  });

  it('cancelBet while Enter held still gates interact until release', () => {
    const session = new GameSession();
    session.startNew();
    expect(session.ui.go('bet')).toBe(true);
    session.noteInteractPressed('Enter');
    session.cancelBet();
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    expect(session.ui.is('play')).toBe(true);
  });

  it('Augusto phase 2 target is Ledger twitch index 1', () => {
    const def = skillForBet('duelo-casa', 'duel')!;
    expect(def.phases[1]?.target).toBe(1);
    let p = startSkill(def);
    p = { ...p, phaseIndex: 1 };
    p = attemptSkill(p, { phaseIndex: 1, value: 1 });
    expect(p.justMissed).toBe(false);
    expect(p.phaseIndex).toBe(2);
  });

  it('Odds NPCs sit outside Fair exit stand range', () => {
    const pad = { x: 2, y: 12 };
    for (const id of ['mole-contact', 'capita', 'courier-odds'] as const) {
      const n = districtNpcs().find((x) => x.id === id)!;
      const d = Math.hypot(n.x - pad.x, n.y - pad.y);
      expect(d, id).toBeGreaterThan(EXIT_STAND_RANGE + 2);
    }
  });

  it('Feira stall neighbors keep ≥2 cardinal escapes', () => {
    const map = buildDistrictMap('feira-central');
    const stalls = map.buildings.filter((b) => b.kind === 'feira');
    expect(stalls.length).toBeGreaterThan(5);
    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const;
    const cells = stalls.flatMap((s) => {
      const out: [number, number][] = [];
      for (let x = s.x - 1; x <= s.x + s.w; x += 1) {
        for (let y = s.y - 1; y <= s.y + s.h; y += 1) out.push([x, y]);
      }
      return out;
    });
    const traps = cells
      .filter(([x, y]) => isWalkable(map, x, y))
      .filter(
        ([x, y]) => dirs.filter(([dx, dy]) => isWalkable(map, x + dx, y + dy)).length < 2,
      )
      .map(([x, y]) => `${x},${y}`);
    expect(traps, traps.join(';')).toEqual([]);
  });

  it('pt-BR copy drops filler lines', () => {
    setLocale('pt-BR');
    expect(t('story.torre-elevator.3.text')).not.toMatch(/Cromado ou de novo/i);
    expect(t('story.avenida-betrayal.0.text')).not.toMatch(/cicatriz de dedo-duro/i);
    expect(t('story.torre-pit.3.text')).not.toMatch(
      /Cresci lendo asfalto marcado\. Fechado/i,
    );
    expect(t('ui.lockpickHintKeyboard')).toMatch(/↑/);
  });

  it('jobBet is undefined for flat-pay jobs without betId', () => {
    const flat = listJobs('morro-neon', 0).find((j) => !j.betId);
    expect(flat).toBeTruthy();
    expect(jobBet(flat!)).toBeUndefined();
  });
});
