import type { GameSession } from '../systems/session';
import type { HudHandles } from '../ui/hud';
import type { AudioEngine } from '../audio/synth';
import type { InputModeTracker } from '../systems/input-mode';
import type { TouchControls } from '../ui/touch-controls';
import { UI } from '../ui/strings';

export function wireSessionEvents(
  session: GameSession,
  hud: HudHandles,
  audio: AudioEngine,
  modes: InputModeTracker,
  touch: TouchControls,
): void {
  wireLifecycle(session, hud, audio, modes, touch);
  wirePlayer(session, hud);
  wireUi(session, hud, audio);
  wireModes(session, modes, hud, touch);
}

function wireLifecycle(
  session: GameSession,
  hud: HudHandles,
  audio: AudioEngine,
  modes: InputModeTracker,
  touch: TouchControls,
): void {
  session.bus.on('game:started', () => {
    hud.showHud();
    hud.updateStats();
    hud.updatePrompt();
    audio.startMusic();
    touch.setVisible(modes.get() === 'touch');
  });
  session.bus.on('story:ended', () => hud.showEnding(UI.wonEnding));
  session.bus.on('input:action', (p) => {
    if (p.pressed) handleAction(session, hud, p.action);
  });
}

function wirePlayer(session: GameSession, hud: HudHandles): void {
  session.bus.on('player:credits-changed', () => hud.updateStats());
  session.bus.on('player:reputation-changed', () => hud.updateStats());
  // PERF: throttle proximity prompt DOM writes, with a trailing flush so the
  // final tile (stop next to an NPC) still refreshes the prompt.
  let promptAt = 0;
  let promptTimer: ReturnType<typeof setTimeout> | null = null;
  session.bus.on('player:moved', () => {
    const now = performance.now();
    if (now - promptAt >= 80) {
      promptAt = now;
      hud.updatePrompt();
      return;
    }
    if (promptTimer !== null) return;
    promptTimer = setTimeout(() => {
      promptTimer = null;
      promptAt = performance.now();
      hud.updatePrompt();
    }, 80);
  });
  session.bus.on('district:entered', () => {
    hud.updateStats();
    hud.updatePrompt();
  });
}

function wireUi(session: GameSession, hud: HudHandles, audio: AudioEngine): void {
  session.bus.on('ui:toast', (p) => hud.showToast(p.message, p.kind));
  session.bus.on('ui:dialogue', () => {
    hud.showDialogue(session.getDialogue());
  });
  session.bus.on('bet:offered', () => hud.showBet());
  session.bus.on('bet:resolved', () => {
    hud.showHud();
    hud.updateStats();
  });
  session.bus.on('audio:play-sfx', (p) => audio.playSfx(p.id));
  session.bus.on('audio:volume', (p) => audio.setVolume(p.master, p.muted));
}

function wireModes(
  session: GameSession,
  modes: InputModeTracker,
  hud: HudHandles,
  touch: TouchControls,
): void {
  const apply = (mode: ReturnType<InputModeTracker['get']>): void => {
    hud.setInputMode(mode);
    const playing = session.ui.is('play');
    touch.setVisible(mode === 'touch' && playing);
  };
  apply(modes.get());
  modes.onChange(apply);
}

function handleAction(session: GameSession, hud: HudHandles, action: string): void {
  if (action === 'interact') onInteract(session, hud);
  if (action === 'bet') onBet(session, hud);
  if (action === 'menu') onMenu(session, hud);
  if (action === 'mute') session.setMuted(!session.getAudio().muted);
}

function onInteract(session: GameSession, hud: HudHandles): void {
  if (session.ui.is('dialogue')) {
    session.closeModal();
    hud.syncScreen();
    return;
  }
  if (!session.ui.is('play')) return;
  session.interact();
  hud.syncScreen();
  hud.updatePrompt();
}

function onBet(session: GameSession, hud: HudHandles): void {
  if (session.ui.is('bet')) {
    session.confirmBet();
    hud.showHud();
    return;
  }
  if (!session.ui.is('play')) return;
  const npc = session.nearbyNpc();
  if (npc?.jobBetId) {
    session.offerBet(npc.jobBetId);
    hud.syncScreen();
    return;
  }
  session.bus.emit('ui:toast', {
    message: 'No bet in range — walk up to an NPC.',
    kind: 'info',
  });
}

function onMenu(session: GameSession, hud: HudHandles): void {
  if (session.ui.is('menu')) {
    session.closeModal();
    hud.showMenu(false);
    return;
  }
  if (session.ui.is('play') && session.openMenu()) {
    hud.showMenu(true);
  }
}
