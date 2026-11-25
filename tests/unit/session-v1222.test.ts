import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { EXIT_STAND_RANGE } from '../../src/systems/interaction';
import { setLocale } from '../../src/i18n';

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

describe('v1.22.2 Enter rematch + exit pad + beaten NPC', () => {
  beforeEach(stubStorage);

  it('after skill, Enter/Space stay blocked; KeyE clears rematch gate', () => {
    const session = new GameSession(2801);
    session.startNew();
    session.player.setPosition(13, 16);
    session.interact();
    session.pickDialogueChoice();
    session.acceptStoryBet();
    expect(session.completeSkillPerfect()).toBe(true);

    session.noteInteractPressed('Enter');
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 2000);
    session.noteInteractPressed('Enter');
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    session.noteInteractPressed('Space');
    expect(session.allowInteractInput()).toBe(false);
    session.noteInteractRelease();
    session.noteInteractPressed('KeyE');
    expect(session.allowInteractInput()).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('beaten story NPC shows done dialogue instead of rematch bet', () => {
    const session = new GameSession(2802);
    session.startNew();
    session.player.setPosition(13, 16);
    session.interact();
    session.pickDialogueChoice();
    session.acceptStoryBet();
    expect(session.completeSkillPerfect()).toBe(true);
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 500);
    session.noteInteractPressed('KeyE');
    expect(session.allowInteractInput()).toBe(true);
    expect(session.interact(true)).toBe(true);
    vi.spyOn(Date, 'now').mockRestore();
    expect(session.ui.is('dialogue')).toBe(true);
    expect(session.ui.is('bet')).toBe(false);
    expect(session.ui.is('skill')).toBe(false);
    const line = session.getDialogue()[0]?.text ?? '';
    expect(line.length).toBeGreaterThan(8);
    expect(line).not.toMatch(/Ice-cold water|Onboarding timing/i);
  });

  it('epilogue Saúde closing line localizes in pt-BR', () => {
    setLocale('pt-BR');
    const session = new GameSession(2804);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    session.runStoryBeat('epilogue-laje');
    session.pickDialogueChoice('keep_signal', 'reply');
    const line = session.getDialogue()[0]?.text ?? '';
    expect(line).toMatch(/créditos|cidade/i);
    expect(line).not.toMatch(/The credits roll for everyone/i);
    setLocale('en');
  });

  it('exit stand range covers the painted pad (~1.85 tiles)', () => {
    expect(EXIT_STAND_RANGE).toBeGreaterThanOrEqual(1.7);
    const session = new GameSession(2803);
    session.startNew();
    session.world.unlock('feira-central');
    session.player.setPosition(37, 22);
    expect(session.nearbyExit()?.toDistrict).toBe('feira-central');
    session.player.setPosition(38, 21);
    expect(session.nearbyExit()?.toDistrict).toBe('feira-central');
    session.player.setPosition(35, 22);
    expect(session.nearbyExit()).toBeNull();
  });
});
