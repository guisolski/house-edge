/**
 * v1.22.25 — duel timescale + fail card, lockpick chips, panel width floor.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scaleQaMs } from '../../src/systems/debug-qa';
import { skillForBet } from '../../src/systems/minigame';
import {
  formatLockpickPinVerdict,
  formatLockpickVerdictLine,
} from '../../src/systems/skill-result-format';
import { GameSession } from '../../src/systems/session';
import { needleMotionStep } from '../../src/systems/needle-arm';
import { panelWidthFloor } from '../../src/ui/layout-metrics';
import { setLocale } from '../../src/i18n';

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
  setLocale('pt-BR');
});

describe('v1.22.25 duel needle matches regular tier + timescale', () => {
  it('duel phase-1 needleSpeed matches regular timing (~0.8), not boss 1.55', () => {
    const duel = skillForBet('duelo-casa', 'duel')!;
    const needle = duel.phases[0]!;
    expect(needle.kind).toBe('timing');
    expect(needle.needleSpeed ?? 0).toBeLessThanOrEqual(0.95);
    expect(needle.needleSpeed ?? 0).toBeGreaterThanOrEqual(0.7);
    expect(needle.window ?? 0).toBeGreaterThanOrEqual(0.1);
  });

  it('needleMotionStep slows with timescale 0.33', () => {
    const full = needleMotionStep(0.8, 1);
    const slow = needleMotionStep(0.8, 0.33);
    expect(slow).toBeLessThan(full * 0.4);
    expect(slow).toBeGreaterThan(0);
  });

  it('duel hack still has reveal hold budget + timerMs', () => {
    const hack = skillForBet('duelo-casa', 'duel')!.phases[2]!;
    expect(hack.kind).toBe('hack');
    expect(hack.maxMisses).toBe(4);
    expect(hack.timerMs ?? 0).toBeGreaterThanOrEqual(12_000);
    expect(scaleQaMs(hack.timerMs!, 0.33)).toBeGreaterThan(hack.timerMs!);
  });
});

describe('v1.22.25 duel leave / exhaust shows lose result', () => {
  function bootDuel(): GameSession {
    const s = new GameSession();
    s.startNew();
    s.skipTutorialNow();
    s.player.addCredits(2000);
    s.setQaTimescale(0.33);
    expect(s.forceStorySkill('duelo-casa')).toBe(true);
    return s;
  }

  it('leaveSkillMiss finishes the encounter with a lose result card', () => {
    const s = bootDuel();
    // Force a soft miss on needle.
    expect(s.submitSkill(0)).toBe(true);
    expect(s.getSkillMissCard()).not.toBeNull();
    s.leaveSkillMiss();
    expect(s.getSkillMissCard()).toBeNull();
    expect(s.getSkillProgress()).toBeNull();
    const result = s.getSkillResult();
    expect(result).not.toBeNull();
    expect(result?.won).toBe(false);
  });

  it('hitting maxMisses on duel hack finishes with lose result', () => {
    const s = bootDuel();
    // Win needle (target ~0.5) then choice (target 1 = Ledger twitch).
    expect(s.submitSkill(0.5)).toBe(true);
    expect(s.getSkillMissCard()).toBeNull();
    expect(s.submitSkill(1)).toBe(true);
    const progress = s.getSkillProgress();
    expect(progress?.def.phases[progress.phaseIndex]?.kind).toBe('hack');
    for (let i = 0; i < 4; i += 1) {
      const p = s.getSkillProgress()!;
      const seq = p.def.phases[p.phaseIndex]!.sequence!;
      const expected = seq[p.seqIndex]!;
      const wrong = expected === 'R' ? 1 : 0;
      s.submitSkill(wrong);
      if (i < 3) {
        expect(s.getSkillMissCard(), `miss ${i + 1}`).not.toBeNull();
        s.retrySkillMiss();
      }
    }
    const result = s.getSkillResult();
    expect(result).not.toBeNull();
    expect(result?.won).toBe(false);
    expect(result?.skillKind).toBe('duel');
  });
});

describe('v1.22.25 lockpick direction chips', () => {
  it('chips read as directions (subir/descer/certo), not bare states', () => {
    expect(formatLockpickPinVerdict('ok')).toMatch(/✓|certo|set/i);
    expect(formatLockpickPinVerdict('low')).toMatch(/↑|subir|raise|up/i);
    expect(formatLockpickPinVerdict('high')).toMatch(/↓|descer|lower|down/i);
    const line = formatLockpickVerdictLine(['low', 'ok', 'high']);
    expect(line.toLowerCase()).toMatch(/subir|baixo|low/);
    expect(line.toLowerCase()).toMatch(/certo|set|ok/);
  });
});

describe('v1.22.25 panel width floor (60vw / 960)', () => {
  it('desktop floor is clamp(520, 60vw, 960)', () => {
    expect(panelWidthFloor(1920)).toBe(960);
    expect(panelWidthFloor(1280)).toBe(
      Math.min(960, Math.max(520, Math.floor(1280 * 0.6))),
    );
    expect(panelWidthFloor(1024)).toBe(
      Math.min(960, Math.max(520, Math.floor(1024 * 0.6))),
    );
    expect(panelWidthFloor(390)).toBe(Math.floor(390 * 0.92));
  });
});
