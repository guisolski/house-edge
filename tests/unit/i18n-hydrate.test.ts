import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectLocale,
  getLocale,
  hydrateLocaleFromStorage,
  setLocale,
  t,
  tf,
} from '../../src/i18n';
import { localizeSign } from '../../src/i18n/localize-sign';

describe('i18n hydrate + tf', () => {
  beforeEach(() => {
    setLocale('en');
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  it('detectLocale maps pt* to pt-BR', () => {
    expect(detectLocale('pt-BR')).toBe('pt-BR');
    expect(detectLocale('pt')).toBe('pt-BR');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale(undefined)).toBe('en');
    expect(detectLocale('')).toBe('en');
  });

  it('hydrateLocaleFromStorage prefers stored locale', () => {
    const store = new Map<string, string>([['house-edge-locale', 'pt-BR']]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('pt-BR');
    expect(t('ui.newGame')).toMatch(/Novo/i);
  });

  it('hydrateLocaleFromStorage falls back to navigator', () => {
    vi.stubGlobal('navigator', { language: 'pt-PT' });
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('pt-BR');
  });

  it('hydrate tolerates missing localStorage and navigator', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('navigator', undefined);
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('en');
    setLocale('en'); // writeStoredLocale no-ops without localStorage
  });

  it('hydrate ignores invalid stored locale and storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'fr-FR',
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    });
    vi.stubGlobal('navigator', { language: 'en-GB' });
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('en');
    setLocale('pt-BR'); // setItem throws — swallowed
  });

  it('t falls back to key when missing; tf interpolates', () => {
    setLocale('en');
    expect(t('ui.totally.missing.key.xyz')).toBe('ui.totally.missing.key.xyz');
    expect(tf('ui.toast.wonBet', { payout: '12' })).toMatch(/12/);
    expect(tf('ui.toast.wonBet', {})).toMatch(/\{payout\}|credits/i);
  });

  it('localizeSign falls back when catalog key missing translation', () => {
    setLocale('en');
    expect(localizeSign('STAIRS')).toBe('STAIRS');
    expect(localizeSign('NOT_A_REAL_SIGN')).toBe('NOT_A_REAL_SIGN');
  });
});
