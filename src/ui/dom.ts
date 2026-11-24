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
  node.hidden = !visible;
  node.setAttribute('aria-hidden', visible ? 'false' : 'true');
}
