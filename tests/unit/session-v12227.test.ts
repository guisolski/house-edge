/**
 * v1.22.27 — lockpick solvability + timer reset; type-scale floors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attemptSkill,
  encodePins,
  LOCK_PIN_LEVELS,
  perfectAttempt,
  phasePins,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';
import { scaleQaMs } from '../../src/systems/debug-qa';
import { GameSession } from '../../src/systems/session';
import { BETS } from '../../src/content/bets';

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

/** Bumps needed to reach want from cur (cycle of LOCK_PIN_LEVELS). */
function bumpsNeeded(cur: number, want: number): number {
  return (want - cur + LOCK_PIN_LEVELS) % LOCK_PIN_LEVELS;
}

describe('v1.22.27 lockpick perfect-information solvability', () => {
  it.each(['feira-lockbox', 'avenida-server'] as const)(
    '%s: perfect player wins in one test within pick budget',
    (betId) => {
      const def = skillForBet(betId, 'lockpick')!;
      const phase = def.phases[0]!;
      const budget = phase.pickDurability ?? 0;
      expect(budget).toBeGreaterThanOrEqual(5);
      let p = startSkill(def);
      expect(p.pickLeft).toBe(budget);
      p = attemptSkill(p, perfectAttempt(p));
      expect(p.won).toBe(true);
      expect(p.pickLeft).toBe(budget);
    },
  );

  it('chip-following player always clears within pick budget', () => {
    for (const bet of BETS.filter((b) => b.skill === 'lockpick')) {
      const def = skillForBet(bet.id, 'lockpick')!;
      const phase = def.phases[0]!;
      const target = phasePins(phase);
      const budget = phase.pickDurability ?? 0;
      let p = startSkill(def);
      let heights = target.map(() => 0);
      // Blind first test (all sunk) unless already correct.
      if (encodePins(heights) !== encodePins(target)) {
        p = attemptSkill(p, { phaseIndex: 0, value: encodePins(heights) });
        expect(p.done).toBe(false);
        // Adjust each pin toward target (as ↑/↓/✓ chips imply).
        heights = heights.map((h, i) => {
          const want = target[i]!;
          const n = bumpsNeeded(h, want);
          return (h + n) % LOCK_PIN_LEVELS;
        });
      }
      p = attemptSkill(p, { phaseIndex: 0, value: encodePins(heights) });
      expect(p.won, bet.id).toBe(true);
      expect(budget - (p.pickLeft ?? 0), `${bet.id} picks used`).toBeLessThanOrEqual(
        budget,
      );
      expect(p.pickLeft ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it('max per-pin distance fits in pick budget (3 heights)', () => {
    for (const bet of BETS.filter((b) => b.skill === 'lockpick')) {
      const phase = skillForBet(bet.id, 'lockpick')!.phases[0]!;
      const pins = phasePins(phase);
      const maxDist = Math.max(...pins.map((want) => bumpsNeeded(0, want)), 0);
      expect(maxDist).toBeLessThan(LOCK_PIN_LEVELS);
      expect(phase.pickDurability ?? 0).toBeGreaterThanOrEqual(pins.length + 2);
    }
  });
});

describe('v1.22.27 lockpick timer resets on soft-miss retry', () => {
  it('retrySkillMiss refreshes timerStartedAt and keeps a single scaled budget', () => {
    const s = new GameSession();
    s.startNew();
    s.setQaTimescale(0.33);
    s.player.addCredits(500);
    expect(s.debugOpenMinigame('lockpick')).toBe(true);
    const progress = s.getSkillProgress()!;
    const phase = progress.def.phases[0]!;
    const budget = scaleQaMs(phase.timerMs!, s.getQaTimescale());
    progress.lockpickUi = {
      heights: phasePins(phase).map(() => 0),
      verdicts: ['low', 'low', 'ok'],
      feedback: 'test',
      hinted: [],
      selected: 0,
      timerStartedAt: Date.now() - 8_000,
      timerBudgetMs: budget,
    };
    // Soft miss card path.
    const wrong = encodePins(phasePins(phase).map((p) => (p + 1) % LOCK_PIN_LEVELS));
    s.submitSkill(wrong);
    expect(s.getSkillMissCard()).not.toBeNull();
    const before = Date.now();
    s.retrySkillMiss();
    const ui = s.getSkillProgress()?.lockpickUi;
    expect(ui?.timerBudgetMs).toBe(budget);
    expect(ui?.timerStartedAt).toBeGreaterThanOrEqual(before - 50);
    // Remaining ≈ full budget (fresh start), not double-scaled.
    const left = (ui!.timerBudgetMs ?? 0) - (Date.now() - (ui!.timerStartedAt ?? 0));
    expect(left).toBeGreaterThan(budget - 500);
    expect(left).toBeLessThanOrEqual(budget);
  });

  it('retry without prior timerBudgetMs freezes scaleQaMs once', () => {
    const s = new GameSession();
    s.startNew();
    s.setQaTimescale(0.5);
    s.player.addCredits(500);
    expect(s.debugOpenMinigame('lockpick')).toBe(true);
    const progress = s.getSkillProgress()!;
    const phase = progress.def.phases[0]!;
    progress.lockpickUi = undefined;
    s.submitSkill(0);
    expect(s.getSkillMissCard()).not.toBeNull();
    // Clear any budget that soft-miss persist may have written, force fallback path.
    const live = s.getSkillProgress()!;
    if (live.lockpickUi) {
      live.lockpickUi = {
        ...live.lockpickUi,
        timerBudgetMs: undefined,
        timerStartedAt: Date.now() - 5_000,
      };
    }
    s.retrySkillMiss();
    const ui = s.getSkillProgress()?.lockpickUi;
    expect(ui?.timerBudgetMs).toBe(scaleQaMs(phase.timerMs!, 0.5));
  });

  it('retrySkillMiss on timing does not invent lockpickUi', () => {
    const s = new GameSession();
    s.startNew();
    s.player.addCredits(500);
    expect(s.debugOpenMinigame('needle')).toBe(true);
    s.clearNeedleArm();
    s.submitSkill(0.05);
    expect(s.getSkillMissCard()).not.toBeNull();
    s.retrySkillMiss();
    expect(s.getSkillProgress()?.lockpickUi).toBeUndefined();
  });
});

describe('v1.22.27 lockpick pinHints map one-to-one', () => {
  it('each lockpick phase exposes one pista per pin', () => {
    for (const bet of BETS.filter((b) => b.skill === 'lockpick')) {
      const phase = skillForBet(bet.id, 'lockpick')!.phases[0]!;
      const pins = phasePins(phase);
      expect(phase.pinHints?.length, bet.id).toBe(pins.length);
      for (const hint of phase.pinHints ?? []) {
        expect(hint.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it('lockpickClueDeducible accepts pinHints and rejects empty ones', async () => {
    const { lockpickClueDeducible } = await import('../../src/systems/minigame');
    const phase = skillForBet('feira-lockbox', 'lockpick')!.phases[0]!;
    expect(lockpickClueDeducible(phase)).toBe(true);
    expect(
      lockpickClueDeducible({
        ...phase,
        pinHints: ['ok', ''],
      }),
    ).toBe(false);
  });
});
