import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { buildDistrictMap, isWalkable } from '../../src/world/maps';
import { slideStep, unstuckAlongPush } from '../../src/world/slide';
import {
  isArrowSeqKey,
  isColorSeqKey,
  phaseSequence,
  sequenceHintKey,
  sequenceInputIndex,
  sequenceKeysMatch,
  sequencePadKeys,
  sequencePadLabel,
  skillForBet,
  SEQ_KEYS,
  type SeqKey,
} from '../../src/systems/minigame';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import { setLocale, t } from '../../src/i18n';
import { nearestWalkable } from '../../src/world/slide';

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

describe('v1.22.12 Avenida wall-push softlock', () => {
  beforeEach(stubStorage);

  it('west corridor mouth at world x≈300 (tile 11→12) opens after wall-push', () => {
    const map = buildDistrictMap('avenida-odds');
    // Softlock report: east at x≈300px (= tile ~6–11) between police + NPCs.
    expect(isWalkable(map, 11, 10)).toBe(true);
    expect(isWalkable(map, 12, 10)).toBe(false);
    expect(slideStep(map, 11, 10, 1, 0)).toBeNull();
    // Holding east nudges into the dual lane.
    const nudged = unstuckAlongPush(map, 11, 10, 1, 0);
    expect(nudged).not.toBeNull();
    expect(isWalkable(map, nudged!.x, nudged!.y)).toBe(true);
    expect(nudged!.y === 11 || nudged!.y === 12 || nudged!.x >= 11).toBe(true);
  });

  it('session wall-push >1s frees east softlock at (11,10)', () => {
    const session = new GameSession();
    session.startNew();
    session.world.unlock('avenida-odds');
    session.travelTo('avenida-odds');
    session.player.setPosition(11, 10);
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    expect(session.move(1, 0)).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 1100);
    expect(session.move(1, 0)).toBe(true);
    const s = session.player.getStats();
    expect(isWalkable(session.getMap(), s.x, s.y)).toBe(true);
    expect(s.x > 11 || s.y === 11 || s.y === 12).toBe(true);
  });

  it('Torre plaza hold-east keeps y stable on the striped floor', () => {
    const map = buildDistrictMap('torre-casa');
    let x = 6;
    const y = 12;
    for (let i = 0; i < 28; i += 1) {
      const next = slideStep(map, x, y, 1, 0);
      expect(next, `blocked at ${x},${y}`).not.toBeNull();
      expect(next!.y).toBe(y);
      x = next!.x;
    }
    expect(x).toBeGreaterThanOrEqual(30);
  });
});

describe('v1.22.12 sequence hints match accepted input', () => {
  beforeEach(() => {
    stubStorage();
    setLocale('pt-BR');
  });

  it('every sequence phase hint matches its symbol set', () => {
    const cases: { id: string; seq: SeqKey[] }[] = [
      {
        id: 'twist-vazamento',
        seq: phaseSequence(SKILL_PHASE_TABLE['twist-vazamento']!),
      },
      {
        id: 'avenida-stealth',
        seq: phaseSequence(SKILL_PHASE_TABLE['avenida-stealth']!),
      },
      { id: 'avenida-atm', seq: phaseSequence(SKILL_PHASE_TABLE['avenida-atm']!) },
      { id: 'antena-sinal', seq: phaseSequence(SKILL_PHASE_TABLE['antena-sinal']!) },
    ];
    const duel = skillForBet('duelo-casa', 'duel')!;
    const p3 = duel.phases[2]!;
    cases.push({ id: 'duelo-casa-p3', seq: phaseSequence(p3) });

    for (const c of cases) {
      const hintKey = sequenceHintKey(c.seq);
      const hint = t(hintKey);
      const hasColor = c.seq.some((k) => 'RGBY'.includes(k));
      const hasArrow = c.seq.some((k) => '↑→↓←'.includes(k));
      if (hasArrow && !hasColor) {
        expect(hintKey).toBe('ui.skill.escSeqHint.arrows');
        expect(hint).toMatch(/setas|WASD|direcional/i);
        expect(hint).not.toMatch(/só na sequência/);
      }
      if (hasColor && !hasArrow) {
        expect(hintKey).toBe('ui.skill.escSeqHint.colors');
        expect(hint).toMatch(/R\/G\/B\/Y|setas equivalentes/i);
      }
      if (hasColor && hasArrow) {
        expect(hintKey).toBe('ui.skill.escSeqHint.mixed');
        expect(hint).toMatch(/letras e setas|R↑/i);
      }
      // Arrows always resolve against a color expected (and vice versa).
      const expected = c.seq[0]!;
      if (expected === 'R' || expected === 'B' || expected === 'G' || expected === 'Y') {
        const arrow = ({ R: '↑', G: '→', B: '↓', Y: '←' } as Record<string, SeqKey>)[
          expected
        ]!;
        expect(sequenceKeysMatch(arrow, expected)).toBe(true);
        expect(sequenceInputIndex(arrow, expected)).toBe(SEQ_KEYS.indexOf(expected));
      }
      void sequencePadKeys(c.seq);
    }
  });

  it('ATM prompt says setas not dígitos', () => {
    expect(t('skill.avenida-atm.prompt')).toMatch(/setas/i);
    expect(t('skill.avenida-atm.prompt')).not.toMatch(/dígitos/i);
  });

  it('color↔arrow aliases and pad labels cover both symbol sets', () => {
    expect(isColorSeqKey('R')).toBe(true);
    expect(isArrowSeqKey('↑')).toBe(true);
    expect(sequencePadLabel('R')).toBe('R ↑');
    expect(sequencePadLabel('↑')).toBe('↑');
    expect(sequenceKeysMatch('↑', 'R')).toBe(true);
    expect(sequenceKeysMatch('R', '↑')).toBe(true);
    expect(sequenceKeysMatch('G', 'B')).toBe(false);
    expect(sequenceInputIndex('→', 'G')).toBe(SEQ_KEYS.indexOf('G'));
    expect(sequenceInputIndex('B', 'B')).toBe(SEQ_KEYS.indexOf('B'));
    expect(sequenceHintKey(['R', 'G'])).toBe('ui.skill.escSeqHint.colors');
    expect(sequenceHintKey(['↑', '→'])).toBe('ui.skill.escSeqHint.arrows');
    expect(sequenceHintKey(['R', '↑'])).toBe('ui.skill.escSeqHint.mixed');
    expect(sequencePadKeys(['R', 'B'])).toEqual(['R', 'G', 'B', 'Y']);
  });

  it('failSkillOffer ends a live negotiate encounter', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(200);
    session.story.setFlag('elevator_ok', true);
    session.story.setFlag('vip_ok', true);
    expect(session.runStoryBeat('torre-negotiate')).toBe(true);
    session.acceptStoryBet();
    expect(session.ui.is('skill')).toBe(true);
    expect(session.failSkillOffer()).toBe(true);
    expect(session.ui.is('play')).toBe(true);
  });

  it('nearestWalkable null when already free; unstuck prefers forward', () => {
    const map = buildDistrictMap('avenida-odds');
    expect(nearestWalkable(map, 20, 11)).toBeNull();
    const hit = unstuckAlongPush(map, 11, 10, 1, 0)!;
    expect(hit).toEqual({ x: 12, y: 11 });
  });
});
