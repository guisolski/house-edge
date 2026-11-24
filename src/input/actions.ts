export const Actions = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  Interact: 'interact',
  Bet: 'bet',
  Menu: 'menu',
  Mute: 'mute',
  Run: 'run',
} as const;

export type ActionName = (typeof Actions)[keyof typeof Actions];

export type ActionState = Record<ActionName, boolean>;

export function createActionState(): ActionState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    interact: false,
    bet: false,
    menu: false,
    mute: false,
    run: false,
  };
}

export function movementDelta(state: ActionState): { dx: number; dy: number } {
  const dx = (state.right ? 1 : 0) - (state.left ? 1 : 0);
  const dy = (state.down ? 1 : 0) - (state.up ? 1 : 0);
  return { dx, dy };
}
