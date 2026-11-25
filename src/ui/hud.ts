import { el, clearNode, setVisible } from './dom';
import { UI } from './strings';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import type { InputMode } from '../systems/input-mode';
import { focusNext, focusPrev, activateFocused } from './focus';
import {
  button,
  focusFirst,
  paintBet,
  paintDialogue,
  paintJobs,
  paintSkill,
  paintTravel,
  paintUpgrades,
} from './panels';
import { bakeSprite } from '../rendering/bake';
import { makeEndingScene } from '../rendering/pixel-gen';
import type { FpsSample } from '../rendering/fps';
import { resolveInteractPriority } from '../systems/interact-priority';

export type HudHandles = {
  root: HTMLElement;
  showTitle: (hasSave: boolean) => void;
  showHud: () => void;
  updateStats: () => void;
  showDialogue: (lines: DialogueLine[]) => void;
  showToast: (message: string, kind: string) => void;
  showMenu: (open: boolean) => void;
  showBet: () => void;
  showSkill: () => void;
  showTravel: () => void;
  showJobs: () => void;
  showUpgrades: () => void;
  showEnding: (text: string) => void;
  showCreditsRoll: () => void;
  setInputMode: (mode: InputMode) => void;
  updatePrompt: () => void;
  setFps: (sample: FpsSample | null) => void;
  syncScreen: () => void;
  gamepadNav: (dir: 'up' | 'down' | 'confirm' | 'back') => void;
  flash: (kind: string) => void;
  creditPopup: (delta: number) => void;
  playTransition: (kind: string, label?: string) => void;
};

type Parts = {
  root: HTMLElement;
  title: HTMLElement;
  play: HTMLElement;
  menu: HTMLElement;
  dialogue: HTMLElement;
  bet: HTMLElement;
  skill: HTMLElement;
  travel: HTMLElement;
  jobs: HTMLElement;
  upgrades: HTMLElement;
  toast: HTMLElement;
  ending: HTMLElement;
  prompt: HTMLElement;
  hints: HTMLElement;
  objective: HTMLElement;
  objectiveDetail: HTMLElement;
  fps: HTMLElement;
  stats: HTMLElement;
  flash: HTMLElement;
  creditsFx: HTMLElement;
  transition: HTMLElement;
};

export function createHud(session: GameSession, mount: HTMLElement): HudHandles {
  const parts = emptyParts();
  const handles = makeHandles(session, parts);
  wireDom(session, parts, handles);
  mount.appendChild(parts.root);
  return handles;
}

function emptyParts(): Parts {
  const root = el('div', 'hud');
  root.dataset.inputMode = 'keyboard';
  return {
    root,
    title: el('section', 'title-screen'),
    play: el('section', 'play-hud'),
    menu: el('section', 'menu-panel'),
    dialogue: el('div', 'dialogue-panel'),
    bet: el('div', 'bet-panel'),
    skill: el('div', 'skill-panel'),
    travel: el('div', 'travel-panel'),
    jobs: el('div', 'jobs-panel'),
    upgrades: el('div', 'upgrades-panel'),
    toast: el('div', 'toast'),
    ending: el('div', 'ending-panel'),
    prompt: el('div', 'interact-prompt'),
    hints: el('div', 'input-hints', UI.hintKeyboard),
    objective: el('div', 'objective', ''),
    objectiveDetail: el('div', 'objective-detail', ''),
    fps: el('div', 'fps-meter', ''),
    stats: el('div', 'stats', ''),
    flash: el('div', 'fx-flash'),
    creditsFx: el('div', 'fx-credits'),
    transition: el('div', 'fx-transition'),
  };
}

function wireDom(session: GameSession, p: Parts, h: HudHandles): void {
  p.play.append(p.stats, p.objective, p.objectiveDetail, p.hints);
  setVisible(p.fps, false);
  setVisible(p.flash, false);
  setVisible(p.creditsFx, false);
  setVisible(p.transition, false);
  p.root.appendChild(p.fps);
  fillTitle(p.title, session);
  fillMenu(p.menu, session, h);
  appendAll(p);
  hideAll([
    p.play,
    p.menu,
    p.dialogue,
    p.bet,
    p.skill,
    p.travel,
    p.jobs,
    p.upgrades,
    p.ending,
    p.prompt,
  ]);
}

