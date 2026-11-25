/** Losing Nair's ice pour must not set falou_nair / advance the objective. */
import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/systems/session';

describe('Nair bet lose keeps objective', () => {
  it('finishSkill(false) leaves falou_nair unset and objective on Nair', () => {
    const s = new GameSession(26);
    s.startNew();
    s.story.setFlag('conheceu_rita', true);
    expect(s.runStoryBeat('boteco-nair')).toBe(true);
    s.pickDialogueChoice('rita_loud', 'ok');
    expect(s.acceptStoryBet()).toBe(true);
    const box = s as unknown as { finishSkill: (won: boolean) => boolean };
    expect(box.finishSkill(false)).toBe(true);
    expect(s.story.getFlag('falou_nair')).toBe(false);
    expect(s.story.getCompleted().includes('boteco-nair')).toBe(false);
    const obj = s.objective();
    expect(obj.targetName).toMatch(/Nair/i);
  });
});
