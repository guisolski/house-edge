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
import type { FpsSample } from '../rendering/fps';

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
  lastDistrict: { id: string };
};

/** Tile step cadence — FR-independent via elapsed cooldown (ms). */
const WALK_MS = 52;
const RUN_MS = 28;

export function createGameApp(host: HTMLElement): GameApp {
  const session = new GameSession(Date.now() % 100000);
  const engine = makeEngine(host);
  const hud = createHud(session, host);
  const world = createWorldView(session);
  host.appendChild(world.canvas);
  const state = createActionState();
  const audio = createAudioEngine();
  const modes = new InputModeTracker(350, detectInitialMode());
  const touch = mountTouchControls(host, state, session.bus, modes);
  touch.setVisible(false);
  wireSessionEvents(session, hud, audio, modes, touch);
  bindInputs(host, session, state, modes, world);
  const deps: TickDeps = {
    session,
    state,
    world,
    audio,
    cooldown: { ms: 0 },
    modes,
    hud,
    frame: { n: 0 },
    lastDistrict: { id: '' },
  };
  engine.on('postupdate', (ev) => onTick(deps, ev.elapsed));
  hud.showTitle(loadFromStorage() !== null);
  exposeHarness(session, modes, hud, world);
  return { engine, session, start: () => engine.start() };
}

function bindInputs(
  host: HTMLElement,
  session: GameSession,
  state: ActionState,
  modes: InputModeTracker,
  world: ReturnType<typeof createWorldView>,
): void {
  bindKeyboard(window, state, (action, pressed) => {
    modes.note('keyboard');
    session.bus.emit('input:action', { action, pressed });
  });
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'F3') return;
      e.preventDefault();
      const on = !host.dataset.fps;
      host.dataset.fps = on ? '1' : '';
      world.setShowFps(on);
    },
    { passive: false },
  );
  window.addEventListener('touchstart', () => modes.note('touch'), {
    passive: true,
  });
}

function exposeHarness(
  session: GameSession,
  modes: InputModeTracker,
  hud: HudHandles,
  world: ReturnType<typeof createWorldView>,
): void {
  (window as unknown as { __HOUSE_EDGE__: unknown }).__HOUSE_EDGE__ = {
    session,
    modes,
    hud,
    world,
    forceMode: (mode: 'keyboard' | 'touch' | 'gamepad') => modes.force(mode),
    getFps: (): FpsSample => world.getFps(),
    setShowFps: (on: boolean) => world.setShowFps(on),
  };
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
    width: 320,
    height: 180,
    canvasElement: canvas,
    displayMode: ex.DisplayMode.Fixed,
    pixelArt: true,
    backgroundColor: ex.Color.fromHex('#07060f'),
    suppressPlayButton: true,
    suppressConsoleBootMessage: true,
    maxFps: 60,
  });
}

function onTick(deps: TickDeps, delta: number): void {
  pollPads(deps);
  deps.cooldown.ms = Math.max(0, deps.cooldown.ms - delta);
  maybeMove(deps);
  const id = deps.session.player.getStats().districtId;
  if (id !== deps.lastDistrict.id) {
    deps.lastDistrict.id = id;
    deps.world.invalidateMap();
  }
  deps.frame.n += 1;
  deps.world.draw(deps.frame.n, performance.now());
}

function maybeMove(deps: TickDeps): void {
  if (deps.cooldown.ms > 0) return;
  if (!deps.session.ui.is('play')) return;
  const { dx, dy } = movementDelta(deps.state);
  if (!dx && !dy) return;
  deps.session.move(dx, dy);
  deps.cooldown.ms = deps.state.run ? RUN_MS : WALK_MS;
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
