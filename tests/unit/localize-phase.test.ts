import { beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/i18n';
import { localizePhase, localizeSkillDef } from '../../src/i18n/localize-phase';
import type { SkillDef, SkillPhase } from '../../src/systems/minigame';

const phase: SkillPhase = {
  kind: 'choice',
  prompt: 'Which draw ball is unmarked?',
  target: 1,
  options: ['Corp red 7', 'Hill chalk 3', 'Gold VIP 0'],
  clue: 'Seu Zé marks what the hill still owns.',
};

describe('localizePhase', () => {
  beforeEach(() => setLocale('en'));

  it('keeps English fallbacks when keys resolve', () => {
    const loc = localizePhase('laje-lottery', phase);
    expect(loc.prompt.length).toBeGreaterThan(4);
    expect(loc.options?.length).toBe(3);
    expect(loc.clue?.length).toBeGreaterThan(4);
  });

  it('switches prompts/options/clues in pt-BR', () => {
    setLocale('pt-BR');
    const loc = localizePhase('laje-lottery', phase);
    expect(loc.prompt).not.toBe(phase.prompt);
    expect(loc.options?.[0]).not.toBe(phase.options?.[0]);
  });

  it('localizes multi-phase skill defs', () => {
    const def: SkillDef = {
      kind: 'duel',
      title: 'Duel vs Augusto Casa',
      blurb: 'Multi-phase showdown.',
      phases: [phase, { ...phase, kind: 'timing', prompt: 'Stop on green.' }],
    };
    setLocale('pt-BR');
    const loc = localizeSkillDef('duelo-casa', def);
    expect(loc.title.length).toBeGreaterThan(2);
    expect(loc.phases).toHaveLength(2);
  });
});
