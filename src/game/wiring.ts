import type { GameSession } from '../systems/session';
import type { HudHandles } from '../ui/hud';
import type { AudioEngine } from '../audio/synth';
import type { InputModeTracker } from '../systems/input-mode';
import type { TouchControls } from '../ui/touch-controls';
import { t } from '../i18n';
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
    hud.showTutorial(session.getTutorial().active);
    hud.updatePrompt();
    audio.startMusic();
    touch.setVisible(modes.get() === 'touch');
  });
  session.bus.on('story:ended', () => {
    if (!session.ui.is('ending')) session.ui.go('ending');
    // Clear any lingering bet toast before the ending panel.
    hud.showToast('', 'info');
    hud.showEnding(UI.wonEnding);
  });
  session.bus.on('story:credits', () => {
    if (!session.ui.is('ending')) session.ui.go('ending');
    hud.showToast('', 'info');
    hud.showCreditsRoll();
  });
  session.bus.on('input:action', (p) => {
    routeInputAction(session, hud, p.action, p.pressed, p.code);
  });
}

function routeInputAction(
  session: GameSession,
  hud: HudHandles,
  action: string,
  pressed: boolean,
  code?: string,
): void {
  if (action === 'interact' && !pressed) {
    session.noteInteractRelease();
    return;
  }
  if (action === 'interact' && pressed) session.noteInteractPressed(code);
  if (action === 'interact' && pressed && !gateInteract(session)) return;
  if (!pressed) return;
  const before = session.ui.get();
  handleAction(session, hud, action);
  const after = session.ui.get();
  if (
    action === 'interact' &&
    before !== after &&
    after !== 'play' &&
    after !== 'title'
  ) {
    session.noteModalOpened(true);
  }
  if (after === 'play') session.setTutorialOverlay(false);
  else if (after !== 'title') session.setTutorialOverlay(true);
}

/** Play rematch arm + modal confirm arm for Interact. */
function gateInteract(session: GameSession): boolean {
  if (session.ui.is('play')) return session.allowInteractInput();
  if (session.ui.is('title')) return true;
  return session.allowModalConfirm();
}

function wirePlayer(session: GameSession, hud: HudHandles): void {
  session.bus.on('player:credits-changed', () => hud.updateStats());
  session.bus.on('player:reputation-changed', () => hud.updateStats());
  // Always refresh on move — a throttled trailing write left stale E prompts.
  session.bus.on('player:moved', () => {
    hud.updatePrompt();
    session.noteTutorialProgress('moved');
    // Objective step: once the player has moved, the HUD marker is on-screen.
    if (session.tutorialStep() === 'objective') {
      session.noteTutorialProgress('sawObjective');
    }
  });
  session.bus.on('district:entered', () => {
    // Elevator ride ends on VIP — force-clear any leftover skill success panel.
    if (session.ui.is('play')) hud.showHud();
    hud.updateStats();
    hud.updatePrompt();
  });
}

