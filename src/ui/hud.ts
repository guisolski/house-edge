import { el, clearNode, setVisible, onPanelDispose } from './dom';
import { UI } from './strings';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import type { InputMode } from '../systems/input-mode';
import { focusNext, focusPrev, activateFocused } from './focus';
import {
  bindEnterGate,
  button,
  focusFirst,
  paintBet,
  paintDialogue,
  paintJobs,
  paintSkill,
  paintTravel,
  paintUpgrades,
} from './panels';
import { handleTabTrap } from './focus';
import { bakeSprite } from '../rendering/bake';
import { makeEndingScene } from '../rendering/pixel-gen';
import type { FpsSample } from '../rendering/fps';
import { resolveInteractPriority } from '../systems/interact-priority';
import { getLocale, setLocale, t, tf, type LocaleCode } from '../i18n';
import { localizeDistrictName } from '../i18n/localize-district';
import { isConfirmKey } from '../input/keyboard';
import {
  tutorialCopyKey,
  tutorialStepCount,
  type TutorialStepId,
} from '../systems/tutorial';

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
  showTutorial: (active: boolean) => void;
  setInputMode: (mode: InputMode) => void;
  updatePrompt: () => void;
  setFps: (sample: FpsSample | null) => void;
  syncScreen: () => void;
  gamepadNav: (dir: 'up' | 'down' | 'confirm' | 'back') => void;
  flash: (kind: string) => void;
  creditPopup: (delta: number) => void;
  playTransition: (kind: string, label?: string) => void;
  /** Playtest #44: big centered district name for ~1.5s after fade. */
  showDistrictBanner: (districtId: string) => void;
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
  tutorial: HTMLElement;
  districtBanner: HTMLElement;
};

export function createHud(session: GameSession, mount: HTMLElement): HudHandles {
  const parts = emptyParts();
  const handles = makeHandles(session, parts);
  wireDom(session, parts, handles);
  // Playtest #34: Tab never escapes open modals into browser chrome.
  window.addEventListener(
    'keydown',
    (ev) => {
      handleTabTrap(activePanel(parts, session), ev);
    },
    true,
  );
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
    tutorial: el('div', 'tutorial-panel'),
    districtBanner: el('div', 'district-zone-banner', ''),
  };
}

function wireDom(session: GameSession, p: Parts, h: HudHandles): void {
  p.play.append(p.stats, p.objective, p.objectiveDetail, p.hints);
  setVisible(p.fps, false);
  setVisible(p.flash, false);
  setVisible(p.creditsFx, false);
  setVisible(p.transition, false);
  setVisible(p.districtBanner, false);
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
    p.tutorial,
    p.flash,
    p.creditsFx,
    p.transition,
    p.districtBanner,
  );
  setVisible(p.tutorial, false);
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
      for (const btn of p.title.querySelectorAll('button')) {
        if (btn.textContent === UI.continue) {
          // Playtest #47: keep Continue focusable (aria-disabled) so ArrowDown
          // moves focus before the language row even when there is no save.
          const b = btn as HTMLButtonElement;
          b.disabled = false;
          b.setAttribute('aria-disabled', hasSave ? 'false' : 'true');
          b.classList.toggle('is-disabled', !hasSave);
        }
      }
    },
    showHud: () => {
      only(p, 'play');
      refresh(p, session);
      // Restore tutorial corner card when returning to play (if still active).
      if (session.tutorialIsPanelVisible()) h.showTutorial(true);
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
    showDistrictBanner: (districtId) => runDistrictBanner(p.districtBanner, districtId),
    showTutorial: (active) => paintTutorial(p, session, h, active),
  };
}

function focusCanvasAfterClose(): void {
  blurActive();
  const canvas = document.querySelector(
    'canvas.world-canvas, canvas.engine-canvas',
  ) as HTMLCanvasElement | null;
  canvas?.focus({ preventScroll: true });
}

