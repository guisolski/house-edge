import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import {
  SEQ_REVEAL_STEP_MS,
  SEQ_FULL_HOLD_MS,
  sequenceRevealMs,
} from '../../src/systems/minigame';
import {
  startSequenceReveal,
  tickSequenceReveal,
} from '../../src/systems/sequence-reveal';
import {
  formatLockpickPinVerdict,
  formatLockpickVerdictLine,
} from '../../src/systems/skill-result-format';
import { currentObjective } from '../../src/systems/objectives';
import { STORY_BEATS } from '../../src/content/story';
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

describe('v1.22.21 sequence full-hold', () => {
  it('holds the full sequence ≥2s before input arms', () => {
    expect(SEQ_FULL_HOLD_MS).toBeGreaterThanOrEqual(2000);
    expect(sequenceRevealMs(3)).toBe(2 * SEQ_REVEAL_STEP_MS + SEQ_FULL_HOLD_MS);
    const seq = ['↑', '→', '↓'] as const;
    let state = startSequenceReveal([...seq], 0);
    state = tickSequenceReveal(state, SEQ_REVEAL_STEP_MS, SEQ_REVEAL_STEP_MS);
    expect(state.shown).toBe(2);
    state = tickSequenceReveal(state, 2 * SEQ_REVEAL_STEP_MS, SEQ_REVEAL_STEP_MS);
    expect(state.shown).toBe(3);
    expect(state.done).toBe(false);
    state = tickSequenceReveal(
      state,
      2 * SEQ_REVEAL_STEP_MS + SEQ_FULL_HOLD_MS - 1,
      SEQ_REVEAL_STEP_MS,
    );
    expect(state.done).toBe(false);
    state = tickSequenceReveal(
      state,
      2 * SEQ_REVEAL_STEP_MS + SEQ_FULL_HOLD_MS,
      SEQ_REVEAL_STEP_MS,
    );
    expect(state.done).toBe(true);
  });
});

describe('v1.22.21 lockpick + fail card', () => {
  beforeEach(stubStorage);

  it('lockpick verdict line is plain (no colon-heavy toast style)', () => {
    setLocale('pt-BR');
    expect(formatLockpickVerdictLine(['low', 'low', 'ok'])).toBe(
      'Pino 1 baixo, Pino 2 baixo, Pino 3 certo',
    );
    setLocale('en');
    expect(formatLockpickVerdictLine(['high', 'ok', 'low'])).toBe(
      'Pin 1 high, Pin 2 set, Pin 3 low',
    );
  });

  it('lockpick pin chips cover ok/low/high/empty', () => {
    setLocale('en');
    expect(formatLockpickPinVerdict('ok')).toBe(t('ui.skill.pinChipOk'));
    expect(formatLockpickPinVerdict('low')).toBe(t('ui.skill.pinChipLow'));
    expect(formatLockpickPinVerdict('high')).toBe(t('ui.skill.pinChipHigh'));
    expect(formatLockpickPinVerdict(undefined)).toBe('');
  });

  it('sequence encounter fail always leaves a result banner', () => {
    const session = new GameSession();
    session.startNew();
    session.player.addCredits(200);
    expect(session.forceStorySkill('feira-radio')).toBe(true);
    let guard = 0;
    while (session.getSkillProgress() && !session.getSkillResult() && guard < 30) {
      guard += 1;
      session.submitSkill(0);
    }
    const result = session.getSkillResult();
    expect(result).toBeTruthy();
    expect(result!.won).toBe(false);
  });
});

describe('v1.22.21 VIP · toast · credits', () => {
  beforeEach(stubStorage);

  it('VIP host beats show 1/2 then 2/2 in objective detail', () => {
    setLocale('pt-BR');
    const throughElevator = STORY_BEATS.map((b) => b.id).slice(
      0,
      STORY_BEATS.findIndex((b) => b.id === 'torre-vip'),
    );
    const base = {
      beats: STORY_BEATS,
      completed: throughElevator,
      flags: (f: string) =>
        [
          'unlocked_torre',
          'escandalo_aberto',
          'foyer_ok',
          'pit_ok',
          'elevator_ok',
        ].includes(f),
      districtId: 'torre-casa',
      npcs: [
        {
          id: 'vip-host',
          name: 'Anfitrião VIP',
          x: 10,
          y: 10,
          districtId: 'torre-casa' as const,
          beatId: 'torre-vip',
          floor: 'vip' as const,
          color: '#ffdf00',
        },
      ],
      allNpcs: [] as never[],
      vipFloor: true,
      exits: [] as never[],
      unlocked: () => true,
    };
    expect(currentObjective(base).detail).toMatch(/1\s*\/\s*2/);
    const neg = currentObjective({
      ...base,
      completed: [...throughElevator, 'torre-vip'],
      flags: (f: string) =>
        [
          'unlocked_torre',
          'escandalo_aberto',
          'foyer_ok',
          'pit_ok',
          'elevator_ok',
          'vip_ok',
        ].includes(f),
      npcs: [
        {
          id: 'vip-host',
          name: 'Anfitrião VIP',
          x: 10,
          y: 10,
          districtId: 'torre-casa' as const,
          beatId: 'torre-negotiate',
          extraBeatIds: ['torre-negotiate'],
          floor: 'vip' as const,
          color: '#ffdf00',
        },
      ],
    });
    expect(neg.detail).toMatch(/2\s*\/\s*2/);
    expect(neg.detail).toMatch(/Negociar/i);
  });

  it('debugStartChapter toasts the live objective, not Find Nair', () => {
    const session = new GameSession();
    const toasts: string[] = [];
    session.bus.on('ui:toast', (p) => toasts.push(p.message));
    expect(session.debugStartChapter('avenida')).toBe(true);
    const last = toasts[toasts.length - 1] ?? '';
    expect(last).not.toBe(t('ui.findNairToast'));
    expect(last.length).toBeGreaterThan(0);
    expect(last).toBe(session.objective().text);
  });

  it('credits roll has no em-dash placeholder line', () => {
    setLocale('en');
    expect(t('ui.credits.line.8')).not.toBe('—');
    setLocale('pt-BR');
    expect(t('ui.credits.line.8')).not.toBe('—');
  });
});
