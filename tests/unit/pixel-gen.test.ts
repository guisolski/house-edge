import { describe, expect, it } from 'vitest';
import {
  makeBoteco,
  makeNeonSign,
  makeNpcSprite,
  makePlayerSprite,
  makeTileFloor,
} from '../../src/rendering/pixel-gen';

describe('pixel-gen', () => {
  it('builds procedural grids with brasilidade accents', () => {
    expect(makePlayerSprite().width).toBe(12);
    expect(makeNpcSprite('#fff').height).toBe(16);
    expect(makeTileFloor(0).pixels.length).toBe(256);
    expect(makeTileFloor(1).pixels.length).toBe(256);
    expect(makeTileFloor(2).pixels.length).toBe(256);
    expect(makeNeonSign().width).toBe(24);
    expect(makeBoteco().height).toBe(20);
  });
});
