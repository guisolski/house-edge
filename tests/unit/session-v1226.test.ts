import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { EXIT_STAND_RANGE } from '../../src/systems/interaction';
import { setLocale, t } from '../../src/i18n';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import {
  judgePhase,
  phaseSequence,
  sequencePadKeys,
  skillForBet,
} from '../../src/systems/minigame';
import { STORY_BEATS } from '../../src/content/story';
import { normalizeKeyCode, isConfirmKey } from '../../src/input/keyboard';

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

describe('v1.22.6 Enter key normalization', () => {
  it('treats NumpadEnter and Space as confirm keys', () => {
    const main = { key: 'Enter', code: 'Enter', repeat: false } as KeyboardEvent;
    const num = { key: 'Enter', code: 'NumpadEnter', repeat: false } as KeyboardEvent;
    const space = { key: ' ', code: 'Space', repeat: false } as KeyboardEvent;
    const other = { key: 'a', code: 'KeyA', repeat: false } as KeyboardEvent;
    expect(isConfirmKey(main)).toBe(true);
    expect(isConfirmKey(num)).toBe(true);
    expect(isConfirmKey(space)).toBe(true);
    expect(isConfirmKey(other)).toBe(false);
    expect(normalizeKeyCode(num)).toBe('Enter');
    expect(normalizeKeyCode(space)).toBe('Space');
    expect(normalizeKeyCode(other)).toBe('KeyA');
  });
});

describe('v1.22.6 Anfitrião wrong offer fails', () => {
  beforeEach(stubStorage);

  it('dialogue fails:true abandons the beat; hush continues', () => {
    const session = new GameSession(3201);
    session.startNew();
    for (const f of ['vip_ok'] as const) session.story.setFlag(f, true);
    session.player.setDistrict('torre-casa');
    expect(session.runStoryBeat('torre-negotiate')).toBe(true);
    const beat = STORY_BEATS.find((b) => b.id === 'torre-negotiate')!;
    const choices = beat.dialogue.find((l) => l.choices?.length)!.choices!;
    expect(choices.filter((c) => c.fails).length).toBe(2);
    expect(choices[0]!.fails).toBeFalsy();
    session.pickDialogueChoice(undefined, 'fail path', true);
    expect(session.ui.get()).toBe('play');
    expect(session.getPendingStoryBeat()).toBeNull();
    // Retry — correct hush continues (no fails).
    expect(session.runStoryBeat('torre-negotiate')).toBe(true);
    session.pickDialogueChoice('neg_hush', 'ok', false);
    expect(session.story.getFlag('neg_hush')).toBe(true);
    expect(session.ui.get()).toBe('dialogue');
  });

  it('negotiate skill still target-only', () => {
    const phase = SKILL_PHASE_TABLE['torre-negotiate']!;
    expect(judgePhase(phase, 0)).toBe(true);
    expect(judgePhase(phase, 1)).toBe(false);
    expect(judgePhase(phase, 2)).toBe(false);
  });
});

describe('v1.22.6 sequence pad order', () => {
  it('mixed color/arrow pad is fixed RGBY + arrows, not sequence order', () => {
    const duel = skillForBet('duelo-casa', 'duel')!;
    const seq = phaseSequence(duel.phases[2]!);
    expect(seq).toEqual(['R', '↑', 'B', '↓']);
    expect(sequencePadKeys(seq)).toEqual(['R', 'G', 'B', 'Y', '↑', '→', '↓', '←']);
    expect(sequencePadKeys(seq).join('')).not.toBe(seq.join(''));
    expect(sequencePadKeys(['↑', '→', '↓', '←'])).toEqual(['↑', '→', '↓', '←']);
    expect(sequencePadKeys(['R', 'B'])).toEqual(['R', 'G', 'B', 'Y']);
  });
});

describe('v1.22.6 exit stand + pt-BR copy', () => {
  beforeEach(() => {
    stubStorage();
    setLocale('pt-BR');
  });

  it('exit stand range is enlarged for Entrar', () => {
    expect(EXIT_STAND_RANGE).toBeGreaterThanOrEqual(2.2);
  });

  it('pt-BR miss zone and viral copy are grammatical', () => {
    expect(t('ui.toast.missedPhaseZoneWide')).toMatch(/mais fácil|zona maior/i);
    expect(t('ui.toast.missedPhaseZoneWide')).not.toMatch(/alargou \/ agulha/);
    expect(t('story.lobby-margin.2.text')).toMatch(/viraliza/);
    expect(t('story.lobby-margin.2.text')).not.toMatch(/viralizar/);
    expect(t('skill.avenida-betrayal.option.1')).not.toMatch(/burner|contato/i);
    expect(t('skill.avenida-betrayal.clue')).not.toMatch(/burner|contato/i);
    expect(t('skill.audiencia-publica.option.1')).not.toMatch(/carimb/i);
    expect(t('skill.audiencia-publica.clue')).not.toMatch(/carimb/i);
  });
});
