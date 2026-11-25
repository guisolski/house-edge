/** UX-6: D-pad / stick cycles focus inside the active modal. */

export function focusNext(panel: HTMLElement): void {
  const buttons = enabledButtons(panel);
  if (!buttons.length) return;
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = buttons[(i + 1) % buttons.length]!;
  next.focus();
}

export function focusPrev(panel: HTMLElement): void {
  const buttons = enabledButtons(panel);
  if (!buttons.length) return;
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const prev = buttons[(i - 1 + buttons.length) % buttons.length]!;
  prev.focus();
}

export function activateFocused(panel: HTMLElement): void {
  const active = document.activeElement;
  if (active instanceof HTMLButtonElement && panel.contains(active)) {
    active.click();
    return;
  }
  // Do not fall back to buttons[0] — that made Enter on a focused language
  // row (or canvas) start New Game / switch locale by accident (playtest #27).
}

export function enabledButtons(panel: HTMLElement): HTMLButtonElement[] {
  return [...panel.querySelectorAll('button')].filter(
    (b) => !b.disabled && b.dataset.skipNav !== '1',
  ) as HTMLButtonElement[];
}

/**
 * Playtest #34: trap Tab / Shift+Tab inside `panel` (call from a window
 * listener — do not use bindPanelKeydown, which is single-handler).
 */
export function handleTabTrap(panel: HTMLElement | null, ev: KeyboardEvent): boolean {
  if (!panel || panel.hidden || !panel.isConnected) return false;
  if (ev.key !== 'Tab' && ev.code !== 'Tab') return false;
  // Lockpick owns Tab as Submit — do not steal it.
  if (panel.querySelector('.lockpick-pin')) return false;
  const buttons = enabledButtons(panel);
  if (!buttons.length) return false;
  const active = document.activeElement;
  const i = buttons.indexOf(active as HTMLButtonElement);
  // Only trap when Tab would leave the panel (or focus isn't on a button).
  const leaving =
    i < 0 || (!ev.shiftKey && i >= buttons.length - 1) || (ev.shiftKey && i <= 0);
  if (!leaving) return false;
  ev.preventDefault();
  ev.stopPropagation();
  if (ev.shiftKey) focusPrev(panel);
  else focusNext(panel);
  return true;
}
