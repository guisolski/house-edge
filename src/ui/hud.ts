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
  setInputMode: (mode: InputMode) => void;
  updatePrompt: () => void;
  setFps: (sample: FpsSample | null) => void;
  syncScreen: () => void;
  gamepadNav: (dir: 'up' | 'down' | 'confirm' | 'back') => void;
  flash: (kind: string) => void;
  creditPopup: (delta: number) => void;
  playTransition: (kind: string) => void;
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
    playTransition: (kind) => runTransition(p.transition, kind),
  };
}

function modalShows(session: GameSession, p: Parts, h: HudHandles): Partial<HudHandles> {
  return {
    showDialogue: (lines) => {
      only(p, 'dialogue');
      const offerBet = session.hasPendingStoryBet();
      paintDialogue(p.dialogue, lines, {
        offerBet,
        onAcceptBet: () => {
          session.acceptStoryBet();
          h.syncScreen();
        },
        onChoice: (setsFlag, reply) => {
          session.pickDialogueChoice(setsFlag, reply);
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
  paintEnding(p, session, h, text, false);
}

function paintEnding(
  p: Parts,
  session: GameSession,
  h: HudHandles,
  text: string,
  confirming: boolean,
): void {
  clearNode(p.ending);
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
  const obj = session.objective();
  const objHit = Boolean(npc && obj.targetName && npc.name === obj.targetName);
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
  if (kind === 'objective' && npc) {
    const verb = npc.id.startsWith('elevator') ? 'E — Use' : 'E';
    const extra = alt ? ` · also ${alt.name}` : '';
    prompt.textContent = `${verb} (${npc.name})${extra}`;
    setVisible(prompt, true);
    return;
  }
  if (kind === 'travel' && exit) {
    const dest =
      session.world.get(exit.toDistrict)?.name ?? exit.label.replace(/^Exit → /, '');
    prompt.textContent = `E — Travel to ${dest}`;
    setVisible(prompt, true);
    return;
  }
  if (kind === 'locked') {
    prompt.textContent = 'E — Path locked';
    setVisible(prompt, true);
    return;
  }
  if (npc) {
    const verb = npc.id.startsWith('elevator') ? 'E — Use' : 'E';
    const extra = alt ? ` · also ${alt.name}` : '';
    prompt.textContent = `${verb} (${npc.name})${extra}`;
    setVisible(prompt, true);
    return;
  }
  setVisible(prompt, false);
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

function runTransition(node: HTMLElement, kind: string): void {
  node.className = `fx-transition fx-${kind}`;
  node.textContent = kind === 'elevator' ? '▲ Elevator' : '';
  setVisible(node, true);
  window.setTimeout(() => setVisible(node, false), 520);
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
  if (s === 'dialogue') return p.dialogue;
  if (s === 'title') return p.title;
  return null;
}
