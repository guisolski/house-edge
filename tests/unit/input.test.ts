import { describe, expect, it, vi } from 'vitest';
import { Actions, createActionState, movementDelta } from '../../src/input/actions';
import { applyKey, bindKeyboard } from '../../src/input/keyboard';
import { pollFirstGamepad, readGamepad } from '../../src/input/gamepad';
import { applyTouch, listTouchControls } from '../../src/input/touch';

describe('input mapping', () => {
  it('maps keyboard and movement', () => {
    const state = createActionState();
    expect(applyKey(state, 'KeyW', true)).toBe(Actions.Up);
    expect(applyKey(state, 'KeyD', true)).toBe(Actions.Right);
    expect(movementDelta(state)).toEqual({ dx: 1, dy: -1 });
    expect(applyKey(state, 'Enter', true)).toBe(Actions.Interact);
    expect(applyKey(state, 'KeyZ', true)).toBeNull();
  });

  it('bindKeyboard wires listeners', () => {
    const state = createActionState();
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const unbind = bindKeyboard(target as unknown as Window, state, vi.fn());
    expect(target.addEventListener).toHaveBeenCalledTimes(2);
    unbind();
    expect(target.removeEventListener).toHaveBeenCalledTimes(2);
  });
});

describe('gamepad and touch', () => {
  it('reads gamepad axes and buttons', () => {
    const state = createActionState();
    const changed = readGamepad(
      {
        axes: [1, -1],
        buttons: Array.from({ length: 16 }, (_, i) => ({
          pressed: i === 0 || i === 1 || i === 8 || i === 9,
        })),
      },
      state,
    );
    expect(changed).toContain(Actions.Right);
    expect(pollFirstGamepad([null, { axes: [], buttons: [] }])).not.toBeNull();
    expect(pollFirstGamepad([null, null])).toBeNull();
  });

  it('maps touch controls', () => {
    const state = createActionState();
    expect(applyTouch(state, 'pad-left', true)).toBe(Actions.Left);
    expect(listTouchControls().length).toBeGreaterThan(3);
  });
});
