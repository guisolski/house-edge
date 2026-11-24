import { el } from './dom';
import { applyTouch, listTouchControls, type TouchControlId } from '../input/touch';
import type { ActionState } from '../input/actions';
import type { EventBus } from '../core/event-bus';

export function mountTouchControls(
  mount: HTMLElement,
  state: ActionState,
  bus: EventBus,
): HTMLElement {
  const root = el('div', 'touch-controls');
  for (const id of listTouchControls()) {
    root.appendChild(makePad(id, state, bus));
  }
  mount.appendChild(root);
  return root;
}

function makePad(
  id: TouchControlId,
  state: ActionState,
  bus: EventBus,
): HTMLButtonElement {
  const btn = el('button', `touch ${id}`, labelFor(id));
  btn.type = 'button';
  const press = (pressed: boolean): void => {
    const action = applyTouch(state, id, pressed);
    bus.emit('input:action', { action, pressed });
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    press(true);
  });
  btn.addEventListener('pointerup', () => press(false));
  btn.addEventListener('pointerleave', () => press(false));
  return btn;
}

function labelFor(id: TouchControlId): string {
  const map: Record<TouchControlId, string> = {
    'pad-up': '▲',
    'pad-down': '▼',
    'pad-left': '◀',
    'pad-right': '▶',
    'btn-interact': 'E',
    'btn-bet': 'F',
    'btn-menu': '☰',
  };
  return map[id];
}