function wireUi(session: GameSession, hud: HudHandles, audio: AudioEngine): void {
  session.bus.on('ui:toast', (p) => hud.showToast(p.message, p.kind));
  session.bus.on('ui:dialogue', () => {
    hud.showDialogue(session.getDialogue());
  });
  session.bus.on('bet:offered', () => {
    if (session.isStealthActive()) {
      hud.showHud();
      return;
    }
    if (session.ui.is('skill')) hud.showSkill();
    else hud.showBet();
  });
  session.bus.on('skill:started', (p) => {
    if (session.isStealthActive()) {
      hud.showHud();
      return;
    }
    const tip = session.peekMinigameTip(p.kind);
    if (tip) hud.showToast(t(`ui.minigameTip.${tip}`), 'info');
    hud.showSkill();
  });
  session.bus.on('ui:tutorial', (p) => {
    hud.showTutorial(p.active);
  });
  session.bus.on('bet:resolved', () => {
    hud.updateStats();
    // Ending beats already switched UI — don't clobber the ending panel.
    if (!session.ui.is('ending') && !session.ui.is('transition')) hud.showHud();
  });
  session.bus.on('fx:flash', (p) => hud.flash(p.kind));
  session.bus.on('fx:credits', (p) => hud.creditPopup(p.delta));
  session.bus.on('world:transition', (p) => {
    hud.showHud();
    hud.playTransition(p.kind, p.label);
  });
  session.bus.on('story:ended', () => {
    /* showEnding also wired above; keep play HUD from racing it */
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

function handleTitleAction(
  session: GameSession,
  hud: HudHandles,
  action: string,
): boolean {
  if (!session.ui.is('title')) return false;
  // Playtest #27: language row is a real menu — arrows move focus, Enter activates.
  if (action === 'up' || action === 'left') {
    hud.gamepadNav('up');
    return true;
  }
  if (action === 'down' || action === 'right') {
    hud.gamepadNav('down');
    return true;
  }
  if (action === 'interact' || action === 'bet') {
    hud.gamepadNav('confirm');
    hud.syncScreen();
  }
  return true;
}

function handleEscModal(session: GameSession, hud: HudHandles): boolean {
  // Playtest #29: Esc must fully close any panel and release WASD.
  if (
    session.ui.is('bet') ||
    session.ui.is('skill') ||
    session.ui.is('dialogue') ||
    session.ui.is('travel') ||
    session.ui.is('jobs') ||
    session.ui.is('upgrades')
  ) {
    if (session.ui.is('bet') || session.ui.is('skill')) {
      session.cancelBet();
    } else if (session.ui.is('dialogue')) {
      session.closeModal();
    } else {
      session.releaseModalToPlay();
    }
    // Blur focused Cancel/Sair so keys reach the canvas ActionState path.
    const ae = document.activeElement;
    if (ae instanceof HTMLElement) ae.blur();
    const canvas = document.querySelector(
      'canvas.world-canvas, canvas.engine-canvas',
    ) as HTMLCanvasElement | null;
    canvas?.focus({ preventScroll: true });
    hud.syncScreen();
    hud.showHud();
    return true;
  }
  return false;
}

function handleModalNav(session: GameSession, hud: HudHandles, action: string): boolean {
  if (session.ui.is('play') || session.ui.is('title')) return false;
  // Playtest #30: Enter on bet panel always confirms — never Stake −/+.
  if (session.ui.is('bet') && action === 'interact') {
    if (!session.allowModalConfirm()) return true;
    session.confirmBet();
    hud.syncScreen();
    hud.showHud();
    return true;
  }
  if (action === 'up' || action === 'left') {
    hud.gamepadNav('up');
    return true;
  }
  if (action === 'down' || action === 'right') {
    hud.gamepadNav('down');
    return true;
  }
  if (action === 'interact') {
    hud.gamepadNav('confirm');
    return true;
  }
  return false;
}

function handleTutorialKeys(
  session: GameSession,
  hud: HudHandles,
  action: string,
): boolean {
  if (!session.tutorialIsPanelVisible() || !session.ui.is('play')) return false;
  // Esc skips; Tab advances via panel keydown. WASD/E still drive the world so
  // steps advance by doing the action (move / interact / …).
  if (action === 'menu') {
    session.skipTutorialNow();
    hud.showTutorial(false);
    return true;
  }
  return false;
}

function handleAction(session: GameSession, hud: HudHandles, action: string): void {
  if (handleTitleAction(session, hud, action)) return;
  if (handleTutorialKeys(session, hud, action)) return;
  if (session.isSequenceSkillActive()) {
    if (action === 'menu') {
      session.cancelBet();
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) ae.blur();
      hud.syncScreen();
      hud.showHud();
    }
    return;
  }
  if (action === 'menu' && handleEscModal(session, hud)) return;
  if (handleModalNav(session, hud, action)) return;
  if (action === 'interact') onInteract(session, hud);
  if (action === 'bet') onBet(session, hud);
  if (action === 'menu') onMenu(session, hud);
  if (action === 'mute') session.setMuted(!session.getAudio().muted);
}

function onInteract(session: GameSession, hud: HudHandles): void {
  // Gamepad A / Enter while the needle is live — same as clicking Stop.
  if (session.ui.is('skill')) {
    const stop = document.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
    if (stop) {
      stop.click();
      return;
    }
  }
  if (!session.ui.is('play')) return;
  session.interact(true);
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
    message: t('ui.toast.noBetInRange'),
    kind: 'info',
  });
}

function onMenu(session: GameSession, hud: HudHandles): void {
  // Esc toggles: submenu → main menu → play.
  if (session.ui.is('menu')) {
    session.closeModal();
    hud.showMenu(false);
    hud.updatePrompt();
    return;
  }
  if (session.ui.is('travel') || session.ui.is('jobs') || session.ui.is('upgrades')) {
    if (session.returnToMenu()) {
      hud.showMenu(true);
      return;
    }
  }
  if (session.ui.is('play') && session.openMenu()) {
    hud.showMenu(true);
  }
}