/** Stable id for the live skill/result panel — used to avoid mid-reveal remounts. */
function skillPanelSignature(session: GameSession): string {
  const result = session.getSkillResult();
  if (result) {
    return `result:${result.won}:${result.creditsDelta}:${result.repDelta}`;
  }
  const miss = session.getSkillMissCard();
  if (miss) {
    return `miss:${miss.headline}:${miss.detail}`;
  }
  const progress = session.getSkillProgress();
  const betId = session.getPendingBet()?.id ?? '';
  if (!progress || !betId) return '';
  return `${betId}:${progress.phaseIndex}:${progress.seqIndex}:${progress.misses}:${progress.cleared}`;
}

function showDialoguePanel(
  session: GameSession,
  p: Parts,
  h: HudHandles,
  lines: DialogueLine[],
): void {
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
  // Playtest #40/#43: choices always time-arm. Offer-bet from a choice pick
  // also time-arms (Enter leak). Offer-bet opened via E from play uses held-key
  // arm only so the first fresh Enter Takes the bet (Antena / Esc re-open).
  const heldCodes = session.heldInteractCodes();
  const offerNeedsTimeArm = offerBet && !session.isDialogueFromPlay();
  if (hasChoice || offerNeedsTimeArm) {
    session.noteModalOpened(session.isInteractHeld(), heldCodes);
  } else {
    session.armPlainDialogueAdvance(heldCodes);
  }
  // Choice mash arm short enough that a 300ms e2e wait then Enter advances.
  const choiceArmAt = Date.now() + (epi && hasChoice ? 500 : 250);
  // Playtest #40: epilogue Fechar — brief hold, not a 3s swallow.
  const holdCloseUntil = closingOnly ? Date.now() + 400 : undefined;
  paintDialogue(p.dialogue, lines, {
    offerBet,
    choiceArmAt: hasChoice || offerNeedsTimeArm ? choiceArmAt : 0,
    allowChoice: () => session.allowModalConfirm(),
    holdCloseUntil,
    closingLine: closingOnly,
    onAcceptBet: () => {
      // Mouse/touch click always accepts — Enter confirm stays gated in wiring.
      session.acceptStoryBet();
      h.syncScreen();
    },
    onChoice: (setsFlag, reply, fails) => {
      session.pickDialogueChoice(setsFlag, reply, fails);
      if (fails || session.ui.is('play')) {
        focusCanvasAfterClose();
        h.syncScreen();
        h.showHud();
        return;
      }
      h.showDialogue(session.getDialogue());
    },
    onClose: () => {
      if (holdCloseUntil && Date.now() < holdCloseUntil) return;
      session.closeModal();
      focusCanvasAfterClose();
      // Epilogue Close → credits: do not showHud (wipes the roll).
      if (session.ui.is('ending')) {
        h.syncScreen();
        return;
      }
      h.syncScreen();
      h.showHud();
    },
  });
}

