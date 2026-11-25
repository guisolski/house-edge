import { describe, expect, it } from 'vitest';
import { buildDistrictMap } from '../../src/world/maps';
import type { PropKind } from '../../src/world/maps';

const DETAIL: PropKind[] = [
  'plant',
  'trash',
  'puddle',
  'graffiti',
  'awning',
  'orelhao',
  'vendor',
];

describe('v1.22 city detail props', () => {
  it('Morro Neon includes Brazilian street detail props', () => {
    const map = buildDistrictMap('morro-neon');
    const kinds = new Set(map.props.map((p) => p.kind));
    for (const k of DETAIL) expect(kinds.has(k)).toBe(true);
    expect(kinds.has('wire')).toBe(true);
    expect(kinds.has('moto')).toBe(true);
  });

  it('Central Fair densifies vendors, awnings, and calçadão props', () => {
    const map = buildDistrictMap('feira-central');
    const kinds = new Set(map.props.map((p) => p.kind));
    expect(kinds.has('vendor')).toBe(true);
    expect(kinds.has('awning')).toBe(true);
    expect(kinds.has('crowd')).toBe(true);
    expect(kinds.has('orelhao')).toBe(true);
  });

  it('Odds Avenue keeps Neon Snap clear while dressing approaches', () => {
    const map = buildDistrictMap('avenida-odds');
    const mid = map.props.filter((p) => p.x >= 12 && p.x <= 34 && p.y >= 11 && p.y <= 12);
    // Mid-lane stay crates/moto only — no dense clutter on the stealth strip.
    expect(
      mid.every((p) => p.kind === 'crate' || p.kind === 'moto' || p.kind === 'lamp'),
    ).toBe(true);
    const kinds = new Set(map.props.map((p) => p.kind));
    expect(kinds.has('puddle')).toBe(true);
    expect(kinds.has('orelhao')).toBe(true);
  });
});
