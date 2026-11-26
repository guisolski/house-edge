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
    session.noteInteractRelease(code);
    return;
  }
  if (action === 'interact' && pressed) session.noteInteractPressed(code);
  if (action === 'interact' && pressed && !gateInteract(session, code)) {
    // 60ms bursts / held Enter: each blocked confirm re-arms the quiet period.
    // Playtest #39/#40: plain Close dialogue — don't re-arm; fresh keys advance.
    // Playtest #42: offer-bet still re-arms on mash (Take bet leak), but bump
    // no longer invents a held Enter when nothing was held at open.
    const plainClose =
      session.ui.is('dialogue') &&
      !session.dialogueHasChoices() &&
      !session.hasPendingStoryBet();
    if (!session.ui.is('play') && !session.ui.is('title') && !plainClose) {
      session.bumpModalConfirmArm();
    }
    return;
  }
  if (!pressed) return;
  const before = session.ui.get();
  handleAction(session, hud, action);
  const after = session.ui.get();
  if (action === 'interact' && before !== after) {
    armAfterModalOpen(session, after);
  }
  if (after === 'play') session.setTutorialOverlay(false);
  else if (after !== 'title') session.setTutorialOverlay(true);
}

/** Play rematch arm + modal confirm arm for Interact. */
function gateInteract(session: GameSession, code?: string): boolean {
  if (session.ui.is('play')) return session.allowInteractInput();
  if (session.ui.is('title')) return true;
  return session.allowModalConfirm(code);
}

