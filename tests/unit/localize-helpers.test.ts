import { describe, expect, it, beforeEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import { localizeBet } from '../../src/i18n/localize-bet';
import {
  localizeDistrictName,
  localizeDistrictShort,
} from '../../src/i18n/localize-district';
import { localizedNpcName, englishNpcName } from '../../src/i18n/localize-npc';
import { localizeSign } from '../../src/i18n/localize-sign';
import { getBet } from '../../src/content/bets';

describe('localize helpers', () => {
  beforeEach(() => setLocale('en'));

  it('localizeBet swaps title/description for pt-BR', () => {
    const bet = getBet('agua-gelada')!;
    setLocale('en');
    const en = localizeBet(bet);
    expect(en.title.toLowerCase()).toMatch(/ice|água|water|gelo|boteco/i);
    setLocale('pt-BR');
    const pt = localizeBet(bet);
    expect(pt.title).not.toBe(en.title);
    expect(pt.description.length).toBeGreaterThan(8);
  });

  it('localizeDistrictName returns locale names', () => {
    setLocale('en');
    expect(localizeDistrictName('feira-central')).toMatch(/Fair|Feira/i);
    setLocale('pt-BR');
    expect(localizeDistrictName('feira-central')).toMatch(/Feira/i);
    expect(localizeDistrictShort('torre-casa')).toBeTruthy();
  });

  it('localizedNpcName matches dialog speakers in pt-BR', () => {
    expect(englishNpcName('radio-pirate')).toMatch(/Radio|Pirateiro/i);
    setLocale('pt-BR');
    expect(localizedNpcName({ id: 'radio-pirate', name: 'Radio Pirate' })).toBe(
      'Pirateiro de Rádio',
    );
    expect(localizedNpcName({ id: 'mole-contact', name: 'Mole Contact' })).toBe(
      'Contato Vira-Casaca',
    );
  });

  it('localizeSign translates wayfinding labels', () => {
    setLocale('en');
    expect(localizeSign('STAIRS')).toBe('STAIRS');
    setLocale('pt-BR');
    expect(localizeSign('STAIRS')).toBe('ESCADA');
    expect(localizeSign('EXIT')).toBe('SAÍDA');
    expect(localizeSign('UNKNOWN SIGN XYZ')).toBe('UNKNOWN SIGN XYZ');
  });
});
