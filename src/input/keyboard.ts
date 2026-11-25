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
  Enter: Actions.Interact,
  // Playtest #32: laptop Enter and numpad Enter both confirm.
  NumpadEnter: Actions.Interact,
  KeyF: Actions.Bet,
  Escape: Actions.Menu,
  Backspace: Actions.Menu,
  KeyM: Actions.Mute,
  ShiftLeft: Actions.Run,
  ShiftRight: Actions.Run,
};

/** Normalize so callers can treat main + numpad Enter the same. */
export function normalizeKeyCode(e: KeyboardEvent): string {
  if (e.key === 'Enter' || e.code === 'NumpadEnter') return 'Enter';
  if (e.key === ' ' || e.code === 'Space') return 'Space';
  return e.code;
}

/** True for confirm keys — use event.key so NumpadEnter counts (playtest #32). */
export function isConfirmKey(e: KeyboardEvent): boolean {
  return e.key === 'Enter' || e.key === ' ' || e.code === 'Space';
}

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
  onAction: (action: ActionName, pressed: boolean, code: string) => void,
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
  onAction: (action: ActionName, pressed: boolean, code: string) => void,
  pressed: boolean,
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent): void => {
    // Ignore OS key-repeat — held Enter/E must not spam interact/confirm.
    if (pressed && e.repeat) return;
    const code = normalizeKeyCode(e);
    const action = applyKey(state, code, pressed);
    if (!action) return;
    if (pressed) e.preventDefault();
    onAction(action, pressed, code);
  };
}
