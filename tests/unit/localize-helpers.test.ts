import { describe, expect, it, beforeEach } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import { localizeBet } from '../../src/i18n/localize-bet';
import {
  localizeDistrictName,
  localizeDistrictShort,
  isDistrictId,
} from '../../src/i18n/localize-district';
import { localizedNpcName, englishNpcName } from '../../src/i18n/localize-npc';
import { localizeSign } from '../../src/i18n/localize-sign';
import { localizePhase, localizeSkillDef } from '../../src/i18n/localize-phase';
import { localizeBeatDialogue, localizeHushLine } from '../../src/i18n/localize-story';
import { getBet } from '../../src/content/bets';
import { skillForBet } from '../../src/systems/minigame';

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
    // Unknown bet id falls back to raw title/description
    const ghost = localizeBet({
      ...bet,
      id: 'no-such-bet-xyz',
      title: 'Ghost Title',
      description: 'Ghost Desc',
    });
    expect(ghost.title).toBe('Ghost Title');
    expect(ghost.description).toBe('Ghost Desc');
  });

  it('localizeDistrictName returns locale names and fallbacks', () => {
    setLocale('en');
    expect(localizeDistrictName('feira-central')).toMatch(/Fair|Feira/i);
    setLocale('pt-BR');
    expect(localizeDistrictName('feira-central')).toMatch(/Feira/i);
    expect(localizeDistrictShort('torre-casa')).toBeTruthy();
    expect(localizeDistrictShort('morro-neon')).toBeTruthy();
    expect(isDistrictId('morro-neon')).toBe(true);
    expect(isDistrictId('not-a-district')).toBe(false);
    // Unknown id falls through SHORT_FALLBACK / id
    expect(localizeDistrictName('not-a-district')).toBe('not-a-district');
  });

  it('localizedNpcName matches dialog speakers in pt-BR', () => {
    expect(englishNpcName('radio-pirate')).toMatch(/Radio|Pirateiro/i);
    expect(englishNpcName('no-such-npc')).toBe('no-such-npc');
    setLocale('pt-BR');
    expect(localizedNpcName({ id: 'radio-pirate', name: 'Radio Pirate' })).toBe(
      'Pirateiro de Rádio',
    );
    expect(localizedNpcName({ id: 'mole-contact', name: 'Mole Contact' })).toBe(
      'Contato Vira-Casaca',
    );
    expect(localizedNpcName({ id: 'cage-runner', name: 'Cage Runner' })).toBe(
      'Corredor da Gaiola',
    );
    // Missing catalog key → npc.name fallback
    expect(localizedNpcName({ id: 'ghost-npc', name: 'Ghost Name' })).toBe('Ghost Name');
    // Empty name → englishNpcName / id
    expect(localizedNpcName({ id: 'ghost-npc', name: '' })).toBe('ghost-npc');
  });

  it('localizeSign translates wayfinding labels', () => {
    setLocale('en');
    expect(localizeSign('STAIRS')).toBe('STAIRS');
    setLocale('pt-BR');
    expect(localizeSign('STAIRS')).toBe('ESCADA');
    expect(localizeSign('EXIT')).toBe('SAÍDA');
    expect(localizeSign('RAMP')).toBe('RAMPA');
    expect(localizeSign('ELEVATOR')).toMatch(/ELEVADOR/i);
    expect(localizeSign('VIP SALON')).toBe('SALÃO VIP');
    expect(localizeSign('UNKNOWN SIGN XYZ')).toBe('UNKNOWN SIGN XYZ');
  });
});

describe('localize phase + story', () => {
  beforeEach(() => setLocale('en'));

  it('localizePhase and localizeSkillDef cover multi/single paths', () => {
    const def = skillForBet('agua-gelada', 'timing');
    expect(def).toBeTruthy();
    setLocale('pt-BR');
    const loc = localizeSkillDef('agua-gelada', def!);
    expect(loc.phases[0]!.prompt.length).toBeGreaterThan(4);
    const phase = localizePhase('agua-gelada', def!.phases[0]!, 0, false);
    expect(phase.prompt).toBeTruthy();
    const tipster = skillForBet('feira-tipster', 'puzzle')!;
    const tipLoc = localizePhase('feira-tipster', tipster.phases[0]!, 0, false);
    expect(tipLoc.options?.[1]).toMatch(/canta|hum/i);
    // Multi-phase boss
    const duel = skillForBet('duelo-casa', 'duel');
    expect(duel).toBeTruthy();
    const multi = localizeSkillDef('duelo-casa', duel!);
    expect(multi.phases.length).toBeGreaterThan(1);
    expect(multi.title.length).toBeGreaterThan(2);
    // Phase without clue / options still returns
    const bare = localizePhase(
      'ghost-bet',
      { kind: 'timing', prompt: 'raw', target: 0.5 },
      0,
      false,
    );
    expect(bare.prompt).toBe('raw');
    expect(bare.clue).toBeUndefined();
  });

  it('localizeBeatDialogue and hush line resolve in pt-BR', () => {
    setLocale('pt-BR');
    const lines = localizeBeatDialogue('epilogue-laje', [
      { speaker: 'Dona Nair', text: 'EN fallback' },
      { speaker: 'Dona Nair', text: 'EN 1' },
      { speaker: 'Dona Nair', text: 'EN 2' },
      { speaker: 'Dona Nair', text: 'EN 3' },
      { speaker: 'Dona Nair', text: 'EN 4' },
      {
        speaker: 'Dona Nair',
        text: 'EN 5',
        choices: [{ label: 'x', setsFlag: 'f' }],
      },
      { speaker: 'Dona Nair', text: 'EN closing' },
    ]);
    expect(lines[0]!.text).toMatch(/gelo|morro|Rita/i);
    expect(lines[6]!.text).toMatch(/créditos|Saúde|cidade/i);
    expect(lines[0]!.speaker).toMatch(/Nair/i);
    const hush = localizeHushLine();
    expect(hush.speaker.length).toBeGreaterThan(1);
    expect(hush.text.length).toBeGreaterThan(8);
    expect(t('ui.credits.line.0')).toMatch(/Rita|agulha|timing/i);
    expect(t('ui.credits.skipHint')).toMatch(/Pule|botões/i);
  });
});
