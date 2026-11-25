import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import {
  attemptSkill,
  encodePins,
  phasePins,
  startSkill,
  skillForBet,
} from '../../src/systems/minigame';
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

describe('v1.22.7 Gaiola lockpick', () => {
  it('has decodeable pins and no hidden tumbler', () => {
    const phase = SKILL_PHASE_TABLE['avenida-server']!;
    expect(phase.pins).toEqual([2, 0, 1, 2]);
    expect(phase.hiddenPin).toBeUndefined();
    expect(phase.clue).toMatch(/outer posts|full stack|flush|one click/i);
  });

  it('wrong guess keeps encounter open with pick durability', () => {
    const def = skillForBet('avenida-server', 'lockpick')!;
    let p = startSkill(def);
    const wrong = encodePins([0, 0, 0, 0]);
    p = attemptSkill(p, { phaseIndex: 0, value: wrong });
    expect(p.done).toBe(false);
    expect(p.misses).toBe(1);
    expect(p.pickLeft).toBe((def.phases[0]!.pickDurability ?? 1) - 1);
    const ok = encodePins(phasePins(def.phases[0]!));
    p = attemptSkill(p, { phaseIndex: 0, value: ok });
    expect(p.done).toBe(true);
    expect(p.won).toBe(true);
  });
});

describe('v1.22.7 modal gate + Viajar', () => {
  beforeEach(stubStorage);

  it('clearModalConfirmGate lets confirm through immediately', () => {
    const session = new GameSession(1227);
    session.startNew();
    session.noteModalOpened(true);
    expect(session.allowModalConfirm()).toBe(false);
    session.clearModalConfirmGate();
    expect(session.allowModalConfirm()).toBe(true);
  });
});

describe('v1.22.7 pt-BR copy', () => {
  beforeEach(() => {
    stubStorage();
    setLocale('pt-BR');
  });

  it('drops travado / confusing copper / awkward influencer lines', () => {
    expect(t('story.boteco-nair.1.choice.0.reply')).not.toMatch(/travado|loop no menu/i);
    expect(t('story.luna-beco.2.text')).not.toMatch(/Cobre com o Catador/i);
    expect(t('story.avenida-courier.2.text')).not.toMatch(/aí o influenciador ainda/i);
    expect(t('ui.minigameTip.puzzle')).toMatch(/pista/i);
  });
});
