/** Keep edge-pointer / marker label boxes fully inside the viewport. */

export type LabelBox = {
  text: string;
  left: number;
  width: number;
  cx: number;
};

/**
 * Measure + clamp a centered label so the full box stays in [pad, viewW-pad].
 * Shortens only when the measured width cannot fit even after clamping.
 */
export function layoutMarkerLabel(opts: {
  text: string;
  anchorX: number;
  viewW: number;
  measure: (t: string) => number;
  maxWidth?: number;
  pad?: number;
}): LabelBox {
  const pad = opts.pad ?? 10;
  const maxW = opts.maxWidth ?? 220;
  const avail = Math.max(40, opts.viewW - pad * 2);
  let text = opts.text;
  let width = Math.min(maxW, opts.measure(text) + 14);
  if (width > avail) {
    text = fitText(text, avail - 14, opts.measure);
    width = Math.min(avail, opts.measure(text) + 14);
  }
  let left = opts.anchorX - width / 2;
  if (left < pad) left = pad;
  if (left + width > opts.viewW - pad) left = Math.max(pad, opts.viewW - pad - width);
  return { text, left, width, cx: left + width / 2 };
}

function fitText(text: string, maxInner: number, measure: (t: string) => number): string {
  if (measure(text) <= maxInner) return text;
  let lo = 1;
  let hi = text.length;
  let best = '…';
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = `${text.slice(0, mid)}…`;
    if (measure(candidate) <= maxInner) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
