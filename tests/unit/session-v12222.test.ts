import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession, canNeedleStop } from '../../src/systems/session';
import {
  NEEDLE_ARM_GRACE_MS,
  NEEDLE_COUNTDOWN_MS,
  canNeedleInput,
  markNeedleMotionStarted,
  needleCountdownSeconds,
  needleInCountdown,
  needleInputArmAt,
  startNeedleArm,
} from '../../src/systems/needle-arm';
import { formatSkillResultHeadline } from '../../src/systems/skill-result-format';
import { setLocale, t } from '../../src/i18n';
import {
  parseDebugMinigame,
  parseDebugTimescale,
  scaleQaMs,
} from '../../src/systems/debug-qa';

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

describe('v1.22.22 needle arm (playtest #46)', () => {
  it('countdown is ≥3s and grace ≥150ms', () => {
    expect(NEEDLE_COUNTDOWN_MS).toBeGreaterThanOrEqual(3000);
    expect(NEEDLE_ARM_GRACE_MS).toBeGreaterThanOrEqual(150);
  });

  it('Em 3…2…1 then grace before input is legal', () => {
    const s0 = startNeedleArm(0);
    expect(needleInCountdown(s0, 0)).toBe(true);
    expect(needleCountdownSeconds(s0, 0)).toBe(3);
    expect(needleCountdownSeconds(s0, 1000)).toBe(2);
    expect(needleCountdownSeconds(s0, 2000)).toBe(1);
    expect(canNeedleInput(s0, NEEDLE_COUNTDOWN_MS - 1)).toBe(false);
    // Countdown done but motion not started → still blocked.
    expect(canNeedleInput(s0, NEEDLE_COUNTDOWN_MS)).toBe(false);
    const moving = markNeedleMotionStarted(s0, NEEDLE_COUNTDOWN_MS);
    expect(canNeedleInput(moving, NEEDLE_COUNTDOWN_MS + NEEDLE_ARM_GRACE_MS - 1)).toBe(
      false,
    );
    expect(canNeedleInput(moving, NEEDLE_COUNTDOWN_MS + NEEDLE_ARM_GRACE_MS)).toBe(true);
  });

  it('canNeedleStop delegates to arm state (legacy helper stays strict)', () => {
    expect(canNeedleStop(false, 9999, 0)).toBe(false);
    expect(canNeedleStop(true, 100, 200)).toBe(false);
    expect(canNeedleStop(true, 200, 200)).toBe(true);
  });

  it('submitSkill during unarmed needle is a no-op (not a miss)', () => {
    stubStorage();
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(100);
    expect(session.forceStorySkill('samba-odds')).toBe(true);
    session.beginNeedleArm(0);
    expect(session.isNeedleInputArmed(500)).toBe(false);
    const before = session.getSkillProgress()?.misses ?? 0;
    expect(session.submitSkill(0)).toBe(true);
    expect(session.getSkillProgress()?.misses).toBe(before);
    expect(session.getSkillResult()).toBeNull();
  });
});

describe('v1.22.22 credits', () => {
  beforeEach(stubStorage);

  it('epilogue finishBeat sets credits roll flag', () => {
    const session = new GameSession();
    session.startNew();
    expect(session.debugStartChapter('epilogue')).toBe(true);
    expect(session.runStoryBeat('epilogue-laje')).toBe(true);
    session.pickDialogueChoice('epi_rest', 'rest');
    session.closeModal();
    expect(session.showingCreditsRoll()).toBe(true);
    expect(session.ui.is('ending')).toBe(true);
  });

  it('story-complete unlocks rewatch credits from session', () => {
    const session = new GameSession();
    session.startNew();
    expect(session.canRewatchCredits()).toBe(false);
    session.debugStartChapter('epilogue');
    session.runStoryBeat('epilogue-laje');
    session.pickDialogueChoice('epi_feed', 'feed');
    session.closeModal();
    expect(session.canRewatchCredits()).toBe(true);
    session.continueExploring();
    expect(session.canRewatchCredits()).toBe(true);
    expect(session.openCreditsRoll()).toBe(true);
    expect(session.showingCreditsRoll()).toBe(true);
  });

  it('credits line.8 is not an em dash', () => {
    setLocale('pt-BR');
    expect(t('ui.credits.line.8')).not.toBe('—');
  });
});

