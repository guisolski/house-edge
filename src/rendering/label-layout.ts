/** Keep edge-pointer / marker label boxes fully inside the viewport. */

export type LabelBox = {
  text: string;
  left: number;
  width: number;
  cx: number;
};

/**
 * When an objective / name tag sits on a neon sign, push the label up
 * (or hide it) so "Dancer Sol" doesn't cover "ODDS 24H".
 * Also hides when the estimated tag AABB would still intersect a sign.
 */
export function labelOffsetForSigns(opts: {
  tileX: number;
  tileY: number;
  signs: readonly { x: number; y: number; label?: string }[];
  nearTiles?: number;
  tagText?: string;
  camX?: number;
  camY?: number;
}): { dy: number; hideLabel: boolean } {
  const near = opts.nearTiles ?? 3.2;
  let closest = Infinity;
  for (const s of opts.signs) {
    const d = Math.hypot(s.x - opts.tileX, s.y - opts.tileY);
    if (d < closest) closest = d;
  }
  if (closest > near) {
    // Still hide if the floating tag AABB would cover a distant-but-wide sign.
    if (opts.tagText && tagWouldHitSign(opts)) {
      return { dy: -56, hideLabel: true };
    }
    return { dy: 0, hideLabel: false };
  }
  // Near neon / EXIT signs — hide the floating name (signs win).
  if (closest < 2.8) return { dy: -56, hideLabel: true };
  if (opts.tagText && tagWouldHitSign({ ...opts, dyProbe: -48 })) {
    return { dy: -56, hideLabel: true };
  }
  return { dy: -48, hideLabel: false };
}

function tagWouldHitSign(opts: {
  tileX: number;
  tileY: number;
  signs: readonly { x: number; y: number; label?: string }[];
  tagText?: string;
  camX?: number;
  camY?: number;
  dyProbe?: number;
}): boolean {
  if (!opts.tagText) return false;
  const tag = estimateTagBox({
    tileX: opts.tileX,
    tileY: opts.tileY,
    text: opts.tagText,
    camX: opts.camX,
    camY: opts.camY,
    dy: opts.dyProbe ?? 0,
  });
  for (const s of opts.signs) {
    const sign = estimateSignBox({
      tileX: s.x,
      tileY: s.y,
      label: s.label ?? 'SIGN',
      camX: opts.camX,
      camY: opts.camY,
    });
    if (boxesIntersect(tag, sign)) return true;
  }
  return false;
}

/** Axis-aligned box in screen/canvas space. */
export type ScreenBox = { left: number; top: number; width: number; height: number };

export function boxesIntersect(a: ScreenBox, b: ScreenBox): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

/**
 * Estimate a floating name-tag box above a tile (matches paintMarkerLabel layout).
 */
export function estimateTagBox(opts: {
  tileX: number;
  tileY: number;
  text: string;
  camX?: number;
  camY?: number;
  tilePx?: number;
  dy?: number;
}): ScreenBox {
  const tilePx = opts.tilePx ?? 32;
  const camX = opts.camX ?? 0;
  const camY = opts.camY ?? 0;
  const dy = opts.dy ?? 0;
  const width = Math.min(220, Math.max(40, opts.text.length * 7 + 14));
  const height = 18;
  const cx = opts.tileX * tilePx + 16 - camX;
  const top = opts.tileY * tilePx - 28 - camY + dy - height;
  return { left: cx - width / 2, top, width, height };
}

/** Approximate neon sign screen box (baked sign ~ label width, scaled draw). */
export function estimateSignBox(opts: {
  tileX: number;
  tileY: number;
  label: string;
  camX?: number;
  camY?: number;
  tilePx?: number;
}): ScreenBox {
  const tilePx = opts.tilePx ?? 32;
  const camX = opts.camX ?? 0;
  const camY = opts.camY ?? 0;
  // Live signs bake at ~2× — keep estimate a bit wide so tests catch clashes.
  const width = Math.max(56, opts.label.length * 9 + 20);
  const height = 26;
  const left = opts.tileX * tilePx - camX;
  const top = opts.tileY * tilePx - 10 - camY;
  return { left, top, width, height };
}

/** NPC sprite body footprint (feet on tile, sprite extends upward). */
export function estimateSpriteBox(opts: {
  tileX: number;
  tileY: number;
  camX?: number;
  camY?: number;
  tilePx?: number;
}): ScreenBox {
  const tilePx = opts.tilePx ?? 32;
  const camX = opts.camX ?? 0;
  const camY = opts.camY ?? 0;
  const width = 28;
  const height = 40;
  const left = opts.tileX * tilePx + 2 - camX;
  const top = opts.tileY * tilePx - (height - tilePx) - camY;
  return { left, top, width, height };
}

/** E-prompt / interact tooltip anchored above a world tile (player or NPC). */
export function estimatePromptBox(opts: {
  tileX: number;
  tileY: number;
  text: string;
  camX?: number;
  camY?: number;
  tilePx?: number;
}): ScreenBox {
  const tilePx = opts.tilePx ?? 32;
  const camX = opts.camX ?? 0;
  const camY = opts.camY ?? 0;
  const width = Math.min(240, Math.max(48, opts.text.length * 7 + 18));
  const height = 22;
  const cx = opts.tileX * tilePx + 16 - camX;
  const top = opts.tileY * tilePx - 36 - camY - height;
  return { left: cx - width / 2, top, width, height };
}

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
