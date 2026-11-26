export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const PANEL_ABORT = '__heAbort';
const PANEL_DISPOSE = '__heDispose';

type PanelBag = Record<string, AbortController | (() => void)[] | undefined>;

/** Register cleanup that runs on the next clearNode (intervals, window listeners). */
export function onPanelDispose(panel: HTMLElement, fn: () => void): void {
  const bag = panel as unknown as PanelBag;
  const list = (bag[PANEL_DISPOSE] as (() => void)[] | undefined) ?? [];
  list.push(fn);
  bag[PANEL_DISPOSE] = list;
}

/** Abort prior panel key hooks + dispose callbacks when a panel is repainted. */
export function clearNode(node: HTMLElement): void {
  const bag = node as unknown as PanelBag;
  (bag[PANEL_ABORT] as AbortController | undefined)?.abort();
  delete bag[PANEL_ABORT];
  const disposers = bag[PANEL_DISPOSE] as (() => void)[] | undefined;
  if (disposers) {
    for (const fn of disposers) fn();
    delete bag[PANEL_DISPOSE];
  }
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Bind a keydown listener that dies when the panel is cleared or detached. */
export function bindPanelKeydown(
  panel: HTMLElement,
  handler: (ev: KeyboardEvent) => void,
  capture = false,
): void {
  const ac = new AbortController();
  const bag = panel as unknown as Record<string, AbortController | undefined>;
  bag[PANEL_ABORT]?.abort();
  bag[PANEL_ABORT] = ac;
  window.addEventListener(
    'keydown',
    (ev) => {
      if (!panel.isConnected) {
        ac.abort();
        return;
      }
      handler(ev);
    },
    { capture, signal: ac.signal },
  );
}

export function setVisible(node: HTMLElement, visible: boolean): void {
  // Blur before hide so we never leave focus inside a hidden tree.
  if (!visible && node.contains(document.activeElement)) {
    (document.activeElement as HTMLElement | null)?.blur();
  }
  node.hidden = !visible;
  // Author `display:flex` otherwise overrides the [hidden] UA rule.
  node.style.display = visible ? '' : 'none';
  // Never use aria-hidden on panels — it fights focused descendants.
  node.removeAttribute('aria-hidden');
  // Prefer plain hidden/display over inert when hiding; inert still warns
  // in Chromium if focus is mid-transition. Clear inert when showing.
  if ('inert' in node) {
    (node as HTMLElement & { inert: boolean }).inert = false;
  }
}
