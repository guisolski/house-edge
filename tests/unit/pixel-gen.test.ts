import { describe, expect, it } from 'vitest';
import {
  makeAsphalt,
  makeBuilding,
  makeExitPad,
  makeLandmark,
  makeNeonSign,
  makeNpcSprite,
  makePlayerSprite,
  makePlaza,
  makeStairs,
} from '../../src/rendering/pixel-gen';

describe('pixel-gen', () => {
  it('builds procedural grids with night cyberpunk accents', () => {
    expect(makePlayerSprite().width).toBe(20);
    expect(makePlayerSprite().height).toBe(34);
    expect(makeNpcSprite('#fff').height).toBe(34);
    expect(makeAsphalt().pixels.length).toBe(256);
    expect(makePlaza().pixels.length).toBe(256);
    expect(makeStairs().pixels.length).toBe(256);
    expect(makeBuilding(0, 'morro').height).toBeGreaterThan(16);
    expect(makeBuilding(1, 'feira').height).toBeGreaterThan(16);
    expect(makeNeonSign('#ff2bd6').width).toBeGreaterThan(8);
    expect(makeLandmark('led-tower').height).toBeGreaterThan(16);
    expect(makeExitPad().width).toBe(16);
  });
});
