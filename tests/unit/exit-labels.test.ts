import { describe, expect, it } from 'vitest';
import { districtExits } from '../../src/systems/interaction';
import { buildDistrictMap } from '../../src/world/maps';
import { DISTRICTS } from '../../src/content/districts';

const DEST_WORD: Record<string, string> = {
  'feira-central': 'Central Fair',
  'morro-neon': 'Morro Neon',
  'avenida-odds': 'Odds Avenue',
  'torre-casa': 'Casa Tower',
};

describe('exit pad labels match destinations', () => {
  it('every exit label and nearby sign name the destination district', () => {
    const exits = districtExits();
    expect(exits.length).toBeGreaterThanOrEqual(6);
    for (const exit of exits) {
      const word = DEST_WORD[exit.toDistrict];
      expect(word, exit.id).toBeTruthy();
      expect(exit.label, exit.id).toContain(word!);
      const map = buildDistrictMap(exit.districtId);
      const sign = map.signs.find(
        (s) =>
          (s.label.startsWith('>') || s.label.startsWith('EXIT')) &&
          Math.hypot(s.x - exit.x, s.y - exit.y) <= 3.5,
      );
      expect(sign, `${exit.id} missing sign`).toBeTruthy();
      expect(sign!.label, exit.id).toContain(word!);
    }
  });

  it('district names used in DEST_WORD cover every district id', () => {
    for (const d of DISTRICTS) {
      expect(DEST_WORD[d.id]).toBeTruthy();
    }
  });
});
