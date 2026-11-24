import { Actions, type ActionName, type ActionState } from './actions';

const KEY_MAP: Record<string, ActionName> = {
  ArrowUp: Actions.Up,
  KeyW: Actions.Up,
  ArrowDown: Actions.Down,
  KeyS: Actions.Down,
  ArrowLeft: Actions.Left,
  KeyA: Actions.Left,
  ArrowRight: Actions.Right,
  KeyD: Actions.Right,
  KeyE: Actions.Interact,
  Space: Actions.Interact,
  KeyF: Actions.Bet,
  Escape: Actions.Menu,
  KeyM: Actions.Mute,
};

export function applyKey(
  state: ActionState,
  code: string,
  pressed: boolean,
): ActionName | null {
  const action = KEY_MAP[code];
  if (!action) return null;
  state[action] = pressed;
  return action;
}

export function bindKeyboard(
  target: Window,
  state: ActionState,
  onAction: (action: ActionName, pressed: boolean) => void,
): () => void {
  const down = makeHandler(state, onAction, true);
  const up = makeHandler(state, onAction, false);
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
  };
}

function makeHandler(
  state: ActionState,
  onAction: (action: ActionName, pressed: boolean) => void,
  pressed: boolean,
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent): void => {
    const action = applyKey(state, e.code, pressed);
    if (!action) return;
    if (pressed) e.preventDefault();
    onAction(action, pressed);
  };
}
