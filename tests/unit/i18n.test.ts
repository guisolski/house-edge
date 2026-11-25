import { describe, expect, it, beforeEach } from 'vitest';
import { en } from '../../src/i18n/en';
import { ptBR } from '../../src/i18n/pt-BR';
import { allKeys, detectLocale, getLocale, setLocale, t } from '../../src/i18n/index';

describe('i18n catalog v1.22', () => {
  const enKeys = Object.keys(en);
  const ptKeys = Object.keys(ptBR);

  it('en and pt-BR share the same key set', () => {
    expect(enKeys.sort()).toEqual(ptKeys.sort());
    expect(allKeys().sort()).toEqual(enKeys.sort());
  });

  it('no locale value equals its raw key', () => {
    for (const key of enKeys) {
      expect(en[key]).not.toBe(key);
      expect(ptBR[key]).not.toBe(key);
    }
  });

  it('detectLocale maps navigator tags', () => {
    expect(detectLocale('pt-BR')).toBe('pt-BR');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('pt')).toBe('pt-BR');
  });

  describe('t()', () => {
    beforeEach(() => {
      setLocale('en');
    });

    it('returns localized ui.newGame after setLocale', () => {
      setLocale('en');
      expect(t('ui.newGame')).toBe('New Game');
      setLocale('pt-BR');
      expect(t('ui.newGame')).toBe('Novo jogo');
      expect(getLocale()).toBe('pt-BR');
    });
  });
});
