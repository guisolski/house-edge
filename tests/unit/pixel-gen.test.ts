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
} from '../../src/rendering/pixel-gen';

describe('pixel-gen', () => {
  it('builds procedural grids with brasilidade accents', () => {
    expect(makePlayerSprite().width).toBe(16);
    expect(makeNpcSprite('#fff').height).toBe(24);
    expect(makeAsphalt().pixels.length).toBe(256);
    expect(makePlaza().pixels.length).toBe(256);
    expect(makeBuilding(0).height).toBeGreaterThan(16);
    expect(makeNeonSign('#ff2bd6').width).toBeGreaterThan(8);
    expect(makeLandmark('led-tower').height).toBeGreaterThan(16);
    expect(makeExitPad().width).toBe(16);
  });
});
