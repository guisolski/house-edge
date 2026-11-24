import type { GameSession } from '../systems/session';
import type { HudHandles } from '../ui/hud';
import type { AudioEngine } from '../audio/synth';
import { UI } from '../ui/strings';

export function wireSessionEvents(
  session: GameSession,
  hud: HudHandles,
  audio: AudioEngine,
): void {
  wireGameLifecycle(session, hud, audio);
  wirePlayerHud(session, hud);
  wireUiAudio(session, hud, audio);
}

function wireGameLifecycle(
  session: GameSession,
  hud: HudHandles,
  audio: AudioEngine,
): void {
  session.bus.on('game:started', () => {
    hud.showHud();
    hud.updateStats();
    audio.startMusic();
  });
  session.bus.on('story:ended', () => hud.showEnding(UI.wonEnding));
  session.bus.on('input:action', (p) => handleAction(session, p.action, p.pressed));
}

function wirePlayerHud(session: GameSession, hud: HudHandles): void {
  session.bus.on('player:credits-changed', () => hud.updateStats());
  session.bus.on('player:reputation-changed', () => hud.updateStats());
  session.bus.on('player:moved', () => hud.updateStats());
  session.bus.on('district:entered', () => hud.updateStats());
}

function wireUiAudio(session: GameSession, hud: HudHandles, audio: AudioEngine): void {
  session.bus.on('ui:toast', (p) => hud.showToast(p.message, p.kind));
  session.bus.on('ui:dialogue', () => refreshDialogue(session, hud));
  session.bus.on('ui:menu', (p) => hud.showMenu(p.open));
  session.bus.on('audio:play-sfx', (p) => audio.playSfx(p.id));
  session.bus.on('audio:volume', (p) => audio.setVolume(p.master, p.muted));
}

function refreshDialogue(session: GameSession, hud: HudHandles): void {
  const beat = session.availableStory()[0];
  const lines = beat?.dialogue ?? [];
  if (lines.length) hud.showDialogue(lines);
}

function handleAction(session: GameSession, action: string, pressed: boolean): void {
  if (!pressed) return;
  if (action === 'interact') runInteract(session);
  if (action === 'bet') session.placeBet('agua-gelada');
  if (action === 'menu') session.bus.emit('ui:menu', { open: true, screen: 'pause' });
  if (action === 'mute') session.setMuted(!session.getAudio().muted);
}

function runInteract(session: GameSession): void {
  const beat = session.availableStory()[0];
  if (beat) {
    session.runStoryBeat(beat.id);
    return;
  }
  session.bus.emit('ui:toast', { message: UI.noStory, kind: 'info' });
}
