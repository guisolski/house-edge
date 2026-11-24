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

export function clearNode(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setVisible(node: HTMLElement, visible: boolean): void {
  // Blur before inert/hide so we never leave focus inside a hidden tree.
  if (!visible && node.contains(document.activeElement)) {
    (document.activeElement as HTMLElement | null)?.blur();
  }
  node.hidden = !visible;
  // Author `display:flex` otherwise overrides the [hidden] UA rule.
  node.style.display = visible ? '' : 'none';
  // Prefer `inert` over aria-hidden to avoid focus-in-hidden warnings.
  node.removeAttribute('aria-hidden');
  if ('inert' in node) {
    (node as HTMLElement & { inert: boolean }).inert = !visible;
  }
}
