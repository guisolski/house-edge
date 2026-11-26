import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { formatSkillResultHeadline } from '../../src/systems/skill-result-format';
import { setLocale, t } from '../../src/i18n';
import { DEBUG_CHAPTERS, parseDebugChapter } from '../../src/systems/debug-chapter';

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

describe('v1.22.20 playtest #44', () => {
  beforeEach(stubStorage);

  it('lose headline omits credits when delta is 0 (never em dash)', () => {
    setLocale('pt-BR');
    const text = formatSkillResultHeadline(false, 0, 0);
    expect(text).not.toMatch(/—/);
    expect(text).not.toMatch(/\bcr\b/i);
    expect(text).toMatch(/Falhou/);
    expect(text).toMatch(/0 rep/);
    setLocale('en');
    const en = formatSkillResultHeadline(false, 0, -1);
    expect(en).not.toMatch(/—/);
    expect(en).toMatch(/Failed/);
    expect(en).toMatch(/-1 rep/);
  });

  it('lose headline shows signed credit loss when charged', () => {
    setLocale('en');
    expect(formatSkillResultHeadline(false, -40, -1)).toBe('Failed · −40 cr · -1 rep');
    setLocale('pt-BR');
    expect(formatSkillResultHeadline(false, -40, 0)).toBe('Falhou · −40 cr · 0 rep');
  });

  it('win headline covers +credits and zero-credit +rep paths', () => {
    setLocale('en');
    expect(formatSkillResultHeadline(true, 25, 3)).toBe('Win · +25 cr · +3 rep');
    expect(formatSkillResultHeadline(true, 0, 0)).toBe('Win · 0 cr · 0 rep');
  });

  it('debug chapters cover feira|avenida|torre|vip|epilogue', () => {
    expect(Object.keys(DEBUG_CHAPTERS).sort()).toEqual(
      ['avenida', 'epilogue', 'feira', 'torre', 'vip'].sort(),
    );
  });

  it('parseDebugChapter trims and rejects empty', () => {
    expect(parseDebugChapter('  Torre ')).toBe('torre');
    expect(parseDebugChapter('')).toBe(null);
    expect(parseDebugChapter(null)).toBe(null);
    expect(parseDebugChapter(undefined)).toBe(null);
  });

  it('debugStartChapter(feira) unlocks Fair with credits + flags', () => {
    const session = new GameSession();
    expect(session.debugStartChapter('feira')).toBe(true);
    expect(session.player.getStats().districtId).toBe('feira-central');
    expect(session.player.getStats().credits).toBeGreaterThanOrEqual(200);
    expect(session.story.getFlag('unlocked_feira')).toBe(true);
    expect(session.world.isUnlocked('feira-central')).toBe(true);
    expect(session.ui.is('play')).toBe(true);
  });

  it('debugStartChapter(vip) lands on VIP floor', () => {
    const session = new GameSession();
    expect(session.debugStartChapter('vip')).toBe(true);
    expect(session.player.getStats().districtId).toBe('torre-casa');
    expect(session.isVipFloor()).toBe(true);
    expect(session.story.getFlag('elevator_ok')).toBe(true);
  });

  it('debugStartChapter(epilogue) unlocks free roam without ending gate', () => {
    const session = new GameSession();
    expect(session.debugStartChapter('epilogue')).toBe(true);
    expect(session.story.getFlag('casa_quebrada')).toBe(true);
    expect(session.story.getFlag('free_roam')).toBe(true);
    expect(session.ui.is('play')).toBe(true);
    expect(session.ui.is('ending')).toBe(false);
  });

  it('unknown chapter returns false', () => {
    const session = new GameSession();
    session.startNew();
    expect(session.debugStartChapter('nope')).toBe(false);
  });

  it('i18n lose-no-credits strings exist', () => {
    setLocale('en');
    expect(t('ui.skill.resultLoseNoCredits')).toMatch(/Failed/);
    setLocale('pt-BR');
    expect(t('ui.skill.resultLoseNoCredits')).toMatch(/Falhou/);
  });
});
