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
    // From (2,4) toward NE (3,3) blocked → slide east to (3,4).
    expect(slideStep(toy, 2, 4, 1, -1)).toEqual({ x: 3, y: 4 });
    // Block the east axis so fallback uses the north/south axis instead.
    const tight = toySlideMap();
    tight.tiles[4 * tight.width + 3] = 'blocked';
    expect(slideStep(tight, 2, 4, 1, -1)).toEqual({ x: 2, y: 3 });
    // Both axes blocked → null.
    tight.tiles[3 * tight.width + 2] = 'blocked';
    expect(slideStep(tight, 2, 4, 1, -1)).toBeNull();
  });

  it('corner-slips east around a blocked cell', () => {
    const step = slideStep(toy, 2, 3, 1, 0);
    expect(step).toEqual({ x: 3, y: 2 });
  });

  it('corner-slips south around a blocked cell', () => {
    const step = slideStep(toy, 2, 3, 0, 1);
    // (2,4) is open directly — takes direct.
    expect(step).toEqual({ x: 2, y: 4 });
  });

  it('returns null when every slip is blocked', () => {
    expect(slideStep(toy, 1, minY, -1, 0)).toBeNull();
  });
});
