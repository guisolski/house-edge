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

function enabledButtons(panel: HTMLElement): HTMLButtonElement[] {
  return [...panel.querySelectorAll('button')].filter(
    (b) => !b.disabled && b.dataset.skipNav !== '1',
  ) as HTMLButtonElement[];
}
