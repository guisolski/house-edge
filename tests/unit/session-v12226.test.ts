/**
 * v1.22.26 — timescale survives chapter jump; panel/dialogue width floors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scaleQaMs } from '../../src/systems/debug-qa';
import { sequenceInputMs, skillForBet } from '../../src/systems/minigame';
import { GameSession } from '../../src/systems/session';
import { panelWidthFloor } from '../../src/ui/layout-metrics';

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

beforeEach(() => {
  stubStorage();
});

describe('v1.22.26 QA timescale survives chapter / startNew', () => {
  it('startNew does not wipe setQaTimescale', () => {
    const s = new GameSession();
    s.setQaTimescale(0.33);
    s.startNew();
    expect(s.getQaTimescale()).toBe(0.33);
  });

  it('debugStartChapter keeps timescale for duel hack input budget', () => {
    const s = new GameSession();
    s.setQaTimescale(0.33);
    expect(s.debugStartChapter('vip')).toBe(true);
    expect(s.getQaTimescale()).toBe(0.33);
    const hack = skillForBet('duelo-casa', 'duel')!.phases[2]!;
    const raw = sequenceInputMs(hack.sequence!.length, hack.timerMs);
    const scaled = scaleQaMs(raw, s.getQaTimescale());
    expect(scaled).toBeGreaterThanOrEqual(Math.round(raw / 0.33) - 1);
    expect(scaled).toBeGreaterThan(raw);
  });
});

describe('v1.22.26 panel width floor still clamp(520, 60vw, 960)', () => {
  it('1920 → 960, 1280 → 768, mobile → 92vw', () => {
    expect(panelWidthFloor(1920)).toBe(960);
    expect(panelWidthFloor(1280)).toBe(768);
    expect(panelWidthFloor(390)).toBe(Math.floor(390 * 0.92));
  });
});