function modalShows(session: GameSession, p: Parts, h: HudHandles): Partial<HudHandles> {
  return {
    showDialogue: (lines) => showDialoguePanel(session, p, h, lines),
    showMenu: (open) => toggleMenu(p, open, session, h),
    showBet: () => {
      only(p, 'bet');
      paintBet(p.bet, session, () => h.syncScreen());
      // Playtest #30: focus Confirm — never Stake − (Enter would lower).
      const confirm = p.bet.querySelector('.btn-confirm-bet') as HTMLElement | null;
      if (confirm) confirm.focus();
      else focusFirst(p.bet);
      // Playtest #33: arm without quiet when key up — first post-arm Enter confirms.
      session.noteModalOpened(session.isInteractHeld());
    },
    showSkill: () => {
      only(p, 'skill');
      // Playtest #42: skip remount while the same phase/result is live — remounting
      // orphaned sequence-reveal timers and left input locked forever.
      const sig = skillPanelSignature(session);
      if (sig && p.skill.dataset.heSkillSig === sig && p.skill.childElementCount > 0) {
        return;
      }
      if (sig) p.skill.dataset.heSkillSig = sig;
      else delete p.skill.dataset.heSkillSig;
      // Playtest #35: paintSkill owns focus for choice/puzzle/negotiate (mash-safe).
      paintSkill(p.skill, session, () => h.syncScreen());
      // Playtest #51: re-assert Para! focus after modal arm (sync can steal it).
      queueMicrotask(() => {
        const stop = p.skill.querySelector('.btn-needle-stop') as HTMLElement | null;
        if (stop) stop.focus({ preventScroll: true });
      });
      // Playtest #40: mark only keys still held — don't force a ghost needsRelease.
      session.noteModalOpened(session.isInteractHeld(), session.heldInteractCodes());
    },
    showTravel: () => {
      only(p, 'travel');
      paintTravel(p.travel, session, () => h.syncScreen());
      // Playtest #37: clear mash arm + land focus on first destination so
      // Enter works on the first open (no Esc/reopen).
      session.clearModalConfirmGate();
      focusTravelDest(p.travel);
    },
    showJobs: () => {
      only(p, 'jobs');
      paintJobs(p.jobs, session, () => h.syncScreen());
      session.clearModalConfirmGate();
      focusFirst(p.jobs);
    },
    showUpgrades: () => {
      only(p, 'upgrades');
      paintUpgrades(p.upgrades, session, () => h.syncScreen());
      session.clearModalConfirmGate();
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
    session.clearModalConfirmGate();
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

/** Focus first unlocked destination; re-assert after menu teardown blur. */
function focusTravelDest(panel: HTMLElement): void {
  const first = panel.querySelector(
    'button.travel-dest:not([disabled]), button:not([disabled])',
  ) as HTMLElement | null;
  first?.focus({ preventScroll: true });
  queueMicrotask(() => {
    if (!panel.isConnected || panel.hidden) return;
    if (panel.contains(document.activeElement)) return;
    first?.focus({ preventScroll: true });
  });
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

function buildCreditsRollBody(): { viewport: HTMLElement; roll: HTMLElement } {
  const viewport = el('div', 'credits-viewport');
  const roll = el('div', 'credits-roll');
  const creditLines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .map((i) => t(`ui.credits.line.${i}`).trim())
    .filter((text) => text.length > 0 && text !== '—')
    .map((text) => el('p', 'credits-line', text));
  roll.append(
    el('h2', '', UI.creditsTitle),
    ...creditLines.slice(0, 8),
    el('p', 'credits-thanks', UI.creditsThanks),
    ...creditLines.slice(8),
    el('p', 'credits-thanks', t('ui.credits.skipHint')),
  );
  viewport.appendChild(roll);
  return { viewport, roll };
}

function armCreditsLeaveButtons(
  ending: HTMLElement,
  session: GameSession,
  btns: HTMLButtonElement[],
  focusBtn: HTMLButtonElement,
): void {
  const armUntil = Date.now() + 900;
  for (const b of btns) b.disabled = true;
  ending.dataset.creditsArm = '0';
  window.setTimeout(
    () => {
      ending.dataset.creditsArm = '1';
      for (const b of btns) b.disabled = false;
      focusBtn.focus();
      session.clearModalConfirmGate();
    },
    Math.max(0, armUntil - Date.now()),
  );
}

function paintCreditsRoll(p: Parts, session: GameSession, h: HudHandles): void {
  clearNode(p.ending);
  p.ending.classList.add('ending-credits');
  const art = el('canvas', 'ending-art') as HTMLCanvasElement;
  const src = endingArt();
  art.width = src.width;
  art.height = src.height;
  art.getContext('2d')?.drawImage(src, 0, 0);
  const { viewport, roll } = buildCreditsRollBody();
  p.ending.append(art, viewport);
  const actions = el('div', 'panel-actions ending-actions');
  // Playtest #46: block ALL leave paths until arm — Fechar Enter must not skip credits.
  const leaveCredits = (): void => {
    if (p.ending.dataset.creditsArm !== '1') return;
    blurActive();
    session.continueExploring();
    const canvas = document.querySelector(
      'canvas.world-canvas, canvas.engine-canvas',
    ) as HTMLCanvasElement | null;
    canvas?.focus({ preventScroll: true });
    h.syncScreen();
    h.showHud();
  };
  const doSkip = (): void => {
    if (p.ending.dataset.creditsArm !== '1') return;
    roll.classList.add('credits-skipped');
    leaveCredits();
  };
  const skipBtn = button(UI.skipCredits, doSkip);
  skipBtn.addEventListener(
    'keydown',
    (e) => {
      if (!isConfirmKey(e) || e.repeat) return;
      e.preventDefault();
      doSkip();
    },
    true,
  );
  const contBtn = button(UI.continueExploring, leaveCredits);
  contBtn.classList.add('btn-continue-exploring');
  const againBtn = button(UI.playAgain, () => {
    if (p.ending.dataset.creditsArm !== '1') return;
    paintEnding(p, session, h, UI.wonEnding, true);
  });
  armCreditsLeaveButtons(p.ending, session, [skipBtn, contBtn, againBtn], skipBtn);
  actions.append(skipBtn, contBtn, againBtn);
  p.ending.append(actions);
  session.noteModalOpened(true);
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
    p.ending.dataset.endingConfirm = '1';
    const yes = button(UI.playAgainYes, () => {
      blurActive();
      queueMicrotask(() => session.startNew());
    });
    const no = button(UI.playAgainNo, () => paintEnding(p, session, h, text, false));
    bindEnterGate(yes, () => yes.click());
    bindEnterGate(no, () => no.click());
    p.ending.append(el('p', 'ending-confirm', UI.playAgainConfirm), yes, no);
    session.noteModalOpened(session.isInteractHeld());
  } else {
    delete p.ending.dataset.endingConfirm;
    const actions = el('div', 'panel-actions ending-actions');
    const goExplore = (): void => {
      blurActive();
      session.continueExploring();
      h.syncScreen();
    };
    const cont = button(UI.continueExploring, goExplore);
    cont.classList.add('btn-continue-exploring');
    const again = button(UI.playAgain, () => paintEnding(p, session, h, text, true));
    bindEnterGate(cont, goExplore);
    bindEnterGate(again, () => again.click());
    actions.append(cont, again);
    p.ending.append(actions);
    // Playtest #34: victory must accept Enter/Space/E immediately — clear mash arm.
    session.clearModalConfirmGate();
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
  if (screen === 'ending') {
    if (session.showingCreditsRoll()) h.showCreditsRoll();
    else h.showEnding(UI.wonEnding);
  }
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
  // Playtest #27: tutorial must never draw over dialogs / menu / minigames.
  if (which !== 'play') {
    setVisible(p.tutorial, false);
  }
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

function saveAllowsCredits(): boolean {
  try {
    const raw = localStorage.getItem('house-edge-save-v1');
    if (!raw) return false;
    const data = JSON.parse(raw) as { flags?: Record<string, boolean> };
    return Boolean(data.flags?.epilogue_done || data.flags?.casa_quebrada);
  } catch {
    return false;
  }
}

function applyContinueAria(panel: HTMLElement): void {
  let hasSave = false;
  try {
    hasSave = Boolean(localStorage.getItem('house-edge-save-v1'));
  } catch {
    /* privacy / quota */
  }
  for (const btn of panel.querySelectorAll('button')) {
    if (btn.textContent !== UI.continue) continue;
    const b = btn as HTMLButtonElement;
    b.disabled = false;
    b.setAttribute('aria-disabled', hasSave ? 'false' : 'true');
    b.classList.toggle('is-disabled', !hasSave);
  }
}

function fillTitle(panel: HTMLElement, session: GameSession): void {
  clearNode(panel);
  const kids: HTMLElement[] = [
    el('h1', 'logo', UI.title),
    el('p', 'tagline', UI.tagline),
    el('p', 'version', UI.version),
    button(UI.newGame, () => {
      blurActive();
      queueMicrotask(() => session.startNew());
    }),
    button(UI.continue, () => {
      const cont = [...panel.querySelectorAll('button')].find(
        (b) => b.textContent === UI.continue,
      );
      if (cont?.getAttribute('aria-disabled') === 'true') return;
      blurActive();
      queueMicrotask(() => {
        if (!session.tryLoad()) session.startNew();
      });
    }),
  ];
  if (session.canRewatchCredits() || saveAllowsCredits()) {
    kids.push(
      button(UI.credits, () => {
        blurActive();
        queueMicrotask(() => {
          if (!session.canRewatchCredits()) session.tryLoad();
          if (!session.openCreditsRoll()) return;
          const he = (window as unknown as { __HOUSE_EDGE__?: { hud?: HudHandles } })
            .__HOUSE_EDGE__;
          he?.hud?.syncScreen();
        });
      }),
    );
  }
  kids.push(
    langRow((code) => {
      setLocale(code);
      fillTitle(panel, session);
    }),
  );
  panel.append(...kids);
  applyContinueAria(panel);
  const primary = [...panel.querySelectorAll('button')].find(
    (b) => !b.closest('.lang-row'),
  ) as HTMLButtonElement | undefined;
  if (primary) primary.focus();
  else focusFirst(panel);
}

function langRow(onPick: (code: LocaleCode) => void): HTMLElement {
  const row = el('div', 'lang-row');
  // Playtest #47: focus starts on New Game; Up/Down move focus. Left/Right on
  // this row (see wiring handleTitleAction) changes locale without Enter.
  row.append(
    el('span', 'lang-label', UI.language),
    button(UI.languageEn, () => onPick('en')),
    button(UI.languagePt, () => onPick('pt-BR')),
  );
  const cur = getLocale();
  for (const b of row.querySelectorAll('button')) {
    const isEn = b.textContent === UI.languageEn;
    b.classList.toggle(
      'lang-active',
      (isEn && cur === 'en') || (!isEn && cur === 'pt-BR'),
    );
  }
  return row;
}

function fillMenu(panel: HTMLElement, session: GameSession, h: HudHandles): void {
  clearNode(panel);
  delete panel.dataset.menuConfirm;
  const items: HTMLElement[] = [
    el('h2', '', UI.menu),
    button(UI.resume, () => {
      session.closeModal();
      h.showMenu(false);
    }),
    button(UI.travel, () => openFromMenu(session, h, 'travel')),
    button(UI.grind, () => openFromMenu(session, h, 'jobs')),
    button(UI.upgrades, () => openFromMenu(session, h, 'upgrades')),
  ];
  // Playtest #46: Esc menu Créditos after first completion.
  if (session.canRewatchCredits()) {
    items.push(
      button(UI.credits, () => {
        session.closeModal();
        h.showMenu(false);
        if (!session.openCreditsRoll()) return;
        h.syncScreen();
      }),
    );
  }
  items.push(
    button(UI.settings, () => {
      clearNode(panel);
      delete panel.dataset.menuConfirm;
      panel.append(
        el('h2', '', UI.settings),
        langRow((code) => {
          setLocale(code);
          fillMenu(panel, session, h);
          h.updateStats();
        }),
        button(UI.playAgain, () => {
          clearNode(panel);
          panel.dataset.menuConfirm = '1';
          panel.append(
            el('p', 'ending-confirm', UI.playAgainConfirm),
            button(UI.playAgainYes, () => {
              blurActive();
              queueMicrotask(() => session.startNew());
            }),
            button(UI.playAgainNo, () => fillMenu(panel, session, h)),
          );
          focusFirst(panel);
        }),
        button(UI.resume, () => {
          session.closeModal();
          h.showMenu(false);
        }),
      );
      focusFirst(panel);
    }),
    button(UI.mute, () => session.setMuted(!session.getAudio().muted)),
    el('p', 'hint menu-hint', menuHintFor(panel)),
  );
  panel.append(...items);
  focusFirst(panel);
}

function paintTutorial(
  p: Parts,
  session: GameSession,
  h: HudHandles,
  active: boolean,
): void {
  if (!active || !session.tutorialIsPanelVisible()) {
    clearNode(p.tutorial);
    setVisible(p.tutorial, false);
    return;
  }
  const step = session.tutorialStep() as TutorialStepId | null;
  if (!step) {
    clearNode(p.tutorial);
    setVisible(p.tutorial, false);
    return;
  }
  const mode = (p.root.dataset.inputMode as InputMode) || 'keyboard';
  const tut = session.getTutorial();
  const idx = tut.stepIndex + 1;
  clearNode(p.tutorial);
  const keysHint =
    mode === 'gamepad'
      ? t('ui.tutorialKeysGamepad')
      : mode === 'touch'
        ? t('ui.tutorialKeysTouch')
        : t('ui.tutorialKeys');
  p.tutorial.append(
    el('h2', '', `${UI.story} (${idx}/${tutorialStepCount()})`),
    el('p', 'tutorial-body', t(tutorialCopyKey(step, mode))),
    el('p', 'tutorial-keys hint', keysHint),
  );
  const actions = el('div', 'panel-actions');
  const last = idx >= tutorialStepCount();
  const advance = (): void => {
    session.advanceTutorialStep();
    h.showTutorial(session.tutorialIsPanelVisible());
  };
  actions.append(
    button(UI.tutorialSkip, () => {
      session.skipTutorialNow();
      h.showTutorial(false);
    }),
    button(last ? UI.tutorialDone : UI.tutorialNext, advance),
  );
  p.tutorial.append(actions);
  // Tab / gamepad Y = next without stealing WASD/E from the world.
  // Playtest #36: dispose on clearNode so step advances never stack listeners.
  const onKey = (ev: KeyboardEvent): void => {
    if (!p.tutorial.isConnected || p.tutorial.hasAttribute('hidden')) return;
    if (ev.key === 'Tab' || ev.code === 'Tab' || ev.code === 'KeyY') {
      ev.preventDefault();
      ev.stopPropagation();
      advance();
    }
  };
  window.addEventListener('keydown', onKey, true);
  onPanelDispose(p.tutorial, () => window.removeEventListener('keydown', onKey, true));
  setVisible(p.tutorial, true);
  // Keep focus on the canvas so WASD/E reach the world; buttons stay clickable.
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
  const district = localizeDistrictName(s.districtId);
  p.stats.textContent = `${district} · ${UI.credits} ${s.credits} · ${UI.reputation} ${s.reputation}`;
  const obj = session.objective();
  p.objective.textContent = `▸ ${obj.text}`;
  p.objectiveDetail.textContent = obj.detail ?? '';
  setVisible(p.objectiveDetail, Boolean(obj.detail));
  // Locale may have changed on the title screen — keep hint line in sync.
  const mode = (p.root.dataset.inputMode as InputMode) || 'keyboard';
  applyMode(p, mode);
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
  if (npc.id === 'elevator-vip') return t('ui.promptRideDown');
  if (npc.id === 'elevator') return t('ui.promptRideUp');
  return 'E';
}

function promptNamed(npc: { id: string; name: string }): string {
  const verb = promptVerb(npc);
  // Playtest #36: nameplates already show the NPC — keep the E chip short.
  if (npc.id === 'elevator' || npc.id === 'elevator-vip') return verb;
  return verb;
}

function promptLabel(
  kind: string,
  npc: ReturnType<GameSession['nearbyNpc']>,
  exit: ReturnType<GameSession['nearbyExit']>,
  _session: GameSession,
): string | null {
  if (kind === 'objective' && npc) return promptNamed(npc);
  if (kind === 'travel' && exit) {
    if (exit.id === 'avenida-to-torre') return t('ui.promptEnterTower');
    return tf('ui.promptTravel', { dest: localizeDistrictName(exit.toDistrict) });
  }
  if (kind === 'locked') return t('ui.promptPathLocked');
  if (npc) return promptNamed(npc);
  return null;
}

/** Anchor the E-prompt below the player; clamp fully inside the viewport. */
function placePrompt(prompt: HTMLElement, session: GameSession): void {
  const a = session.promptAnchor;
  const host = prompt.ownerDocument?.defaultView;
  const vw = host?.innerWidth ?? 960;
  const vh = host?.innerHeight ?? 540;
  const padTop = 110;
  const padBot = 96;
  setVisible(prompt, true);
  // Always follow the player anchor when present — never leave a second
  // fixed chip at bottom-right while the live prompt sits on Rita (#36).
  const ax = a?.x ?? vw / 2;
  const ay = a?.y ?? vh * 0.55;
  const pw = Math.max(prompt.offsetWidth || 0, 48);
  const half = pw / 2;
  const margin = 12;
  const x = Math.min(vw - half - margin, Math.max(half + margin, Math.round(ax)));
  const y = Math.min(vh - padBot, Math.max(padTop, Math.round(ay + 28)));
  prompt.style.left = `${x}px`;
  prompt.style.top = `${y}px`;
  prompt.style.bottom = 'auto';
  prompt.style.transform = 'translateX(-50%)';
}

function runFlash(node: HTMLElement, kind: string): void {
  node.className = `fx-flash fx-${kind}`;
  setVisible(node, true);
  window.setTimeout(() => setVisible(node, false), 280);
}

function runCreditPopup(node: HTMLElement, delta: number): void {
  // Playtest #42/#43: result card owns the delta — never overlap the card.
  if (
    document.querySelector('.skill-result-panel, .skill-result-body') ||
    document.querySelector(
      '.skill-panel:not([hidden]) .skill-result-win, .skill-panel:not([hidden]) .skill-result-lose',
    )
  ) {
    return;
  }
  const sign = delta >= 0 ? '+' : '';
  node.className = delta >= 0 ? 'fx-credits fx-credits-up' : 'fx-credits fx-credits-down';
  node.textContent = `${sign}${delta} cr`;
  setVisible(node, true);
  window.setTimeout(() => setVisible(node, false), 900);
}

function runTransition(node: HTMLElement, kind: string, label?: string): void {
  node.className = `fx-transition fx-${kind}`;
  node.textContent = kind === 'elevator' ? (label ?? t('ui.elevatorCard.vip')) : '';
  setVisible(node, true);
  // ~1.2s visible ride with floor indicator (matches session hold).
  const ms = kind === 'elevator' ? 1200 : 720;
  window.setTimeout(() => setVisible(node, false), ms);
}

/** Playtest #44: big centered zone-name banner after district fade (~1.5s). */
function runDistrictBanner(node: HTMLElement, districtId: string): void {
  const name = localizeDistrictName(districtId);
  node.className = 'district-zone-banner district-zone-banner-show';
  node.textContent = name;
  setVisible(node, true);
  window.setTimeout(() => {
    setVisible(node, false);
    node.classList.remove('district-zone-banner-show');
  }, 1500);
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
  if (dir === 'confirm') {
    if (!session.allowModalConfirm(session.getLastInteractCode() ?? undefined)) return;
    activateFocused(panel);
  }
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
  if (s === 'play' && session.tutorialIsPanelVisible()) return p.tutorial;
  return null;
}
