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

  it('result copy formats a single plus sign', () => {
    setLocale('pt-BR');
    expect(t('ui.skill.resultWin')).toBe('Vitória · {credits} cr · {rep} rep');
    expect(t('ui.skill.resultWin')).not.toMatch(/\+\+/);
    setLocale('en');
    expect(t('ui.skill.resultWin')).toBe('Win · {credits} cr · {rep} rep');
  });
});
