/**
 * Playtest #48: rendered UI metrics — panel floor + font × effective scale.
 * Used by e2e to assert what the player actually sees (not raw CSS alone).
 */

/** Minimum panel width for a viewport: desktop ≥55% (capped 720); mobile ≥92vw. */
export function panelWidthFloor(viewportWidth: number): number {
  if (viewportWidth <= 420) {
    return Math.min(720, Math.floor(viewportWidth * 0.92));
  }
  return Math.min(720, Math.floor(viewportWidth * 0.55));
}

/** Computed font-size × ancestor/visual scale → on-screen CSS px. */
export function effectiveFontPx(computedPx: number, scale: number): number {
  return computedPx * (Number.isFinite(scale) && scale > 0 ? scale : 1);
}

/**
 * Walk ancestors collecting CSS transform scale (DOMMatrix).
 * Also folds visualViewport.scale when available.
 */
export function ancestorScale(el: Element): number {
  let scale = 1;
  let node: Element | null = el;
  while (node) {
    const tr = getComputedStyle(node).transform;
    if (tr && tr !== 'none') {
      try {
        const m = new DOMMatrixReadOnly(tr);
        scale *= Math.hypot(m.a, m.b) || 1;
      } catch {
        /* ignore non-2d matrices */
      }
    }
    node = node.parentElement;
  }
  if (typeof window !== 'undefined' && window.visualViewport?.scale) {
    scale *= window.visualViewport.scale;
  }
  return scale;
}
