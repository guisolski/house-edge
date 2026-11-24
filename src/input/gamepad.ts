import { Actions, type ActionName, type ActionState } from './actions';

const DEADZONE = 0.35;

export type GamepadLike = {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
};

export function readGamepad(pad: GamepadLike, state: ActionState): ActionName[] {
  const changed: ActionName[] = [];
  applyAxes(pad, state, changed);
  applyButtons(pad, state, changed);
  return changed;
}

function applyAxes(pad: GamepadLike, state: ActionState, changed: ActionName[]): void {
  const axisX = pad.axes[0] ?? 0;
  const axisY = pad.axes[1] ?? 0;
  track(state, Actions.Left, axisX < -DEADZONE || pressed(pad, 14), changed);
  track(state, Actions.Right, axisX > DEADZONE || pressed(pad, 15), changed);
  track(state, Actions.Up, axisY < -DEADZONE || pressed(pad, 12), changed);
  track(state, Actions.Down, axisY > DEADZONE || pressed(pad, 13), changed);
}

function applyButtons(pad: GamepadLike, state: ActionState, changed: ActionName[]): void {
  track(state, Actions.Interact, pressed(pad, 0), changed);
  track(state, Actions.Bet, pressed(pad, 1), changed);
  track(state, Actions.Menu, pressed(pad, 9), changed);
  track(state, Actions.Mute, pressed(pad, 8), changed);
}

function pressed(pad: GamepadLike, index: number): boolean {
  return !!pad.buttons[index]?.pressed;
}

function track(
  state: ActionState,
  action: ActionName,
  isPressed: boolean,
  changed: ActionName[],
): void {
  if (state[action] === isPressed) return;
  state[action] = isPressed;
  changed.push(action);
}

export function pollFirstGamepad(
  list: readonly (GamepadLike | null)[],
): GamepadLike | null {
  return list.find((p) => p !== null) ?? null;
}
