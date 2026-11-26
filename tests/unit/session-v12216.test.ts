import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { setLocale, t } from '../../src/i18n';

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

describe('v1.22.16 dialogue arm — Antena / offer-bet', () => {
  beforeEach(stubStorage);

  it('bumpModalConfirmArm does not add fresh Enter to held codes', () => {
    const session = new GameSession();
    session.startNew();
    session.armPlainDialogueAdvance([]);
    expect(session.allowModalConfirm('Enter')).toBe(true);
    session.noteInteractPressed('Enter');
    session.bumpModalConfirmArm();
    // Nothing held at open — bump must not invent a held Enter / time arm.
    expect(session.allowModalConfirm('Enter')).toBe(true);
  });

  it('bump with empty held does not clear an active time arm', () => {
    const session = new GameSession();
    session.startNew();
    session.noteModalOpened(false, []);
    expect(session.allowModalConfirm('Enter')).toBe(false);
    session.bumpModalConfirmArm();
    // Still armed — first blocked Enter must not disarm for the second press.
    expect(session.allowModalConfirm('Enter')).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300);
    expect(session.allowModalConfirm('Enter')).toBe(true);
    vi.restoreAllMocks();
  });

  it('offer-bet time arm blocks Enter until expiry; fresh Enter after works', () => {
    const session = new GameSession();
    session.startNew();
    // Simulate Take-bet panel opened with E already released.
    session.noteModalOpened(false, []);
    expect(session.allowModalConfirm('Enter')).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300);
    expect(session.allowModalConfirm('Enter')).toBe(true);
    vi.restoreAllMocks();
  });

  it('completeSkillPerfect clears skill and leaves no orphan result', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(100);
    expect(session.forceStorySkill('antena-sinal')).toBe(true);
    expect(session.completeSkillPerfect()).toBe(true);
    expect(session.getSkillResult()).toBeNull();
    expect(session.getSkillProgress()).toBeNull();
    expect(session.ui.is('play')).toBe(true);
    // No live phase / result — safe no-op.
    expect(session.completeSkillPerfect()).toBe(false);
  });

  it('result copy formats a single plus sign', () => {
    setLocale('pt-BR');
    expect(t('ui.skill.resultWin')).toBe('Vitória · {credits} cr · {rep} rep');
    expect(t('ui.skill.resultWin')).not.toMatch(/\+\+/);
    setLocale('en');
    expect(t('ui.skill.resultWin')).toBe('Win · {credits} cr · {rep} rep');
  });

  it('forceStorySkill opens antena-sinal skill without dialogue', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(100);
    expect(session.forceStorySkill('antena-sinal')).toBe(true);
    expect(session.ui.is('skill')).toBe(true);
    expect(session.getSkillProgress()?.def.phases[0]?.kind).toBe('hack');
  });
});
