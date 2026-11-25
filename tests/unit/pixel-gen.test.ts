import { describe, expect, it } from 'vitest';
import {
  makeAsphalt,
  makeBlocked,
  makeBuilding,
  makeEndingScene,
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
    expect(makePlayerSprite().width).toBe(32);
    expect(makePlayerSprite().height).toBe(54);
    expect(makeNpcSprite('#fff').height).toBe(54);
    expect(makeNpcSprite('#fff', 0, 'seu-ze').height).toBe(58);
    expect(makeNpcSprite('#c8d0d8', 0, 'elevator').height).toBe(54);
    expect(makeAsphalt().pixels.length).toBe(256);
    expect(makePlaza().pixels.length).toBe(256);
    expect(makeStairs().pixels.length).toBe(256);
    expect(makeBuilding(0, 'morro').height).toBeGreaterThan(16);
    expect(makeBuilding(1, 'feira').height).toBeGreaterThan(16);
    expect(makeNeonSign('#ff2bd6').width).toBeGreaterThan(8);
    expect(makeLandmark('led-tower').height).toBeGreaterThan(16);
    expect(makeExitPad().width).toBe(16);
    expect(makeBlocked('torre').pixels.length).toBe(256);
    expect(makeEndingScene().width).toBeGreaterThan(200);
    expect(makePlaza('feira').pixels[0]).toBeDefined();
  });
});