function appendAll(p: Parts): void {
  p.root.append(
    p.title,
    p.play,
    p.menu,
    p.dialogue,
    p.bet,
    p.skill,
    p.travel,
    p.jobs,
    p.upgrades,
    p.toast,
    p.ending,
    p.prompt,
    p.flash,
    p.creditsFx,
    p.transition,
  );
}

function makeHandles(session: GameSession, p: Parts): HudHandles {
  const h = {} as HudHandles;
  Object.assign(h, baseShows(session, p, h), modalShows(session, p, h));
  return h;
}

function baseShows(session: GameSession, p: Parts, h: HudHandles): Partial<HudHandles> {
  return {
    root: p.root,
    showTitle: (hasSave) => {
      fillTitle(p.title, session);
      only(p, 'title');
      const cont = p.title.querySelectorAll('button')[1] as HTMLButtonElement;
      if (cont) cont.disabled = !hasSave;
    },
    showHud: () => {
      only(p, 'play');
      refresh(p, session);
    },
    updateStats: () => refresh(p, session),
    showToast: (message, kind) => paintToast(p.toast, message, kind),
    setInputMode: (mode) => applyMode(p, mode),
    updatePrompt: () => paintPrompt(p.prompt, session),
    setFps: (sample) => paintFps(p.fps, sample),
    syncScreen: () => syncFromUi(h, p, session),
    gamepadNav: (dir) => navModal(h, p, session, dir),
    flash: (kind) => runFlash(p.flash, kind),
    creditPopup: (delta) => runCreditPopup(p.creditsFx, delta),
    playTransition: (kind, label) => runTransition(p.transition, kind, label),
  };
}

function modalShows(session: GameSession, p: Parts, h: HudHandles): Partial<HudHandles> {
  return {
    showDialogue: (lines) => {
      only(p, 'dialogue');
      const offerBet = session.hasPendingStoryBet();
      const epi = session.getPendingStoryBeat() === 'epilogue-laje';
      const hasChoice = lines.some((l) => Boolean(l.choices?.length));
      const closingOnly =
        epi &&
        !hasChoice &&
        !offerBet &&
        lines.length > 0 &&
        lines.every((l) => /Saúde/i.test(l.text));
      // Epilogue: deliberate choice (ignore Enter ~500ms); closing = own panel ≥3s.
      const choiceArmAt = epi && hasChoice ? Date.now() + 500 : undefined;
      const holdCloseUntil = closingOnly ? Date.now() + 3000 : undefined;
      paintDialogue(p.dialogue, lines, {
        offerBet,
        choiceArmAt,
        holdCloseUntil,
        closingLine: closingOnly,
        onAcceptBet: () => {
          session.acceptStoryBet();
          h.syncScreen();
        },
        onChoice: (setsFlag, reply) => {
          session.pickDialogueChoice(setsFlag, reply);
          // pickDialogueChoice emits ui:dialogue → showDialogue with Saúde-only lines.
          h.showDialogue(session.getDialogue());
        },
        onClose: () => {
          session.closeModal();
          h.syncScreen();
        },
      });
    },
    showMenu: (open) => toggleMenu(p, open, session, h),
    showBet: () => {
      only(p, 'bet');
      paintBet(p.bet, session, () => h.syncScreen());
      focusFirst(p.bet);
    },
    showSkill: () => {
      only(p, 'skill');
      paintSkill(p.skill, session, () => h.syncScreen());
      focusFirst(p.skill);
    },
    showTravel: () => {
      only(p, 'travel');
      paintTravel(p.travel, session, () => h.syncScreen());
      focusFirst(p.travel);
    },
    showJobs: () => {
      only(p, 'jobs');
      paintJobs(p.jobs, session, () => h.syncScreen());
      focusFirst(p.jobs);
    },
    showUpgrades: () => {
      only(p, 'upgrades');
      paintUpgrades(p.upgrades, session, () => h.syncScreen());
      focusFirst(p.upgrades);
    },
    showEnding: (text) => showEnding(p, session, h, text),
    showCreditsRoll: () => showCreditsRoll(p, session, h),
  };
}

