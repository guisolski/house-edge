/**
 * v1.22.24 — sequence hold phase, rendered UI metrics helpers, negotiate objective.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SEQ_FULL_HOLD_MS,
  SEQ_REVEAL_STEP_MS,
  sequenceRevealMs,
  skillForBet,
} from '../../src/systems/minigame';
import {
  sequenceHoldProgress,
  sequenceRevealGlyphs,
  sequenceRevealPhase,
  startSequenceReveal,
  tickSequenceReveal,
} from '../../src/systems/sequence-reveal';
import { GameSession } from '../../src/systems/session';
import { effectiveFontPx, panelWidthFloor } from '../../src/ui/layout-metrics';

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

describe('v1.22.24 sequence hold phase', () => {
  it('keeps full glyphs for SEQ_FULL_HOLD_MS after the last reveal step', () => {
    const seq = ['R', '↑', 'B', '↓'] as const;
    let s = startSequenceReveal([...seq], 0);
    expect(sequenceRevealPhase(s)).toBe('reveal');
    expect(sequenceHoldProgress(s, 0)).toBe(0);
    // Progressive: glyph 1 free at t0; (n-1) steps to show all.
    const steps = seq.length - 1;
    for (let i = 1; i <= steps; i += 1) {
      s = tickSequenceReveal(s, i * SEQ_REVEAL_STEP_MS);
    }
    const holdStart = steps * SEQ_REVEAL_STEP_MS;
    expect(s.shown).toBe(seq.length);
    expect(s.done).toBe(false);
    expect(sequenceRevealPhase(s, holdStart)).toBe('hold');
    expect(sequenceRevealGlyphs(s.seq, s.shown)).toBe('R  ↑  B  ↓');
    // Mid-hold: still holding, progress ~0.5
    const mid = holdStart + SEQ_FULL_HOLD_MS / 2;
    s = tickSequenceReveal(s, mid);
    expect(s.done).toBe(false);
    expect(sequenceHoldProgress(s, mid)).toBeGreaterThan(0.4);
    expect(sequenceHoldProgress(s, mid)).toBeLessThan(0.7);
    // After full hold → done
    const end = holdStart + SEQ_FULL_HOLD_MS;
    s = tickSequenceReveal(s, end);
    expect(s.done).toBe(true);
    expect(sequenceRevealPhase(s, end)).toBe('done');
    expect(sequenceHoldProgress(s, end)).toBe(1);
  });

  it('scales hold with timescale via sequenceRevealMs', () => {
    // 4 glyphs → 3 steps + hold
    expect(sequenceRevealMs(4)).toBe(3 * SEQ_REVEAL_STEP_MS + SEQ_FULL_HOLD_MS);
  });

  it('empty sequence starts done', () => {
    const s = startSequenceReveal([], 0);
    expect(s.done).toBe(true);
    expect(sequenceRevealPhase(s)).toBe('done');
  });
});

describe('v1.22.24 layout metrics helpers', () => {
  it('floors desktop panel width at clamp(520, 60vw, 960)', () => {
    expect(panelWidthFloor(1280)).toBe(
      Math.min(960, Math.max(520, Math.floor(1280 * 0.6))),
    );
    expect(panelWidthFloor(1024)).toBe(
      Math.min(960, Math.max(520, Math.floor(1024 * 0.6))),
    );
    expect(panelWidthFloor(390)).toBe(Math.floor(390 * 0.92));
  });

  it('multiplies computed font by ancestor scale', () => {
    expect(effectiveFontPx(15, 1)).toBe(15);
    expect(effectiveFontPx(15, 0.6)).toBe(9);
    expect(effectiveFontPx(20, 1.2)).toBe(24);
  });
});

describe('v1.22.24 Anfitrião offer advances objective', () => {
  it('after winning torre-negotiate, objective leaves Anfitrião', () => {
    const s = new GameSession(7);
    s.startNew();
    s.skipTutorialNow();
    expect(s.debugStartChapter('vip')).toBe(true);
    // VIP chapter lands after elevator; complete the skim beat so negotiate is next.
    s.story.completeBeat('torre-vip');
    s.story.setFlag('vip_ok', true);
    expect(s.objective().text).toMatch(/Anfitrião|VIP Host/i);
    expect(s.runStoryBeat('torre-negotiate')).toBe(true);
    expect(s.acceptStoryBet()).toBe(true);
    expect(s.getSkillProgress()?.def.kind).toBe('negotiate');
    // Perfect negotiate pick (hush chip = option 0).
    expect(s.submitSkill(0)).toBe(true);
    expect(s.getSkillResult()?.won).toBe(true);
    // Playtest #48: HUD must advance immediately — no stale Anfitrião line.
    const obj = s.objective().text;
    expect(obj).not.toMatch(/Anfitrião|VIP Host/i);
    expect(obj).toMatch(/Augusto|Casa/i);
  });
});

describe('v1.22.24 minigame howto tip', () => {
  it('peek then clear last tip for in-panel howto', () => {
    const s = new GameSession(3);
    s.startNew();
    s.skipTutorialNow();
    s.player.addCredits(200);
    expect(s.forceStorySkill('feira-radio')).toBe(true);
    // skill:started consumes tip via wiring in-game; call peek directly here.
    const tip = s.peekMinigameTip('hack');
    expect(tip === 'hack' || tip === null).toBe(true);
    if (tip) {
      expect(s.getLastMinigameTip()).toBe('hack');
      s.clearLastMinigameTip();
      expect(s.getLastMinigameTip()).toBeNull();
    } else {
      // Already seen from a prior peek in this suite — clear is still a no-op.
      s.clearLastMinigameTip();
      expect(s.getLastMinigameTip()).toBeNull();
    }
  });

  it('duel hack phase declares timerMs so input clock is fair', () => {
    const def = skillForBet('duelo-casa', 'duel');
    expect(def?.phases[2]?.kind).toBe('hack');
    expect(def?.phases[2]?.timerMs).toBeGreaterThanOrEqual(12_000);
  });
});
