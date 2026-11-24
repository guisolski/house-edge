import { describe, expect, it } from 'vitest';
import { BETS, getBet } from '../../src/content/bets';
import { CHARACTERS, getCharacter } from '../../src/content/characters';
import { DISTRICTS } from '../../src/content/districts';
import { STORY_BEATS, getBeat } from '../../src/content/story';
import { Palette } from '../../src/content/palette';

describe('content', () => {
  it('has four districts with Brazilian cyberpunk flavor', () => {
    expect(DISTRICTS).toHaveLength(4);
    expect(DISTRICTS[0]?.name).toBe('Morro Neon');
    expect(Palette.brasilGreen).toMatch(/^#/);
  });

  it('wires bets and characters without banned street-lottery lore', () => {
    expect(getBet('laje-lottery')?.kind).toBe('draw');
    expect(getCharacter('luna')?.name).toBe('Luna Pixel');
    const blob = JSON.stringify({ BETS, CHARACTERS, STORY_BEATS });
    expect(blob.toLowerCase()).not.toContain('jogo do bicho');
    expect(blob.toLowerCase()).not.toMatch(/\bbicho\b/);
  });

  it('story beats form a chain from hill to tower', () => {
    expect(getBeat('intro-laje')).toBeDefined();
    expect(STORY_BEATS.some((b) => b.isEnding)).toBe(true);
    expect(STORY_BEATS.every((b) => b.dialogue.length > 0)).toBe(true);
  });
});