/** Playtest #33/#34: menu/Viajar/ending must not inherit mash arm from Enter. */
function armAfterModalOpen(session: GameSession, after: string): void {
  if (after === 'play' || after === 'title') return;
  if (
    after === 'menu' ||
    after === 'travel' ||
    after === 'jobs' ||
    after === 'upgrades' ||
    after === 'ending'
  ) {
    session.clearModalConfirmGate();
    return;
  }
  // Playtest #40/#43: mark only keys still held — never force needsRelease after a
  // keyup that already landed before this arm ran.
  // Offer-bet opened from play (E) uses plain advance so first Enter Takes bet;
  // choice follow-ups are not routed here (same ui mode) — hud showDialogue arms those.
  const held = session.isInteractHeld();
  const codes = session.heldInteractCodes();
  if (
    after === 'dialogue' &&
    !session.dialogueHasChoices() &&
    (session.isDialogueFromPlay() || !session.hasPendingStoryBet())
  ) {
    session.armPlainDialogueAdvance(codes);
    return;
  }
  session.noteModalOpened(held, codes);
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
  session.bus.on('district:entered', (p) => {
    // Elevator ride ends on VIP — force-clear any leftover skill success panel.
    if (session.ui.is('play')) hud.showHud();
    hud.updateStats();
    hud.updatePrompt();
    // Playtest #44: big centered district name after the travel fade.
    hud.showDistrictBanner(p.districtId);
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
    // Ending beats / skill result banner — don't clobber those panels.
    if (session.ui.is('ending') || session.ui.is('transition')) return;
    if (session.getSkillResult()) return;
    hud.showHud();
  });
  // Playtest #48: beat completion must refresh the objective immediately.
  session.bus.on('story:beat-completed', () => {
    hud.updateStats();
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

function titlePrimaryButtons(title: HTMLElement): HTMLButtonElement[] {
  // Include disabled Continue so ArrowDown still moves focus before language.
  return [...title.querySelectorAll('button')].filter(
    (b) => !b.closest('.lang-row'),
  ) as HTMLButtonElement[];
}

function titleLangButtons(title: HTMLElement): HTMLButtonElement[] {
  return [...title.querySelectorAll('.lang-row button')] as HTMLButtonElement[];
}

function focusTitleLangStep(
  primary: HTMLButtonElement[],
  langs: HTMLButtonElement[],
  active: HTMLButtonElement | null,
  dir: 'up' | 'down',
): void {
  const li = langs.indexOf(active as HTMLButtonElement);
  if (dir === 'down') {
    if (li >= 0 && li < langs.length - 1) langs[li + 1]!.focus();
    else primary[0]?.focus();
    return;
  }
  if (li > 0) langs[li - 1]!.focus();
  else primary[primary.length - 1]?.focus();
}

function focusTitleStep(title: HTMLElement, dir: 'up' | 'down'): void {
  const primary = titlePrimaryButtons(title);
  const langs = titleLangButtons(title);
  if (!primary.length) return;
  const active = document.activeElement as HTMLButtonElement | null;
  const activeLang =
    langs.find((b) => b.classList.contains('lang-active')) ?? langs[0] ?? null;
  // On the language row, Up/Down only move focus (no locale change).
  if (active?.closest?.('.lang-row') && langs.length) {
    focusTitleLangStep(primary, langs, active, dir);
    return;
  }
  const i = primary.indexOf(active as HTMLButtonElement);
  if (dir === 'down') {
    if (i >= 0 && i < primary.length - 1) primary[i + 1]!.focus();
    else activeLang?.focus();
    return;
  }
  if (i > 0) primary[i - 1]!.focus();
  else activeLang?.focus();
}

function handleTitleAction(
  session: GameSession,
  hud: HudHandles,
  action: string,
): boolean {
  if (!session.ui.is('title')) return false;
  const title = document.querySelector('.title-screen') as HTMLElement | null;
  if (!title) return true;
  const active = document.activeElement as HTMLElement | null;
  const onLang = Boolean(active?.closest?.('.lang-row'));
  // Playtest #47: Up/Down move focus (primary first; lang last). Language
  // *value* changes only via Left/Right or Enter on the language row.
  if (action === 'left' || action === 'right') {
    if (onLang) {
      const btns = titleLangButtons(title);
      if (btns.length >= 2) {
        const i = btns.indexOf(active as HTMLButtonElement);
        const next =
          action === 'right'
            ? btns[(Math.max(0, i) + 1) % btns.length]!
            : btns[(Math.max(0, i) - 1 + btns.length) % btns.length]!;
        next.focus();
        next.click();
      }
      return true;
    }
    focusTitleStep(title, action === 'left' ? 'up' : 'down');
    return true;
  }
  if (action === 'up' || action === 'down') {
    focusTitleStep(title, action === 'up' ? 'up' : 'down');
    return true;
  }
  if (action === 'interact' || action === 'bet') {
    hud.gamepadNav('confirm');
    hud.syncScreen();
  }
  return true;
}

function handleEndingEsc(session: GameSession, hud: HudHandles): boolean {
  const ending = document.querySelector('.ending-panel') as HTMLElement | null;
  // Playtest #32/#33: Esc on wipe confirm = Voltar.
  if (ending?.dataset.endingConfirm === '1') {
    hud.showEnding(UI.wonEnding);
    return true;
  }
  // Playtest #46: Esc during armed credits wait is a no-op (keep the roll).
  if (ending?.classList.contains('ending-credits') && ending.dataset.creditsArm !== '1') {
    return true;
  }
  // Playtest #34: Esc on victory = Continuar explorando (never soft-lock).
  if (ending && !ending.classList.contains('ending-credits')) {
    session.continueExploring();
    hud.syncScreen();
    hud.showHud();
    return true;
  }
  return false;
}

function closeOverlayToPlay(session: GameSession, hud: HudHandles): void {
  if (session.ui.is('bet') || session.ui.is('skill')) {
    session.cancelBet();
  } else if (session.ui.is('dialogue')) {
    session.closeModal();
  } else {
    session.releaseModalToPlay();
  }
  const ae = document.activeElement;
  if (ae instanceof HTMLElement) ae.blur();
  const canvas = document.querySelector(
    'canvas.world-canvas, canvas.engine-canvas',
  ) as HTMLCanvasElement | null;
  canvas?.focus({ preventScroll: true });
  hud.syncScreen();
  hud.showHud();
}

function handleEscModal(session: GameSession, hud: HudHandles): boolean {
  if (session.ui.is('ending')) return handleEndingEsc(session, hud);
  if (session.ui.is('menu')) {
    const menu = document.querySelector('.menu-panel') as HTMLElement | null;
    if (menu?.dataset.menuConfirm === '1') {
      hud.showMenu(true);
      return true;
    }
  }
  // Playtest #29: Esc must fully close any panel and release WASD.
  if (
    session.ui.is('bet') ||
    session.ui.is('skill') ||
    session.ui.is('dialogue') ||
    session.ui.is('travel') ||
    session.ui.is('jobs') ||
    session.ui.is('upgrades')
  ) {
    closeOverlayToPlay(session, hud);
    return true;
  }
  return false;
}

/**
 * Playtest #43/#46: Stop / Enter / Space / gamepad A ignored while countdown
 * or grace — dataset.needleReady stays '0' until input is armed.
 */
function needleCountdownBlocksConfirm(): boolean {
  const meter = document.querySelector('.skill-meter') as HTMLElement | null;
  if (!meter) return false;
  if (meter.dataset.needleReady !== '1') return true;
  const stop = document.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
  return Boolean(stop?.disabled);
}

/** Playtest #46: credits leave buttons stay disabled until arm. */
function creditsLeaveBlocked(): boolean {
  const ending = document.querySelector('.ending-panel') as HTMLElement | null;
  return Boolean(
    ending?.classList.contains('ending-credits') && ending.dataset.creditsArm !== '1',
  );
}

function handleModalConfirm(
  session: GameSession,
  hud: HudHandles,
  interactCode: string | undefined,
): boolean {
  if (session.ui.is('bet')) {
    if (!session.allowModalConfirm(interactCode)) return true;
    session.confirmBet();
    hud.syncScreen();
    hud.showHud();
    return true;
  }
  if (session.ui.is('dialogue')) {
    if (!session.allowModalConfirm(interactCode)) return true;
    hud.gamepadNav('confirm');
    return true;
  }
  if (!session.allowModalConfirm(interactCode)) return true;
  if (session.ui.is('skill') && needleCountdownBlocksConfirm()) return true;
  if (session.ui.is('ending') && creditsLeaveBlocked()) return true;
  hud.gamepadNav('confirm');
  return true;
}

function handleModalNav(session: GameSession, hud: HudHandles, action: string): boolean {
  if (session.ui.is('play') || session.ui.is('title')) return false;
  const interactCode = session.getLastInteractCode() ?? undefined;
  if (action === 'up' || action === 'left') {
    hud.gamepadNav('up');
    return true;
  }
  if (action === 'down' || action === 'right') {
    hud.gamepadNav('down');
    return true;
  }
  if (action === 'interact') return handleModalConfirm(session, hud, interactCode);
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
      if (needleCountdownBlocksConfirm()) return;
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
