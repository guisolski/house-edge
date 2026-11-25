import { describe, expect, it } from 'vitest';
import { slideStep, toySlideMap } from '../../src/world/slide';
import { buildDistrictMap } from '../../src/world/maps';
import { minPlayerTileY } from '../../src/world/camera';

describe('slideStep', () => {
  const map = buildDistrictMap('morro-neon');
  const minY = minPlayerTileY(48);
  const toy = toySlideMap();

  it('returns null for zero delta and HUD-clamped north', () => {
    expect(slideStep(map, 8, 15, 0, 0)).toBeNull();
    expect(slideStep(map, 8, minY, 0, -1)).toBeNull();
  });

  it('moves into an open neighbour', () => {
    expect(slideStep(map, 8, 15, 1, 0)).toEqual({ x: 9, y: 15 });
  });

  it('axis-falls-back when diagonal is blocked', () => {
    // Clear default (3,5) block; block only NE cell (3,4).
    const neo = toySlideMap();
    neo.tiles[5 * neo.width + 3] = 'asphalt';
    neo.tiles[4 * neo.width + 3] = 'blocked';
    expect(slideStep(neo, 2, 5, 1, -1)).toEqual({ x: 3, y: 5 });
    // Also block east so fallback uses the north axis.
    neo.tiles[5 * neo.width + 3] = 'blocked';
    expect(slideStep(neo, 2, 5, 1, -1)).toEqual({ x: 2, y: 4 });
    // Both axes blocked → null.
    neo.tiles[4 * neo.width + 2] = 'blocked';
    expect(slideStep(neo, 2, 5, 1, -1)).toBeNull();
  });

  it('corner-slips east around a blocked cell', () => {
    // Default toy blocks (3,5); east from (2,5) slips to (3,4) or (3,6).
    const step = slideStep(toy, 2, 5, 1, 0);
    expect(step).toEqual({ x: 3, y: 4 });
  });

  it('corner-slips south around a blocked cell', () => {
    const step = slideStep(toy, 2, 5, 0, 1);
    expect(step).toEqual({ x: 2, y: 6 });
  });

  it('returns null when every slip is blocked', () => {
    expect(slideStep(toy, 1, minY, -1, 0)).toBeNull();
  });
});
