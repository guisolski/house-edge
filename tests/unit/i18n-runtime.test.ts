import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectLocale,
  getLocale,
  hydrateLocaleFromStorage,
  setLocale,
  t,
  tf,
} from '../../src/i18n';
import { localizeBeatDialogue, localizeHushLine } from '../../src/i18n/localize-story';

describe('i18n runtime', () => {
  beforeEach(() => setLocale('en'));

  it('falls back to the raw key when missing', () => {
    expect(t('___missing.never___')).toBe('___missing.never___');
  });

  it('interpolates tf placeholders', () => {
    expect(tf('ui.obj.talkTo', { name: 'Nair', place: 'Morro' })).toContain('Nair');
    expect(tf('ui.obj.talkTo', {})).not.toContain('{name}');
  });

  it('hydrates from localStorage when present', () => {
    const store: Record<string, string> = { 'house-edge-locale': 'pt-BR' };
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
      configurable: true,
    });
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('pt-BR');
  });

  it('hydrates from navigator when storage empty', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => undefined,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'pt-BR' },
      configurable: true,
    });
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('pt-BR');
    expect(detectLocale('en')).toBe('en');
  });

  it('tolerates throwing localStorage', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('denied');
        },
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-US' },
      configurable: true,
    });
    hydrateLocaleFromStorage();
    expect(getLocale()).toBe('en');
    setLocale('pt-BR');
    expect(getLocale()).toBe('pt-BR');
  });

  it('localizes beat dialogue choices and hush line', () => {
    setLocale('pt-BR');
    const lines = localizeBeatDialogue('boteco-nair', [
      {
        speaker: 'Dona Nair',
        text: 'Hello',
        choices: [
          { label: 'Hi', setsFlag: 'x', reply: 'ok' },
          { label: 'Bye', setsFlag: 'y' },
        ],
      },
    ]);
    expect(lines[0]!.text).toMatch(/Rita|água|corp/i);
    expect(lines[0]!.choices?.[0]?.reply).toBeTruthy();
    expect(localizeHushLine().speaker).toBe('Augusto Casa');
  });
});
