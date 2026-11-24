import { Actions, type ActionName, type ActionState } from './actions';

export type TouchControlId =
  | 'pad-up'
  | 'pad-down'
  | 'pad-left'
  | 'pad-right'
  | 'btn-interact'
  | 'btn-bet'
  | 'btn-menu';

const TOUCH_MAP: Record<TouchControlId, ActionName> = {
  'pad-up': Actions.Up,
  'pad-down': Actions.Down,
  'pad-left': Actions.Left,
  'pad-right': Actions.Right,
  'btn-interact': Actions.Interact,
  'btn-bet': Actions.Bet,
  'btn-menu': Actions.Menu,
};

export function applyTouch(
  state: ActionState,
  controlId: TouchControlId,
  pressed: boolean,
): ActionName {
  const action = TOUCH_MAP[controlId];
  state[action] = pressed;
  return action;
}

export function listTouchControls(): TouchControlId[] {
  return Object.keys(TOUCH_MAP) as TouchControlId[];
}
