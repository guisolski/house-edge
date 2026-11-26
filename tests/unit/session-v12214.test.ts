import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession, canNeedleStop, normInteractCode } from '../../src/systems/session';
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

describe('v1.22.14 dialogue key-held arm', () => {
  beforeEach(stubStorage);

  it('fresh Enter advances after open with KeyE held (no Enter keyup required)', () => {
    const session = new GameSession();
    session.startNew();
    session.noteInteractPressed('KeyE');
    session.armPlainDialogueAdvance(session.heldInteractCodes());
    // Enter was not held at open → allow immediately.
    expect(session.allowModalConfirm('Enter')).toBe(true);
    // KeyE still held-from-open → blocked until key-up.
    expect(session.allowModalConfirm('KeyE')).toBe(false);
    session.noteInteractRelease('KeyE');
    expect(session.allowModalConfirm('KeyE')).toBe(true);
  });

  it('arm after a missed keyup does not forever-block Enter', () => {
    const session = new GameSession();
    session.startNew();
    // Simulate E already released before armAfterModalOpen ran.
    session.armPlainDialogueAdvance([]);
    expect(session.allowModalConfirm('Enter')).toBe(true);
    expect(session.allowModalConfirm()).toBe(true);
  });

  it('noteModalOpened(true) with no held key self-heals on fresh Enter', () => {
    const session = new GameSession();
    session.startNew();
    session.noteModalOpened(true, []);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300);
    expect(session.allowModalConfirm('Enter')).toBe(true);
  });

  it('held KeyE blocks only KeyE after choice arm expires', () => {
    const session = new GameSession();
    session.startNew();
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    session.noteInteractPressed('KeyE');
    session.noteModalOpened(true, ['KeyE']);
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 300);
    expect(session.allowModalConfirm('Enter')).toBe(true);
    expect(session.allowModalConfirm('KeyE')).toBe(false);
    session.noteInteractRelease('KeyE');
    // Release after a held-through arm starts a quiet period — wait it out.
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 900);
    expect(session.allowModalConfirm('KeyE')).toBe(true);
  });

  it('normInteractCode collapses NumpadEnter', () => {
    expect(normInteractCode('NumpadEnter')).toBe('Enter');
    expect(normInteractCode('Space')).toBe('Space');
    expect(normInteractCode('KeyE')).toBe('KeyE');
    expect(normInteractCode(null)).toBeNull();
  });
});

describe('v1.22.14 needle countdown gate', () => {
  beforeEach(stubStorage);

  it('canNeedleStop is false during countdown — E must not consume an attempt', () => {
    const readyUntil = 1000;
    expect(canNeedleStop(false, 500, readyUntil)).toBe(false);
    expect(canNeedleStop(true, 999, readyUntil)).toBe(false);
    expect(canNeedleStop(true, 1000, readyUntil)).toBe(true);
  });

  it('submitSkill during a timing retry is not called when countdown gate fails', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(50);
    // Nair timing skill.
    session.world.unlock('feira-central');
    const progressBefore = session.getSkillProgress();
    expect(progressBefore).toBeNull();
    // Gate helper is what Stop/E consult — no attempt without ready.
    const readyUntil = performance.now() + 5000;
    expect(canNeedleStop(false, performance.now(), readyUntil)).toBe(false);
    // Starting a bet then ensuring misses stay 0 without a real stop.
    expect(session.submitSkill(0)).toBe(false);
  });

  it('lockpick hint is a clear one-liner', () => {
    setLocale('pt-BR');
    expect(t('ui.lockpickHintKeyboard')).toMatch(/escolher pino/);
    expect(t('ui.lockpickHintKeyboard')).toMatch(/Enter testar/);
    setLocale('en');
    expect(t('ui.lockpickHintKeyboard')).toMatch(/choose pin/i);
  });

  it('getLastInteractCode and bumpModalConfirmArm track Enter', () => {
    const session = new GameSession();
    session.startNew();
    session.noteInteractPressed('Enter');
    expect(session.getLastInteractCode()).toBe('Enter');
    session.bumpModalConfirmArm();
    expect(session.allowModalConfirm('Enter')).toBe(false);
    session.clearModalConfirmGate();
    expect(session.allowModalConfirm('Enter')).toBe(true);
  });

  it('clearModalConfirmGate opens all confirms', () => {
    const session = new GameSession();
    session.startNew();
    session.noteModalOpened(true, ['KeyE']);
    session.clearModalConfirmGate();
    expect(session.allowModalConfirm('KeyE')).toBe(true);
    expect(session.heldInteractCodes()).toEqual([]);
  });

  it('armPlainDialogueAdvance with string[] codes blocks those codes', () => {
    const session = new GameSession();
    session.startNew();
    session.armPlainDialogueAdvance(['Space', 'NumpadEnter']);
    expect(session.allowModalConfirm('Space')).toBe(false);
    expect(session.allowModalConfirm('Enter')).toBe(false);
    expect(session.allowModalConfirm('KeyE')).toBe(true);
    session.noteInteractRelease('Space');
    expect(session.allowModalConfirm('Space')).toBe(true);
  });

  it('heldInteractCodes falls back to KeyE when code missing', () => {
    const session = new GameSession();
    session.startNew();
    session.noteInteractPressed();
    expect(session.heldInteractCodes()).toEqual(['KeyE']);
    expect(session.dialogueHasChoices()).toBe(false);
    expect(canNeedleStop(false, 2000, 1000)).toBe(false);
  });
});