describe('v1.22.22 fail card + QA', () => {
  beforeEach(stubStorage);

  it('soft miss leaves a fail result banner for quiz and needle', () => {
    setLocale('en');
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(200);
    expect(session.forceStorySkill('feira-tipster')).toBe(true);
    session.submitSkill(0);
    const soft = session.getSkillResult();
    if (session.getSkillProgress() && !session.getSkillProgress()!.done) {
      expect(session.getSkillMissCard()).toBeTruthy();
    } else {
      expect(soft).toBeTruthy();
      expect(soft!.won).toBe(false);
    }
    expect(formatSkillResultHeadline(false, 0, -1)).not.toMatch(/—\s*cr/);
  });

  it('parseDebugMinigame + timescale', () => {
    expect(parseDebugMinigame('lockpick')).toBe('lockpick');
    expect(parseDebugMinigame('needle')).toBe('needle');
    expect(parseDebugMinigame('quiz')).toBe('quiz');
    expect(parseDebugMinigame('')).toBe(null);
    expect(parseDebugMinigame(undefined)).toBe(null);
    expect(parseDebugMinigame('nope')).toBe(null);
    expect(parseDebugTimescale('0.33')).toBeCloseTo(0.33);
    expect(parseDebugTimescale('2')).toBe(1);
    expect(parseDebugTimescale(null)).toBe(1);
    expect(parseDebugTimescale('')).toBe(1);
    expect(parseDebugTimescale('NaN')).toBe(1);
    expect(parseDebugTimescale('-1')).toBe(1);
    expect(scaleQaMs(3000, 0.33)).toBeGreaterThan(3000);
    expect(scaleQaMs(1000, 0)).toBe(1000);
    expect(scaleQaMs(1000, 1)).toBe(1000);
  });

  it('QA timescale + debugOpenMinigame + miss retry/leave', () => {
    const session = new GameSession();
    session.startNew();
    session.setQaTimescale(0.33);
    expect(session.getQaTimescale()).toBeCloseTo(0.33);
    session.setQaTimescale(2);
    expect(session.getQaTimescale()).toBe(1);
    session.setQaTimescale(0);
    expect(session.getQaTimescale()).toBe(1);
    session.player.addCredits(500);
    expect(session.debugOpenMinigame('needle')).toBe(true);
    session.beginNeedleArm(0, 3000, 150);
    expect(session.isNeedleInputArmed(100)).toBe(false);
    session.markNeedleMotionStarted(3000);
    expect(session.isNeedleInputArmed(3150)).toBe(true);
    session.clearNeedleArm();
    expect(session.forceStorySkill('samba-odds')).toBe(true);
    expect(session.submitSkill(0.99)).toBe(true);
    expect(session.getSkillMissCard()).toBeTruthy();
    session.retrySkillMiss();
    expect(session.getSkillMissCard()).toBeNull();
    expect(session.submitSkill(0.99)).toBe(true);
    session.leaveSkillMiss();
    expect(session.getSkillProgress()).toBeNull();
  });

  it('needleInputArmAt + canNeedleInput null', () => {
    const s0 = startNeedleArm(100);
    expect(needleInputArmAt(s0)).toBe(100 + NEEDLE_COUNTDOWN_MS + NEEDLE_ARM_GRACE_MS);
    expect(canNeedleInput(null, 99999)).toBe(false);
    expect(canNeedleInput(undefined, 99999)).toBe(false);
    const twice = markNeedleMotionStarted(s0, 100 + NEEDLE_COUNTDOWN_MS);
    expect(markNeedleMotionStarted(twice, 999).motionStartedAt).toBe(
      twice.motionStartedAt,
    );
  });
});