function toggleMenu(
  p: Parts,
  open: boolean,
  session?: GameSession,
  h?: HudHandles,
): void {
  if (open && session && h) {
    fillMenu(p.menu, session, h);
    only(p, 'menu');
    focusFirst(p.menu);
    return;
  }
  if (open) {
    only(p, 'menu');
    focusFirst(p.menu);
    return;
  }
  only(p, 'play');
}

let endingArtCanvas: HTMLCanvasElement | null = null;

function endingArt(): HTMLCanvasElement {
  if (!endingArtCanvas) endingArtCanvas = bakeSprite(makeEndingScene(), 2);
  return endingArtCanvas;
}

function showEnding(p: Parts, session: GameSession, h: HudHandles, text: string): void {
  only(p, 'ending');
  if (session.showingCreditsRoll()) {
    paintCreditsRoll(p, session, h);
    return;
  }
  paintEnding(p, session, h, text, false);
}

function showCreditsRoll(p: Parts, session: GameSession, h: HudHandles): void {
  only(p, 'ending');
  paintCreditsRoll(p, session, h);
}

function paintCreditsRoll(p: Parts, session: GameSession, h: HudHandles): void {
  clearNode(p.ending);
  p.ending.classList.add('ending-credits');
  const art = el('canvas', 'ending-art') as HTMLCanvasElement;
  const src = endingArt();
  art.width = src.width;
  art.height = src.height;
  art.getContext('2d')?.drawImage(src, 0, 0);
  const viewport = el('div', 'credits-viewport');
  const roll = el('div', 'credits-roll');
  roll.append(
    el('h2', '', UI.creditsTitle),
    el('p', 'credits-line', 'Rita Odds — timed every needle'),
    el('p', 'credits-line', 'Dona Nair — honest ice, open laje'),
    el('p', 'credits-line', 'Capitã & Fio — antenna + chase tiles'),
    el('p', 'credits-line', 'Luna — pit ledger on the feed'),
    el('p', 'credits-line', 'Mole Contact — the twist that cut'),
    el('p', 'credits-line', 'Lockbox crew — Fair stage + server cage'),
    el('p', 'credits-line', 'Augusto Casa — the house that fell'),
    el('p', 'credits-line', 'Morro · Feira · Avenida · Torre'),
    el('p', 'credits-thanks', UI.creditsThanks),
    el('p', 'credits-line', '—'),
    el('p', 'credits-line', 'Pixel neon · free / CC0 + AI art'),
    el('p', 'credits-line', 'Built with Excalibur · Vite · Playwright'),
    el('p', 'credits-thanks', 'Skip anytime — buttons stay below the roll.'),
  );
  viewport.appendChild(roll);
  p.ending.append(art, viewport);
  const actions = el('div', 'panel-actions ending-actions');
  const leaveCredits = (): void => {
    blurActive();
    session.continueExploring();
    h.syncScreen();
  };
  const skip = (): void => {
    // Jump the roll, then dismiss into free roam (Enter/E/Space/click all work).
    roll.classList.add('credits-skipped');
    leaveCredits();
  };
  actions.append(
    button(UI.skipCredits, skip),
    button(UI.continueExploring, leaveCredits),
    button(UI.playAgain, () => {
      blurActive();
      queueMicrotask(() => session.startNew());
    }),
  );
  p.ending.append(actions);
  focusFirst(p.ending);
}

