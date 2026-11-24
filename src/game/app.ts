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
import { wireSessionEvents } from './wiring';

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
  mountTouchControls(host, state, session.bus);
  wireSessionEvents(session, hud, audio);
  bindKeyboard(window, state, (action, pressed) => {
    session.bus.emit('input:action', { action, pressed });
  });
  const deps: TickDeps = { session, state, world, audio, cooldown };
  engine.on('postupdate', (ev) => onTick(deps, ev.elapsed));
  hud.showTitle(loadFromStorage() !== null);
  return { engine, session, start: () => engine.start() };
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
  pollPads(deps.state, deps.session);
  deps.cooldown.ms = Math.max(0, deps.cooldown.ms - delta);
  maybeMove(deps);
  deps.world.draw();
}

function maybeMove(deps: TickDeps): void {
  if (deps.cooldown.ms > 0) return;
  const { dx, dy } = movementDelta(deps.state);
  if (!dx && !dy) return;
  deps.session.move(dx, dy);
  deps.audio.playSfx('move');
  deps.cooldown.ms = 140;
}

function pollPads(state: ActionState, session: GameSession): void {
  const pads = navigator.getGamepads?.() ?? [];
  const pad = pollFirstGamepad(pads);
  if (!pad) return;
  for (const action of readGamepad(pad, state)) {
    session.bus.emit('input:action', { action, pressed: state[action] });
  }
}
