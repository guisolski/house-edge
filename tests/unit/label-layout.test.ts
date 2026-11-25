import { describe, expect, it } from 'vitest';
import { layoutMarkerLabel } from '../../src/rendering/label-layout';

describe('layoutMarkerLabel', () => {
  const measure = (t: string): number => t.length * 8;

  it('clamps the full label box inside the viewport on the right edge', () => {
    const box = layoutMarkerLabel({
      text: 'Casa Tower · 12m',
      anchorX: 940,
      viewW: 960,
      measure,
    });
    expect(box.left).toBeGreaterThanOrEqual(10);
    expect(box.left + box.width).toBeLessThanOrEqual(950);
    expect(box.text.includes('…') || box.text.includes('Casa')).toBe(true);
  });

  it('clamps the full label box inside the viewport on the left edge', () => {
    const box = layoutMarkerLabel({
      text: 'Central Fair · 8m',
      anchorX: 12,
      viewW: 960,
      measure,
    });
    expect(box.left).toBeGreaterThanOrEqual(10);
    expect(box.left + box.width).toBeLessThanOrEqual(950);
    expect(box.text).toContain('Central');
  });

  it('shortens only when text cannot fit the available width', () => {
    const box = layoutMarkerLabel({
      text: 'A very long destination name that must shrink',
      anchorX: 480,
      viewW: 200,
      measure,
      maxWidth: 400,
    });
    expect(box.width).toBeLessThanOrEqual(180);
    expect(box.left + box.width).toBeLessThanOrEqual(190);
  });
});
