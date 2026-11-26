import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale, t } from '../../src/i18n';
import { skillPtBR } from '../../src/i18n/skill-pt-BR';
import { storyPtBR } from '../../src/i18n/story-pt-BR';
import { districtNpcs } from '../../src/systems/interaction';
import { GameSession } from '../../src/systems/session';

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

/** Imperative openers that should not start pt-BR choice labels (use infinitive). */
const IMPERATIVE_START =
  /^(Sai|Aceita|Cobre|Fica|Pega|Olha|Vai|Deixa|Escolhe|Para|Corre|Fecha|Chama|Toma|Larga)\b/;

describe('v1.22.8 victory + clues + pt-BR register', () => {
  beforeEach(stubStorage);

  it('continueExploring works from ending UI', () => {
    const session = new GameSession();
    session.startNew();
    expect(session.ui.go('ending')).toBe(true);
    expect(session.continueExploring()).toBe(true);
    expect(session.ui.is('play')).toBe(true);
  });

  it('Augusto + Guarda clues point at the correct answers without option tokens', () => {
    setLocale('pt-BR');
    const aug = t('skill.duelo-casa.phase.1.clue');
    expect(aug).toMatch(/papel sob a palma/i);
    expect(aug).not.toMatch(/livro nervoso|sorriso na mesa|rugido/i);
    expect(t('skill.duelo-casa.phase.1.option.1')).toMatch(/Livro nervoso/i);

    const guard = t('skill.torre-foyer.clue');
    expect(guard).toMatch(/boato já mandou/i);
    expect(guard).toMatch(/não carimbo de turista/i);
    expect(guard).not.toMatch(/passe turista|segredo aberto/i);
    expect(t('skill.torre-foyer.option.2')).toMatch(/Segredo aberto/i);
  });

  it('pt-BR choice labels use infinitive register (no bare imperatives)', () => {
    const labels: string[] = [];
    for (const [k, v] of Object.entries(skillPtBR)) {
      if (/\.option\.\d+$/.test(k)) labels.push(v);
    }
    for (const [k, v] of Object.entries(storyPtBR)) {
      if (/\.choice\.\d+\.label$/.test(k)) labels.push(v);
    }
    expect(labels.length).toBeGreaterThan(20);
    for (const label of labels) {
      expect(label, label).not.toMatch(IMPERATIVE_START);
    }
    setLocale('pt-BR');
    expect(t('skill.torre-negotiate.option.2')).toBe('Sair sorrindo');
  });

  it('mole-contact sits clear of the Fair sign tile', () => {
    const mole = districtNpcs().find((n) => n.id === 'mole-contact')!;
    expect(mole.x).toBeGreaterThanOrEqual(9);
    expect(Math.hypot(mole.x - 2, mole.y - 10)).toBeGreaterThan(8);
  });
});
