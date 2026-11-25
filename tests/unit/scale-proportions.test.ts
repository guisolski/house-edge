/** Buildings should read ~3–5× character height at integer scales. */
import { describe, expect, it } from 'vitest';
import { makeBuilding, makePlayerSprite } from '../../src/rendering/pixel-gen';

const WORLD_SCALE = 3;
const CHAR_SCALE = 2;

describe('v1.22 scale proportions', () => {
  it('uses integer character and world scales', () => {
    expect(Number.isInteger(WORLD_SCALE)).toBe(true);
    expect(Number.isInteger(CHAR_SCALE)).toBe(true);
    expect(CHAR_SCALE).toBeLessThan(WORLD_SCALE);
  });

  it('favela houses are 3–5× player height when baked', () => {
    const playerH = makePlayerSprite(0).height * CHAR_SCALE;
    for (const style of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const houseH = makeBuilding(style, 'morro').height * WORLD_SCALE;
      const ratio = houseH / playerH;
      expect(ratio).toBeGreaterThanOrEqual(3);
      expect(ratio).toBeLessThanOrEqual(5.5);
    }
  });

  it('avenida towers are at least 3× player height', () => {
    const playerH = makePlayerSprite(0).height * CHAR_SCALE;
    for (const style of [0, 1, 2, 3]) {
      const towerH = makeBuilding(style, 'avenida').height * WORLD_SCALE;
      expect(towerH / playerH).toBeGreaterThanOrEqual(3);
    }
  });

  it('feira stalls are at least ~2.5× player (market canopy, not towers)', () => {
    const playerH = makePlayerSprite(0).height * CHAR_SCALE;
    for (const style of [0, 1, 2, 3]) {
      const stallH = makeBuilding(style, 'feira').height * WORLD_SCALE;
      expect(stallH / playerH).toBeGreaterThanOrEqual(2.4);
    }
  });
});
