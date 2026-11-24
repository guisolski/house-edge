import { el } from './dom';
import type { ActionState } from '../input/actions';
import type { EventBus } from '../core/event-bus';
import type { InputModeTracker } from '../systems/input-mode';

/** UX-7: analog stick + clean action buttons (visible only in touch mode). */

export type TouchControls = {
  root: HTMLElement;
  setVisible: (visible: boolean) => void;
};

const STICK_RADIUS = 56;
const DEAD = 0.22;

export function mountTouchControls(
  mount: HTMLElement,
  state: ActionState,
  bus: EventBus,
  modes: InputModeTracker,
): TouchControls {
  const root = el('div', 'touch-controls');
  root.append(makeStick(state, bus, modes), makeActions(state, bus, modes));
  mount.appendChild(root);
  root.hidden = true;
  return {
    root,
    setVisible: (visible) => {
      if (!visible && root.contains(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur();
      }
      root.hidden = !visible;
      root.removeAttribute('aria-hidden');
      root.style.display = visible ? '' : 'none';
    },
  };
}

function makeStick(
  state: ActionState,
  bus: EventBus,
  modes: InputModeTracker,
): HTMLElement {
  const zone = el('div', 'stick-zone');
  const base = el('div', 'stick-base');
  const knob = el('div', 'stick-knob');
  base.appendChild(knob);
  zone.appendChild(base);
  bindStick({ zone, base, knob, state, bus, modes });
  return zone;
}

type StickCtx = {
  zone: HTMLElement;
  base: HTMLElement;
  knob: HTMLElement;
  state: ActionState;
  bus: EventBus;
  modes: InputModeTracker;
};

function bindStick(ctx: StickCtx): void {
  const origin = { x: 0, y: 0 };
  let active = false;
  ctx.zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ctx.modes.note('touch');
    active = true;
    ctx.zone.setPointerCapture(e.pointerId);
    const rect = ctx.base.getBoundingClientRect();
    origin.x = rect.left + rect.width / 2;
    origin.y = rect.top + rect.height / 2;
    nudgeKnob(ctx, origin, e.clientX, e.clientY);
  });
  ctx.zone.addEventListener('pointermove', (e) => {
    if (!active) return;
    nudgeKnob(ctx, origin, e.clientX, e.clientY);
  });
  const end = (): void => {
    active = false;
    ctx.knob.style.transform = 'translate(-50%, -50%)';
    clearMove(ctx.state, ctx.bus);
  };
  ctx.zone.addEventListener('pointerup', end);
  ctx.zone.addEventListener('pointercancel', end);
}

function nudgeKnob(
  ctx: StickCtx,
  origin: { x: number; y: number },
  x: number,
  y: number,
): void {
  const dx = x - origin.x;
  const dy = y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  const clamped = Math.min(len, STICK_RADIUS);
  const nx = (dx / len) * clamped;
  const ny = (dy / len) * clamped;
  ctx.knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  applyAxis(ctx.state, ctx.bus, nx / STICK_RADIUS, ny / STICK_RADIUS);
}

function applyAxis(state: ActionState, bus: EventBus, ax: number, ay: number): void {
  setDir(state, bus, 'left', ax < -DEAD);
  setDir(state, bus, 'right', ax > DEAD);
  setDir(state, bus, 'up', ay < -DEAD);
  setDir(state, bus, 'down', ay > DEAD);
}

function clearMove(state: ActionState, bus: EventBus): void {
  setDir(state, bus, 'left', false);
  setDir(state, bus, 'right', false);
  setDir(state, bus, 'up', false);
  setDir(state, bus, 'down', false);
}

function setDir(
  state: ActionState,
  bus: EventBus,
  action: 'up' | 'down' | 'left' | 'right',
  pressed: boolean,
): void {
  if (state[action] === pressed) return;
  state[action] = pressed;
  bus.emit('input:action', { action, pressed });
}

function makeActions(
  state: ActionState,
  bus: EventBus,
  modes: InputModeTracker,
): HTMLElement {
  const wrap = el('div', 'touch-actions');
  for (const [label, action] of [
    ['Interact', 'interact'],
    ['Bet', 'bet'],
    ['Menu', 'menu'],
  ] as const) {
    wrap.appendChild(actionBtn(label, action, { state, bus, modes }));
  }
  return wrap;
}

function actionBtn(
  label: string,
  action: 'interact' | 'bet' | 'menu',
  ctx: { state: ActionState; bus: EventBus; modes: InputModeTracker },
): HTMLButtonElement {
  const btn = el('button', `touch-btn touch-${action}`, label);
  btn.type = 'button';
  const press = (pressed: boolean): void => {
    ctx.modes.note('touch');
    ctx.state[action] = pressed;
    ctx.bus.emit('input:action', { action, pressed });
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    press(true);
  });
  btn.addEventListener('pointerup', () => press(false));
  btn.addEventListener('pointerleave', () => press(false));
  return btn;
}
