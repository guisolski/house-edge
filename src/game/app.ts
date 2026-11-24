import * as ex from 'excalibur';
import { GameSession } from '../systems/session';
import { createHud } from '../ui/hud';
import { mountTouchControls } from '../ui/touch-controls';
import { createWorldView } from '../rendering/world-view';
import { createActionState, movementDelta, type ActionState } from '../input/actions';
import { bindKeyboard } from '../input/keyboard';
import { pollFirstGamepad, readGamepad } from '../input/gamepad';
import { createAudioEngine, type AudioEngine } from '../audio/synth';
import { loadFromStorage } from '../systems/save';
import { InputModeTracker } from '../systems/input-mode';
import { wireSessionEvents } from './wiring';
import type { HudHandles } from '../ui/hud';

export type GameApp = {
  engine: ex.Engine;
  session: GameSession;
  start: () => Promise<void>;
};

type TickDeps = {
  session: GameSession;
  state: ActionState;
  world: ReturnType<typeof createWorldView>;
  audio: AudioEngine;
  cooldown: { ms: number };
  modes: InputModeTracker;
  hud: HudHandles;
  frame: { n: number };
};

export function createGameApp(host: HTMLElement): GameApp {
  const session = new GameSession(Date.now() % 100000);
  const engine = makeEngine(host);
  const hud = createHud(session, host);
  const world = createWorldView(session);
  host.appendChild(world.canvas);
  const state = createActionState();
  const audio = createAudioEngine();
  const cooldown = { ms: 0 };
  const modes = new InputModeTracker(350, detectInitialMode());
  const touch = mountTouchControls(host, state, session.bus, modes);
  wireSessionEvents(session, hud, audio, modes, touch);
  bindKeyboard(window, state, (action, pressed) => {
    modes.note('keyboard');
    session.bus.emit('input:action', { action, pressed });
  });
  window.addEventListener('touchstart', () => modes.note('touch'), { passive: true });
  const deps: TickDeps = {
    session,
    state,
    world,
    audio,
    cooldown,
    modes,
    hud,
    frame: { n: 0 },
  };
  engine.on('postupdate', (ev) => onTick(deps, ev.elapsed));
  hud.showTitle(loadFromStorage() !== null);
  const app = { engine, session, start: () => engine.start() };
  // Playtest / e2e harness — UX mode switching + session control.
  (window as unknown as { __HOUSE_EDGE__: unknown }).__HOUSE_EDGE__ = {
    session,
    modes,
    hud,
    forceMode: (mode: 'keyboard' | 'touch' | 'gamepad') => modes.force(mode),
  };
  return app;
}

function detectInitialMode(): 'keyboard' | 'touch' | 'gamepad' {
  if (typeof window === 'undefined') return 'keyboard';
  if (window.matchMedia('(pointer: coarse)').matches) return 'touch';
  return 'keyboard';
}

function makeEngine(host: HTMLElement): ex.Engine {
  const canvas = document.createElement('canvas');
  canvas.className = 'engine-canvas';
  host.appendChild(canvas);
  return new ex.Engine({
    width: 960,
    height: 540,
    canvasElement: canvas,
    displayMode: ex.DisplayMode.Fixed,
    pixelArt: true,
    backgroundColor: ex.Color.fromHex('#07060f'),
    suppressPlayButton: true,
    suppressConsoleBootMessage: true,
  });
}

function onTick(deps: TickDeps, delta: number): void {
  pollPads(deps);
  deps.cooldown.ms = Math.max(0, deps.cooldown.ms - delta);
  maybeMove(deps);
  deps.frame.n += 1;
  deps.world.draw(deps.frame.n);
}

function maybeMove(deps: TickDeps): void {
  if (deps.cooldown.ms > 0) return;
  if (!deps.session.ui.is('play')) return;
  const { dx, dy } = movementDelta(deps.state);
  if (!dx && !dy) return;
  deps.session.move(dx, dy);
  deps.audio.playSfx('move');
  deps.cooldown.ms = 140;
}

function pollPads(deps: TickDeps): void {
  const pads = navigator.getGamepads?.() ?? [];
  const pad = pollFirstGamepad(pads);
  if (!pad) return;
  const changed = readGamepad(pad, deps.state);
  if (!changed.length) return;
  deps.modes.note('gamepad');
  for (const action of changed) {
    const pressed = deps.state[action];
    if (!deps.session.ui.is('play') && pressed) {
      routeGamepadMenu(deps, action);
    }
    deps.session.bus.emit('input:action', { action, pressed });
  }
}

function routeGamepadMenu(deps: TickDeps, action: string): void {
  if (action === 'up') deps.hud.gamepadNav('up');
  if (action === 'down') deps.hud.gamepadNav('down');
  if (action === 'interact') deps.hud.gamepadNav('confirm');
  if (action === 'bet') deps.hud.gamepadNav('back');
}