function paintEnding(
  p: Parts,
  session: GameSession,
  h: HudHandles,
  text: string,
  confirming: boolean,
): void {
  clearNode(p.ending);
  p.ending.classList.remove('ending-credits');
  const art = el('canvas', 'ending-art') as HTMLCanvasElement;
  const src = endingArt();
  art.width = src.width;
  art.height = src.height;
  art.getContext('2d')?.drawImage(src, 0, 0);
  p.ending.append(
    art,
    el('h2', '', UI.wonEnding),
    el('p', '', text === UI.wonEnding ? UI.endingBlurb : text),
  );
  if (confirming) {
    p.ending.append(
      el('p', 'ending-confirm', UI.playAgainConfirm),
      button(UI.playAgainYes, () => {
        blurActive();
        queueMicrotask(() => session.startNew());
      }),
      button(UI.playAgainNo, () => paintEnding(p, session, h, text, false)),
    );
  } else {
    const actions = el('div', 'panel-actions ending-actions');
    actions.append(
      button(UI.continueExploring, () => {
        blurActive();
        session.continueExploring();
        h.syncScreen();
      }),
      button(UI.playAgain, () => paintEnding(p, session, h, text, true)),
    );
    p.ending.append(actions);
  }
  focusFirst(p.ending);
}

function blurActive(): void {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function syncFromUi(h: HudHandles, p: Parts, session: GameSession): void {
  const screen = session.ui.get();
  if (screen === 'play') h.showHud();
  if (screen === 'menu') h.showMenu(true);
  if (screen === 'travel') h.showTravel();
  if (screen === 'jobs') h.showJobs();
  if (screen === 'upgrades') h.showUpgrades();
  if (screen === 'bet') h.showBet();
  if (screen === 'skill') h.showSkill();
  if (screen === 'dialogue') h.showDialogue(session.getDialogue());
  refresh(p, session);
  paintPrompt(p.prompt, session);
}

function only(p: Parts, which: string): void {
  const map: Record<string, HTMLElement> = {
    title: p.title,
    play: p.play,
    menu: p.menu,
    dialogue: p.dialogue,
    bet: p.bet,
    skill: p.skill,
    travel: p.travel,
    jobs: p.jobs,
    upgrades: p.upgrades,
    ending: p.ending,
  };
  hideAll(Object.values(map));
  // Drop stale buttons/headings from hidden modals so focus/DOM stay clean.
  for (const [name, node] of Object.entries(map)) {
    if (name === which || name === 'play') continue;
    clearNode(node);
  }
  setVisible(map[which]!, true);
  // World E-prompt lives outside play HUD — hide it whenever a modal owns the screen.
  if (which !== 'play') setVisible(p.prompt, false);
  blurIfHidden();
}

function blurIfHidden(): void {
  const ae = document.activeElement;
  if (!(ae instanceof HTMLElement)) return;
  if (ae.closest('[aria-hidden="true"], [inert]')) ae.blur();
}

function hideAll(nodes: HTMLElement[]): void {
  for (const n of nodes) setVisible(n, false);
}

function fillTitle(panel: HTMLElement, session: GameSession): void {
  clearNode(panel);
  panel.append(
    el('h1', 'logo', UI.title),
    el('p', 'tagline', UI.tagline),
    el('p', 'version', UI.version),
    button(UI.newGame, () => {
      blurActive();
      // Defer so focus leaves the title before it becomes inert/hidden.
      queueMicrotask(() => session.startNew());
    }),
    button(UI.continue, () => {
      blurActive();
      queueMicrotask(() => {
        if (!session.tryLoad()) session.startNew();
      });
    }),
  );
}

function fillMenu(panel: HTMLElement, session: GameSession, h: HudHandles): void {
  clearNode(panel);
  panel.append(
    el('h2', '', UI.menu),
    button(UI.resume, () => {
      session.closeModal();
      h.showMenu(false);
    }),
    button(UI.travel, () => openFromMenu(session, h, 'travel')),
    button(UI.grind, () => openFromMenu(session, h, 'jobs')),
    button(UI.upgrades, () => openFromMenu(session, h, 'upgrades')),
    button(UI.mute, () => session.setMuted(!session.getAudio().muted)),
    el('p', 'hint menu-hint', menuHintFor(panel)),
  );
}

function menuHintFor(panel: HTMLElement): string {
  const mode = panel.closest('.hud')?.getAttribute('data-input-mode') ?? 'keyboard';
  if (mode === 'gamepad') return UI.hintMenuGamepad;
  if (mode === 'touch') return UI.hintMenuTouch;
  return UI.hintMenuKeyboard;
}

function openFromMenu(
  session: GameSession,
  h: HudHandles,
  kind: 'travel' | 'jobs' | 'upgrades',
): void {
  // Stay in the menu stack so Close returns here (not straight to play).
  if (kind === 'travel' && session.openTravel()) h.showTravel();
  if (kind === 'jobs' && session.openJobs()) h.showJobs();
  if (kind === 'upgrades' && session.openUpgrades()) h.showUpgrades();
}

function refresh(p: Parts, session: GameSession): void {
  const s = session.player.getStats();
  const district = session.world.get(s.districtId)?.name ?? s.districtId;
  p.stats.textContent = `${district} · ${UI.credits} ${s.credits} · ${UI.reputation} ${s.reputation}`;
  const obj = session.objective();
  p.objective.textContent = `▸ ${obj.text}`;
  p.objectiveDetail.textContent = obj.detail ?? '';
  setVisible(p.objectiveDetail, Boolean(obj.detail));
}

function paintFps(node: HTMLElement, sample: FpsSample | null): void {
  if (!sample) {
    setVisible(node, false);
    return;
  }
  const ok = sample.avgFps >= 50;
  node.className = ok ? 'fps-meter fps-ok' : 'fps-meter fps-bad';
  node.textContent = `FPS ${sample.fps} (avg ${sample.avgFps.toFixed(0)}) · ${sample.frameMs.toFixed(1)} ms`;
  setVisible(node, true);
}

function paintPrompt(prompt: HTMLElement, session: GameSession): void {
  if (!session.ui.is('play')) {
    setVisible(prompt, false);
    return;
  }
  const exit = session.nearbyExit();
  const locked = session.nearbyLockedExit();
  const npc = session.nearbyNpc();
  const alt = session.nearbyAltNpc();
  const objNpc = session.objectiveNpcInRange();
  const objHit = Boolean(objNpc && npc && npc.id === objNpc.id);
  const kind = resolveInteractPriority({
    objectiveNpcInRange: objHit,
    unlockedExitInRange: Boolean(exit),
    lockedExitInRange: Boolean(locked),
    otherNpcInRange: Boolean(npc) && !objHit,
  });
  if (kind === 'none') {
    setVisible(prompt, false);
    return;
  }
  void alt;
  const label = promptLabel(kind, npc, exit, session);
  if (!label) {
    setVisible(prompt, false);
    return;
  }
  prompt.textContent = label;
  placePrompt(prompt, session);
}

function promptVerb(npc: { id: string; name: string }): string {
  if (npc.id === 'elevator-vip') return 'E — Ride down';
  if (npc.id === 'elevator') return 'E — Ride up';
  return 'E';
}

function promptLabel(
  kind: string,
  npc: ReturnType<GameSession['nearbyNpc']>,
  exit: ReturnType<GameSession['nearbyExit']>,
  session: GameSession,
): string | null {
  if (kind === 'objective' && npc) {
    return `${promptVerb(npc)}${npc.name ? ` (${npc.name})` : ''}`;
  }
  if (kind === 'travel' && exit) {
    if (exit.id === 'avenida-to-torre') return 'E — Enter Casa Tower →';
    const dest =
      session.world.get(exit.toDistrict)?.name ?? exit.label.replace(/^Exit → /, '');
    return `E — Travel to ${dest}`;
  }
  if (kind === 'locked') return 'E — Path locked';
  if (npc) return `${promptVerb(npc)}${npc.name ? ` (${npc.name})` : ''}`;
  return null;
}

/** Anchor the E-prompt below the player; clamp inside the safe HUD inset. */
function placePrompt(prompt: HTMLElement, session: GameSession): void {
  const a = session.promptAnchor;
  const host = prompt.ownerDocument?.defaultView;
  const vw = host?.innerWidth ?? 960;
  const vh = host?.innerHeight ?? 540;
  const padX = 72;
  const padTop = 110;
  const padBot = 96;
  if (a) {
    const x = Math.min(vw - padX, Math.max(padX, Math.round(a.x)));
    const y = Math.min(vh - padBot, Math.max(padTop, Math.round(a.y + 28)));
    prompt.style.left = `${x}px`;
    prompt.style.top = `${y}px`;
    prompt.style.bottom = 'auto';
    prompt.style.transform = 'translateX(-50%)';
  } else {
    prompt.style.left = '50%';
    prompt.style.top = 'auto';
    prompt.style.bottom = '18%';
    prompt.style.transform = 'translateX(-50%)';
  }
  setVisible(prompt, true);
}

function runFlash(node: HTMLElement, kind: string): void {
  node.className = `fx-flash fx-${kind}`;
  setVisible(node, true);
  window.setTimeout(() => setVisible(node, false), 280);
}

function runCreditPopup(node: HTMLElement, delta: number): void {
  const sign = delta >= 0 ? '+' : '';
  node.className = delta >= 0 ? 'fx-credits fx-credits-up' : 'fx-credits fx-credits-down';
  node.textContent = `${sign}${delta} cr`;
  setVisible(node, true);
  window.setTimeout(() => setVisible(node, false), 900);
}

function runTransition(node: HTMLElement, kind: string, label?: string): void {
  node.className = `fx-transition fx-${kind}`;
  node.textContent =
    kind === 'elevator' ? (label ?? '▲ Elevator\nVIP Salon · Floor 42') : '';
  setVisible(node, true);
  // ~1.2s visible ride with floor indicator (matches session hold).
  const ms = kind === 'elevator' ? 1200 : 720;
  window.setTimeout(() => setVisible(node, false), ms);
}

function paintToast(toast: HTMLElement, message: string, kind: string): void {
  if (!message) {
    setVisible(toast, false);
    return;
  }
  toast.className = `toast toast-${kind}`;
  toast.textContent = message;
  setVisible(toast, true);
  window.setTimeout(() => setVisible(toast, false), 2200);
}

function applyMode(p: Parts, mode: InputMode): void {
  p.root.dataset.inputMode = mode;
  p.hints.textContent =
    mode === 'gamepad'
      ? UI.hintGamepad
      : mode === 'touch'
        ? UI.hintTouch
        : UI.hintKeyboard;
  const menuHint = p.menu.querySelector('.menu-hint');
  if (menuHint) {
    menuHint.textContent =
      mode === 'gamepad'
        ? UI.hintMenuGamepad
        : mode === 'touch'
          ? UI.hintMenuTouch
          : UI.hintMenuKeyboard;
  }
}

function navModal(
  h: HudHandles,
  p: Parts,
  session: GameSession,
  dir: 'up' | 'down' | 'confirm' | 'back',
): void {
  const panel = activePanel(p, session);
  if (!panel) return;
  if (dir === 'up') focusPrev(panel);
  if (dir === 'down') focusNext(panel);
  if (dir === 'confirm') activateFocused(panel);
  if (dir === 'back') {
    session.closeModal();
    h.syncScreen();
  }
}

function activePanel(p: Parts, session: GameSession): HTMLElement | null {
  const s = session.ui.get();
  if (s === 'menu') return p.menu;
  if (s === 'bet') return p.bet;
  if (s === 'skill') return p.skill;
  if (s === 'travel') return p.travel;
  if (s === 'jobs') return p.jobs;
  if (s === 'upgrades') return p.upgrades;
  if (s === 'dialogue') return p.dialogue;
  if (s === 'ending') return p.ending;
  if (s === 'title') return p.title;
  return null;
}
