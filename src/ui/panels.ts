import { el, clearNode, bindPanelKeydown, onPanelDispose } from './dom';
import { UI } from './strings';
import { t, tf } from '../i18n';
import { localizePhase, localizeSkillDef } from '../i18n/localize-phase';
import { localizeBet } from '../i18n/localize-bet';
import { localizeDistrictName } from '../i18n/localize-district';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import { jobLabel, listJobs } from '../systems/grind';
import {
  formatOdds,
  formatWinChance,
  applyHouseFlavor,
  isSoftStakeBet,
} from '../systems/betting';
import { DISTRICTS } from '../content/districts';
import { UPGRADES, upgradeDescription, upgradeName } from '../systems/upgrade';
import { isConfirmKey } from '../input/keyboard';
import {
  encodePins,
  LOCK_PIN_LEVELS,
  phasePins,
  phaseSequence,
  sequencePadKeys,
  sequenceHintKey,
  sequenceInputIndex,
  sequencePadLabel,
  SEQ_KEYS,
  sequenceInputMs,
  timingZone,
  type LockpickUiState,
  type SeqKey,
  type SkillPhase,
} from '../systems/minigame';
import {
  SEQ_FULL_HOLD_MS,
  SEQ_REVEAL_STEP_MS,
  sequenceHoldProgress,
  sequenceRevealGlyphs,
  sequenceRevealPhase,
  startSequenceReveal,
  tickSequenceReveal,
} from '../systems/sequence-reveal';
import {
  needleCountdownSeconds,
  needleInCountdown,
  needleMotionStep,
  needleStartOutsideZone,
  NEEDLE_COUNTDOWN_MS,
  NEEDLE_ARM_GRACE_MS,
} from '../systems/needle-arm';
import { scaleQaMs } from '../systems/debug-qa';
import {
  formatLockpickPinVerdict,
  formatLockpickVerdictLine,
  formatSkillResultHeadline,
} from '../systems/skill-result-format';

export function button(label: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'btn', label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

/** Elevator / machine lines — no NPC name prefix (playtest #36). */
function isSystemSpeaker(speaker: string): boolean {
  const s = speaker.trim().toLowerCase();
  return (
    s === 'painel' ||
    s === 'panel' ||
    s === 'sistema' ||
    s === 'system' ||
    s === 'elevator panel' ||
    s === 'painel do elevador'
  );
}

export function focusFirst(panel: HTMLElement): void {
  const btn = panel.querySelector('button:not([disabled])') as HTMLElement | null;
  btn?.focus();
}

/** Hide lines after an unresolved choice so closing beats don't spoil the pick. */
export function dialogueVisibleLines(lines: DialogueLine[]): DialogueLine[] {
  const cut = lines.findIndex((l) => Boolean(l.choices?.length));
  if (cut < 0) return lines;
  return lines.slice(0, cut + 1);
}

type DialogueOpts = {
  onClose: () => void;
  offerBet?: boolean;
  onAcceptBet?: () => void;
  onChoice?: (setsFlag?: string, reply?: string, fails?: boolean) => void;
  choiceArmAt?: number;
  /** Playtest #31: also require key-up + modal arm (held Enter must not auto-pick). */
  allowChoice?: () => boolean;
  holdCloseUntil?: number;
  closingLine?: boolean;
};

function choiceArmReady(opts: DialogueOpts): boolean {
  return Date.now() >= (opts.choiceArmAt ?? 0);
}

function choiceKeyReady(opts: DialogueOpts): boolean {
  if (!choiceArmReady(opts)) return false;
  if (opts.allowChoice && !opts.allowChoice()) return false;
  return true;
}

/**
 * Swallow native Enter/Space activation; invoke `onKey` when ready.
 * Uses event.key so NumpadEnter counts (playtest #32).
 * Do NOT stopPropagation — window ActionState must still bump the arm.
 */
export function bindEnterGate(btn: HTMLButtonElement, onKey: () => void): void {
  btn.addEventListener(
    'keydown',
    (e) => {
      if (!isConfirmKey(e)) return;
      e.preventDefault();
      if (e.repeat) return;
      onKey();
    },
    true,
  );
}

function appendChoiceButtons(
  actions: HTMLElement,
  choices: NonNullable<DialogueLine['choices']>,
  opts: DialogueOpts,
): void {
  for (const c of choices) {
    const pickMouse = (): void => {
      if (!choiceArmReady(opts)) return;
      opts.onChoice?.(c.setsFlag, c.reply, c.fails);
    };
    const pickKey = (): void => {
      if (!choiceKeyReady(opts)) return;
      opts.onChoice?.(c.setsFlag, c.reply, c.fails);
    };
    const btn = button(c.label, () => {
      /* pointerup / key handlers */
    });
    btn.classList.add('dialogue-choice');
    btn.addEventListener('pointerup', (e) => {
      if (e.button === 0) pickMouse();
    });
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) pickKey();
    });
    bindEnterGate(btn, pickKey);
    actions.appendChild(btn);
  }
}

function appendTakeBet(actions: HTMLElement, opts: DialogueOpts): void {
  const take = button(UI.takeBet, () => {
    /* pointerup / key handlers */
  });
  take.classList.add('btn-primary', 'btn-take-bet');
  // Mouse/touch: accept immediately (Enter/keyboard stays gated).
  take.addEventListener('pointerup', (e) => {
    if (e.button === 0) opts.onAcceptBet?.();
  });
  take.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    if (!choiceKeyReady(opts)) return;
    opts.onAcceptBet?.();
  });
  bindEnterGate(take, () => {
    if (!choiceKeyReady(opts)) return;
    opts.onAcceptBet?.();
  });
  actions.append(take, button(UI.walkAway, opts.onClose));
}

function fillDialogueActions(
  actions: HTMLElement,
  choices: DialogueLine['choices'] | undefined,
  opts: DialogueOpts,
): void {
  if (choices?.length && opts.onChoice) {
    appendChoiceButtons(actions, choices, opts);
    return;
  }
  if (opts.offerBet && opts.onAcceptBet) {
    appendTakeBet(actions, opts);
    return;
  }
  const holdUntil = opts.holdCloseUntil ?? 0;
  const doClose = (): void => {
    if (Date.now() < holdUntil) return;
    opts.onClose();
  };
  const close = button(UI.close, doClose);
  if (opts.closingLine) close.classList.add('btn-closing-continue');
  bindEnterGate(close, doClose);
  if (Date.now() < holdUntil) {
    close.disabled = true;
    window.setTimeout(
      () => {
        close.disabled = false;
        close.focus();
      },
      Math.max(0, holdUntil - Date.now()),
    );
  }
  actions.appendChild(close);
}

function appendDialogueLines(
  body: HTMLElement,
  lines: DialogueLine[],
  closingLine: boolean | undefined,
): { lastLine: HTMLElement | null; pendingChoices: DialogueLine['choices'] | undefined } {
  let pendingChoices: DialogueLine['choices'] | undefined;
  let lastLine: HTMLElement | null = null;
  const visible = closingLine ? lines : dialogueVisibleLines(lines);
  const seen = new Set<string>();
  for (const line of visible) {
    const system = isSystemSpeaker(line.speaker);
    const text = system ? line.text : `${line.speaker}: ${line.text}`;
    // Playtest #47: never paint the same VIP/transcript line twice in one open.
    if (seen.has(text)) continue;
    seen.add(text);
    const cls = closingLine
      ? 'line dialogue-closing-line'
      : system
        ? 'line dialogue-system'
        : 'line';
    const node = el('p', cls, text);
    body.appendChild(node);
    lastLine = node;
    if (line.choices?.length) pendingChoices = line.choices;
  }
  return { lastLine, pendingChoices };
}

export function paintDialogue(
  panel: HTMLElement,
  lines: DialogueLine[],
  opts: DialogueOpts,
): void {
  clearNode(panel);
  panel.classList.toggle('dialogue-closing', Boolean(opts.closingLine));
  const body = el('div', 'panel-body dialogue-body');
  const { lastLine, pendingChoices } = appendDialogueLines(body, lines, opts.closingLine);
  const actions = el('div', 'panel-actions');
  fillDialogueActions(actions, pendingChoices, opts);
  panel.append(body, actions);
  const primary = panel.querySelector('.btn-take-bet') as HTMLElement | null;
  if (pendingChoices?.length) {
    // Playtest #32/#34: blur at open (mash-safe); after arm, always focus option 1
    // visually — pick still gated; a fresh (non-repeat) Enter then activates.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const armAt = opts.choiceArmAt ?? Date.now();
    const delay = Math.max(0, armAt - Date.now()) + 20;
    const focusFirstChoice = (): void => {
      if (!panel.isConnected) return;
      if (!panel.querySelector('button.dialogue-choice')) return;
      const ae = document.activeElement;
      if (ae instanceof HTMLButtonElement && panel.contains(ae)) return;
      const first = panel.querySelector(
        'button.dialogue-choice:not([disabled])',
      ) as HTMLButtonElement | null;
      first?.focus();
    };
    const focusTimer = window.setTimeout(focusFirstChoice, delay);
    // If Interact was held through the arm, re-focus on first post-arm release.
    const onUp = (e: KeyboardEvent): void => {
      if (!isConfirmKey(e) && e.code !== 'KeyE') return;
      if (Date.now() < armAt) return;
      focusFirstChoice();
      window.removeEventListener('keyup', onUp, true);
    };
    window.addEventListener('keyup', onUp, true);
    const upTimer = window.setTimeout(
      () => window.removeEventListener('keyup', onUp, true),
      4000,
    );
    onPanelDispose(panel, () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(upTimer);
      window.removeEventListener('keyup', onUp, true);
    });
  } else if (primary) primary.focus();
  else focusFirst(panel);
  requestAnimationFrame(() => {
    body.scrollTop = body.scrollHeight;
    lastLine?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function lockpickControlHint(panel: HTMLElement): string {
  const mode = panel.closest('.hud')?.getAttribute('data-input-mode') ?? 'keyboard';
  if (mode === 'gamepad') return UI.lockpickHintGamepad;
  if (mode === 'touch') return UI.lockpickHintTouch;
  return UI.lockpickHintKeyboard;
}

function appendPickDurability(
  body: HTMLElement,
  pickLeft: number,
  panel: HTMLElement,
): void {
  const pickKey =
    pickLeft === 1 ? 'ui.skill.pickDurabilityOne' : 'ui.skill.pickDurabilityMany';
  body.appendChild(el('p', 'skill-seq', tf(pickKey, { n: String(pickLeft) })));
  // Playtest #41: single compact hint (controls + legend) — no second yellow line.
  body.appendChild(el('p', 'skill-seq lockpick-hint', lockpickControlHint(panel)));
}

/** Playtest #41/#49: win/lose banner — lose never auto-closes; duel win is clear. */
function paintSkillResult(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  const result = session.getSkillResult();
  if (!result) return;
  panel.classList.add('skill-result-panel');
  const body = el('div', 'panel-body skill-body skill-result-body');
  const duel = result.skillKind === 'duel';
  const headline = duel
    ? result.won
      ? t('ui.skill.duelWinHeadline')
      : t('ui.skill.duelLoseHeadline')
    : formatSkillResultHeadline(result.won, result.creditsDelta, result.repDelta);
  const detail = duel
    ? formatSkillResultHeadline(result.won, result.creditsDelta, result.repDelta)
    : t('ui.skill.resultHint');
  body.append(
    el('h2', result.won ? 'skill-result-win' : 'skill-result-lose', headline),
    el('p', 'skill-seq', detail),
  );
  if (duel) {
    body.appendChild(el('p', 'skill-seq', t('ui.skill.resultHint')));
  }
  const dismiss = (): void => {
    session.dismissSkillResult();
    after();
  };
  const actions = el('div', 'panel-actions skill-actions');
  // Playtest #43: capitalize Continuar / Continue (not lowercase "continua").
  const cont = button(t('ui.skill.resultContinue'), dismiss);
  bindEnterGate(cont, dismiss);
  actions.appendChild(cont);
  panel.append(body, actions);
  cont.focus();
  const armUntil = Date.now() + 280;
  const onKey = (ev: KeyboardEvent): void => {
    if (!panel.isConnected) return;
    if (!isConfirmKey(ev) || ev.repeat) return;
    if (Date.now() < armUntil) return;
    ev.preventDefault();
    ev.stopPropagation();
    dismiss();
  };
  window.addEventListener('keydown', onKey, true);
  // Playtest #49: only auto-dismiss wins — lose stays until Continuar/Sair.
  const auto = result.won ? window.setTimeout(dismiss, 1600) : 0;
  onPanelDispose(panel, () => {
    if (auto) window.clearTimeout(auto);
    window.removeEventListener('keydown', onKey, true);
    panel.classList.remove('skill-result-panel');
  });
}

/** Playtest #46: soft-miss fail card — same shape as lockpick full-fail. */
function paintSkillMissCard(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  const miss = session.getSkillMissCard();
  if (!miss) return;
  panel.classList.add('skill-result-panel', 'skill-miss-panel');
  const body = el('div', 'panel-body skill-body skill-result-body');
  body.append(
    el('h2', 'skill-result-lose', miss.headline),
    el('p', 'skill-seq', miss.detail),
  );
  const actions = el('div', 'panel-actions skill-actions');
  const retry = (): void => {
    session.retrySkillMiss();
    after();
  };
  const leave = (): void => {
    session.leaveSkillMiss();
    after();
  };
  const retryBtn = button(t('ui.skill.missRetry'), retry);
  const leaveBtn = button(t('ui.skill.missLeave'), leave);
  bindEnterGate(retryBtn, retry);
  actions.append(retryBtn, leaveBtn);
  panel.append(body, actions);
  retryBtn.focus();
  session.noteModalOpened(session.isInteractHeld());
  onPanelDispose(panel, () => {
    panel.classList.remove('skill-result-panel', 'skill-miss-panel');
  });
}

function paintSkillHeader(
  body: HTMLElement,
  session: GameSession,
  betId: string,
  progress: NonNullable<ReturnType<GameSession['getSkillProgress']>>,
  phase: SkillPhase | undefined,
  panel: HTMLElement,
): string {
  const localizedDef = localizeSkillDef(betId, progress.def);
  const streak = session.getSkillStreak();
  const sideHustle = betId === 'agua-gelada' && session.story.getFlag('free_roam');
  const metaVars = {
    stake: String(session.getPendingStake()),
    current: String(progress.phaseIndex + 1),
    total: String(progress.def.phases.length),
    streak: String(streak),
  };
  const meta =
    streak > 0 ? tf('ui.skill.metaCombo', metaVars) : tf('ui.skill.meta', metaVars);
  const titleText = sideHustle ? t('ui.sideHustle.title') : localizedDef.title;
  body.append(el('h2', 'skill-title', titleText), el('p', 'skill-meta', meta));
  // Playtest #48: first-open howto line (one sentence how to win).
  const tipId = session.getLastMinigameTip();
  if (tipId) {
    body.appendChild(el('p', 'skill-howto', t(`ui.minigameTip.${tipId}`)));
    session.clearLastMinigameTip();
  }
  // Playtest #47: never duplicate the title as a subtitle/prompt.
  if (phase?.prompt && phase.prompt.trim() !== titleText.trim()) {
    body.appendChild(el('p', 'skill-seq skill-prompt', phase.prompt));
  }
  if (phase?.clue) {
    body.appendChild(
      el('p', 'skill-clue', tf('ui.skill.clueLabel', { clue: phase.clue })),
    );
  }
  if (phase?.kind === 'lockpick' && progress.pickLeft !== undefined) {
    appendPickDurability(body, progress.pickLeft, panel);
  }
  return titleText;
}

export function paintSkill(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  if (session.getSkillResult()) {
    paintSkillResult(panel, session, after);
    return;
  }
  if (session.getSkillMissCard()) {
    paintSkillMissCard(panel, session, after);
    return;
  }
  const progress = session.getSkillProgress();
  const bet = session.getPendingBet();
  if (!progress || !bet) return;
  const multi = progress.def.phases.length > 1;
  const phase = localizePhase(
    bet.id,
    progress.def.phases[progress.phaseIndex]!,
    progress.phaseIndex,
    multi,
  );
  const body = el('div', 'panel-body skill-body');
  paintSkillHeader(body, session, bet.id, progress, phase, panel);
  const actions = el('div', 'panel-actions skill-actions');
  if (phase) paintPhaseControls(body, actions, session, after, phase, progress.pickLeft);
  const cancel = button(UI.cancel, () => {
    session.cancelBet();
    after();
  });
  // Lockpick: Down cycles pins/Submit only — Esc cancels (skip Cancel in D-pad nav).
  if (phase?.kind === 'lockpick') cancel.dataset.skipNav = '1';
  actions.appendChild(cancel);
  panel.append(body, actions);
  focusSkillPanel(panel, session, phase, cancel);
}

/** Sequence → Cancel; choiceish → no default focus; else first control. */
function focusSkillPanel(
  panel: HTMLElement,
  session: GameSession,
  phase: SkillPhase | undefined,
  cancel: HTMLButtonElement,
): void {
  if (session.isSequenceSkillActive()) {
    cancel.focus();
    return;
  }
  const choiceish =
    phase?.kind === 'choice' || phase?.kind === 'puzzle' || phase?.kind === 'negotiate';
  if (choiceish) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return;
  }
  focusFirst(panel);
}

function paintPhaseControls(
  body: HTMLElement,
  actions: HTMLElement,
  session: GameSession,
  after: () => void,
  phase: SkillPhase,
  pickLeft?: number,
): void {
  if (phase.kind === 'timing') {
    paintTimingSkill(body, actions, session, after, phase);
    return;
  }
  if (phase.kind === 'lockpick') {
    paintLockpickSkill(body, actions, session, after, phase, pickLeft);
    return;
  }
  if (phase.kind === 'choice' || phase.kind === 'puzzle' || phase.kind === 'negotiate') {
    const opts =
      phase.options ??
      ([0, 1, 2].map((i) => t(`skill._fallback.option.${i}`)) as string[]);
    paintChoiceSkill(actions, opts, session, after, phase);
    return;
  }
  paintSequenceSkill(body, actions, session, after);
}

function needleMissLine(session: GameSession): string {
  const betId = session.getPendingBet()?.id;
  const keyed = betId ? t(`ui.toast.missHint.${betId}`) : '';
  return keyed && keyed !== `ui.toast.missHint.${betId}` ? keyed : UI.needleMissHint;
}

function paintTimingSkill(
  body: HTMLElement,
  actions: HTMLElement,
  session: GameSession,
  after: () => void,
  phase: SkillPhase,
): void {
  const meter = el('div', 'skill-meter');
  const needle = el('div', 'skill-needle');
  const zoneEl = el('div', 'skill-zone');
  const misses = session.getSkillProgress()?.misses ?? 0;
  const zone = timingZone(phase, misses);
  zoneEl.style.left = `${zone.lo * 100}%`;
  zoneEl.style.width = `${(zone.hi - zone.lo) * 100}%`;
  meter.append(zoneEl, needle);
  body.appendChild(meter);
  body.appendChild(
    el(
      'p',
      'skill-seq',
      tf('ui.skill.greenZone', {
        lo: String(Math.round(zone.lo * 100)),
        hi: String(Math.round(zone.hi * 100)),
      }),
    ),
  );
  // Playtest #40: defer miss hint until Já! so countdown restart clears "Errou…".
  const missHint =
    misses > 0 ? el('p', 'skill-clue skill-miss-hint', needleMissLine(session)) : null;
  if (missHint) {
    missHint.hidden = true;
    body.appendChild(missHint);
  }
  const readyLine = el('p', 'skill-seq skill-needle-ready', t('ui.skill.needleReady'));
  body.appendChild(readyLine);
  const stopAt = bindNeedleRuntime({
    meter,
    needle,
    body,
    session,
    after,
    phase,
    zoneEl,
    missHint,
  });
  // Playtest #46: Parar starts disabled/greyed; arms only after countdown + grace.
  const stopBtn = button(t('ui.skill.stop'), () => stopAt(true));
  stopBtn.classList.add('btn-needle-stop');
  stopBtn.disabled = true;
  stopBtn.setAttribute('aria-disabled', 'true');
  bindEnterGate(stopBtn, () => {
    if (stopBtn.disabled) return;
    if (!session.isNeedleInputArmed()) return;
    if (!session.allowModalConfirm(session.getLastInteractCode() ?? undefined)) return;
    stopAt(false);
  });
  actions.appendChild(stopBtn);
}

type NeedleBind = {
  meter: HTMLElement;
  needle: HTMLElement;
  body: HTMLElement;
  session: GameSession;
  after: () => void;
  phase: SkillPhase;
  zoneEl: HTMLElement;
  missHint: HTMLElement | null;
};

/** Playtest #39/#40/#43: tick + obvious ~1.5s pulse/banner on zone enter. */
function noteNeedleZoneEnter(
  session: GameSession,
  zoneEl: HTMLElement,
  pos: number,
  prev: number,
  zone: { lo: number; hi: number },
  wasIn: boolean,
): boolean {
  const inZone = pos >= zone.lo && pos <= zone.hi;
  if (inZone && !wasIn && prev <= zone.hi) {
    session.bus.emit('audio:play-sfx', { id: 'tick' });
    zoneEl.classList.remove('skill-zone-pulse');
    // Retrigger CSS animation.
    void zoneEl.offsetWidth;
    zoneEl.classList.add('skill-zone-pulse');
    const meter = zoneEl.parentElement;
    let banner = meter?.querySelector('.skill-zone-banner') as HTMLElement | null;
    if (!banner && meter) {
      banner = el('div', 'skill-zone-banner', t('ui.skill.zoneEnter'));
      meter.appendChild(banner);
    }
    if (banner) {
      banner.classList.remove('skill-zone-banner-show');
      void banner.offsetWidth;
      banner.classList.add('skill-zone-banner-show');
    }
  }
  return inZone;
}

type NeedleMotion = {
  pos: number;
  ready: boolean;
  wasInZone: boolean;
  lastTs: number;
};

function paintNeedleCountdown(
  o: NeedleBind,
  readyLine: HTMLElement | null,
  ts: number,
  motion: NeedleMotion,
): void {
  motion.lastTs = ts;
  const arm = o.session.getNeedleArm();
  const left = arm ? needleCountdownSeconds(arm, ts) : 3;
  if (readyLine) {
    readyLine.textContent = tf('ui.skill.needleCountdown', { n: String(left) });
  }
  o.needle.style.left = '0%';
  if (o.missHint) o.missHint.hidden = true;
  o.meter.dataset.needleReady = '0';
  const stop = o.body
    .closest('.skill-panel')
    ?.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
  if (stop) {
    stop.disabled = true;
    stop.setAttribute('aria-disabled', 'true');
  }
}

function stepNeedleMotion(
  o: NeedleBind,
  readyLine: HTMLElement | null,
  zone: { lo: number; hi: number },
  step: number,
  ts: number,
  motion: NeedleMotion,
): void {
  if (!motion.ready) {
    motion.ready = true;
    // Playtest #47: first frame starts outside the green zone (not an instant win).
    motion.pos = needleStartOutsideZone(zone);
    o.needle.style.left = `${(motion.pos * 100).toFixed(3)}%`;
    o.session.markNeedleMotionStarted(ts);
    o.meter.dataset.needleReady = '0'; // still in grace — not armed yet
    if (readyLine) readyLine.textContent = t('ui.skill.needleGo');
    if (o.missHint) o.missHint.hidden = false;
    motion.lastTs = ts;
  }
  // Playtest #46: arm Stop only after motion + grace.
  if (o.session.isNeedleInputArmed(ts)) {
    o.meter.dataset.needleReady = '1';
    const stop = o.body
      .closest('.skill-panel')
      ?.querySelector('.btn-needle-stop') as HTMLButtonElement | null;
    if (stop) {
      stop.disabled = false;
      stop.removeAttribute('aria-disabled');
    }
  }
  const dt = Math.min(48, Math.max(8, ts - motion.lastTs));
  motion.lastTs = ts;
  const prev = motion.pos;
  motion.pos = (motion.pos + step * (dt / 32)) % 1;
  if (motion.pos < 0) motion.pos += 1;
  o.needle.style.left = `${(motion.pos * 100).toFixed(3)}%`;
  motion.wasInZone = noteNeedleZoneEnter(
    o.session,
    o.zoneEl,
    motion.pos,
    prev,
    zone,
    motion.wasInZone,
  );
}

/** Needle rAF + confirm key — disposed with the skill panel (playtest #36/#46). */
function needleArmedForStop(o: NeedleBind): boolean {
  return o.meter.dataset.needleReady === '1' && o.session.isNeedleInputArmed();
}

function bindNeedleRuntime(o: NeedleBind): (fromPointer?: boolean) => void {
  let settled = false;
  const scale = o.session.getQaTimescale();
  const now0 = performance.now();
  o.session.beginNeedleArm(
    now0,
    scaleQaMs(NEEDLE_COUNTDOWN_MS, scale),
    scaleQaMs(NEEDLE_ARM_GRACE_MS, scale),
  );
  // Playtest #49: sweep speed respects QA timescale (same as timers).
  const step = needleMotionStep(o.phase.needleSpeed ?? 0.8, scale);
  let raf = 0;
  let onKey: (e: KeyboardEvent) => void = () => undefined;
  const readyLine = o.body.querySelector('.skill-needle-ready') as HTMLElement | null;
  const motion: NeedleMotion = {
    pos: 0,
    ready: false,
    wasInZone: false,
    lastTs: now0,
  };
  const dropNeedle = (): void => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
  };
  const zone = timingZone(o.phase, o.session.getSkillProgress()?.misses ?? 0);
  o.needle.style.left = '0%';
  o.meter.dataset.needleReady = '0';
  const tickNeedle = (ts: number): void => {
    if (settled) return;
    if (!o.meter.isConnected) {
      dropNeedle();
      return;
    }
    const arm = o.session.getNeedleArm();
    if (arm && needleInCountdown(arm, ts)) paintNeedleCountdown(o, readyLine, ts, motion);
    else stepNeedleMotion(o, readyLine, zone, step, ts, motion);
    raf = requestAnimationFrame(tickNeedle);
  };
  raf = requestAnimationFrame(tickNeedle);
  o.meter.dataset.needleRaf = '1';
  const stopAt = (fromPointer = false): void => {
    if (settled || !needleArmedForStop(o)) return;
    if (
      !fromPointer &&
      !o.session.allowModalConfirm(o.session.getLastInteractCode() ?? undefined)
    ) {
      return;
    }
    settled = true;
    dropNeedle();
    o.session.submitSkill(motion.pos % 1);
    o.after();
  };
  onKey = (e: KeyboardEvent): void => {
    if (!o.meter.isConnected) return dropNeedle();
    if (e.repeat || (!isConfirmKey(e) && e.code !== 'KeyE')) return;
    if (!needleArmedForStop(o)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    if (!o.session.allowModalConfirm(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    stopAt(false);
  };
  window.addEventListener('keydown', onKey, true);
  onPanelDispose((o.body.closest('.skill-panel') ?? o.body) as HTMLElement, dropNeedle);
  return stopAt;
}

type ChoiceSettle = {
  settled: boolean;
  armUntil: number;
  buttons: HTMLButtonElement[];
  settle: (i: number, fromPointer: boolean) => void;
  settleFocused: () => void;
};

function makeChoiceSettle(
  options: string[],
  session: GameSession,
  after: () => void,
): ChoiceSettle {
  const state: ChoiceSettle = {
    settled: false,
    armUntil: Date.now() + 450,
    buttons: [],
    settle: () => undefined,
    settleFocused: () => undefined,
  };
  state.settle = (i, fromPointer) => {
    if (state.settled || Date.now() < state.armUntil) return;
    if (!fromPointer && !session.allowModalConfirm()) return;
    if (i < 0 || i >= options.length) return;
    state.settled = true;
    session.submitSkill(i);
    after();
  };
  state.settleFocused = () => {
    const ae = document.activeElement;
    if (!(ae instanceof HTMLButtonElement)) return;
    if (!ae.classList.contains('skill-choice')) return;
    // Playtest #35: derive index from the focused control, never a stale closure.
    const i = Number(ae.dataset.choiceIndex);
    if (!Number.isFinite(i) || i < 0) return;
    state.settle(i, false);
  };
  return state;
}

function choiceIndexFromEvent(e: Event): number {
  const t = e.currentTarget;
  if (!(t instanceof HTMLButtonElement)) return -1;
  if (!t.classList.contains('skill-choice')) return -1;
  const i = Number(t.dataset.choiceIndex);
  return Number.isFinite(i) && i >= 0 ? i : -1;
}

function appendChoiceSkillButtons(
  actions: HTMLElement,
  options: string[],
  state: ChoiceSettle,
): void {
  options.forEach((label, i) => {
    const btn = button(label, () => {
      /* pointer / synthetic click */
    });
    btn.classList.add('skill-choice');
    btn.dataset.choiceIndex = String(i);
    btn.addEventListener('pointerup', (e) => {
      if (e.button === 0) state.settle(choiceIndexFromEvent(e), true);
    });
    btn.addEventListener('click', (e) => {
      // Gamepad/ActionState activateFocused() synthesizes click (detail 0).
      if (e.detail !== 0) return;
      state.settle(choiceIndexFromEvent(e), false);
    });
    // Capture + stopPropagation: prevent window ActionState from also
    // activateFocused() after settle paints the next phase (needle Stop miss).
    // Settle from the key target (not activeElement) so focus/selection can't desync.
    btn.addEventListener(
      'keydown',
      (e) => {
        // Playtest #38: E and Enter/Space both confirm VIP offer choices.
        if (!isConfirmKey(e) && e.code !== 'KeyE') return;
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        if (Date.now() < state.armUntil) return;
        state.settle(choiceIndexFromEvent(e), false);
      },
      true,
    );
    state.buttons.push(btn);
    actions.appendChild(btn);
  });
}

function paintChoiceSkill(
  actions: HTMLElement,
  options: string[],
  session: GameSession,
  after: () => void,
  phase?: SkillPhase,
): void {
  const state = makeChoiceSettle(options, session, after);
  appendChoiceSkillButtons(actions, options, state);
  // Playtest #38: keep focus on option 1 after arm — don't steal after wrong picks.
  const focusFirstChoice = (): void => {
    if (!actions.isConnected || state.settled) return;
    const ae = document.activeElement;
    if (ae instanceof HTMLButtonElement && state.buttons.includes(ae)) return;
    state.buttons[0]?.focus({ preventScroll: true });
  };
  window.setTimeout(focusFirstChoice, Math.max(0, state.armUntil - Date.now()) + 20);
  const rawMs = phase?.timerMs;
  if (!rawMs || rawMs <= 0) return;
  const ms = scaleQaMs(rawMs, session.getQaTimescale());
  const timer = el(
    'p',
    'skill-seq skill-offer-timer',
    tf('ui.skill.offerExpires', { s: String(Math.ceil(ms / 1000)) }),
  );
  actions.prepend(timer);
  const started = Date.now();
  const tick = window.setInterval(() => {
    if (!actions.isConnected) {
      window.clearInterval(tick);
      return;
    }
    const left = Math.max(0, ms - (Date.now() - started));
    if (left > 0) {
      timer.textContent = tf('ui.skill.offerExpires', {
        s: String(Math.ceil(left / 1000)),
      });
      return;
    }
    window.clearInterval(tick);
    // Playtest #38: audible timeout — never silent wrong-pick.
    timer.textContent = t('ui.skill.offerExpired');
    timer.classList.add('skill-offer-expired');
    session.bus.emit('ui:toast', {
      message: t('ui.skill.offerExpiredToast'),
      kind: 'danger',
    });
    if (state.settled) return;
    state.settled = true;
    session.failSkillOffer();
    after();
  }, 200);
  const skillPanel = actions.closest('.skill-panel') ?? actions;
  onPanelDispose(skillPanel as HTMLElement, () => window.clearInterval(tick));
}

type LockpickState = {
  heights: number[];
  labels: HTMLButtonElement[];
  /** Per-pin verdict chip under each pin (playtest #45). */
  verdictEls: HTMLElement[];
  feedback: HTMLElement;
  selected: number;
  hinted: Set<number>;
  expired: boolean;
  settled: boolean;
  /** Wall-clock start for the encounter timer (survives wrong tests). */
  timerStartedAt: number;
};

function pinBars(h: number): string {
  return `${'▮'.repeat(h + 1)}${'▯'.repeat(LOCK_PIN_LEVELS - 1 - h)}`;
}

/** Playtest #44/#49: heights + ▶ on selected pin (chips hold last-test result). */
function lockpickPinLabel(
  n: number,
  h: number,
  hinted: boolean,
  selected: boolean,
): string {
  const mark = selected ? '▶ ' : '';
  const hint = hinted ? ' ★' : '';
  return `${mark}${tf('ui.skill.pinBtn', { n: String(n) })}: ${pinBars(h)} (${h})${hint}`;
}

function refreshLockpick(
  state: LockpickState,
  verdicts?: ('ok' | 'low' | 'high')[],
): void {
  state.labels.forEach((btn, i) => {
    const h = state.heights[i] ?? 0;
    const selected = i === state.selected;
    btn.textContent = lockpickPinLabel(i + 1, h, state.hinted.has(i), selected);
    btn.classList.toggle('lockpick-pin-selected', selected);
    btn.setAttribute('aria-current', selected ? 'true' : 'false');
    // Verdict colors live on chips — pin buttons keep height readability.
    btn.classList.remove(
      'lockpick-pin-ok',
      'lockpick-pin-low',
      'lockpick-pin-high',
      'lockpick-pin-bad',
    );
    const chip = state.verdictEls[i];
    if (chip) {
      const v = verdicts?.[i];
      chip.textContent = formatLockpickPinVerdict(v);
      chip.classList.toggle('lockpick-chip-ok', v === 'ok');
      chip.classList.toggle('lockpick-chip-low', v === 'low');
      chip.classList.toggle('lockpick-chip-high', v === 'high');
      chip.classList.toggle('lockpick-chip-empty', !v);
    }
  });
}

function lockpickVerdicts(
  heights: number[],
  target: number[],
): { verdicts: ('ok' | 'low' | 'high')[]; text: string } {
  const verdicts: ('ok' | 'low' | 'high')[] = [];
  heights.forEach((h, i) => {
    const want = target[i] ?? 0;
    if (h === want) verdicts.push('ok');
    else if (h < want) verdicts.push('low');
    else verdicts.push('high');
  });
  // Playtest #45: plain line — "Pino 1 baixo, Pino 2 certo".
  return { verdicts, text: formatLockpickVerdictLine(verdicts) };
}

function persistLockpickUi(
  session: GameSession,
  state: LockpickState,
  verdicts: ('ok' | 'low' | 'high')[],
  feedback: string,
  timerStartedAt?: number,
): void {
  const progress = session.getSkillProgress();
  if (!progress) return;
  const ui: LockpickUiState = {
    heights: [...state.heights],
    verdicts,
    feedback,
    hinted: [...state.hinted],
    selected: state.selected,
    timerStartedAt: timerStartedAt ?? progress.lockpickUi?.timerStartedAt ?? Date.now(),
  };
  progress.lockpickUi = ui;
}

function applyHintIfNeeded(
  session: GameSession,
  state: LockpickState,
  target: number[],
): void {
  const misses = session.getSkillProgress()?.misses ?? 0;
  if (misses < 3) return;
  const wrong = target
    .map((_, i) => i)
    .filter((i) => !state.hinted.has(i) && (state.heights[i] ?? 0) !== (target[i] ?? 0));
  const idx = wrong[0];
  if (idx === undefined) return;
  state.hinted.add(idx);
  state.heights[idx] = target[idx]!;
}

function bindLockpickTimer(
  body: HTMLElement,
  phase: SkillPhase,
  target: number[],
  state: LockpickState,
  ctx: { cleanup: () => void; session: GameSession; after: () => void },
): void {
  if (!phase.timerMs) return;
  const timerEl = el('p', 'skill-seq skill-lockpick-timer', '');
  const row = body.querySelector('.lockpick-row');
  if (row?.parentElement === body) body.insertBefore(timerEl, row);
  else body.appendChild(timerEl);
  // Playtest #45: wrong tests remount the panel — keep the original start.
  const started = state.timerStartedAt;
  const progress = ctx.session.getSkillProgress();
  if (progress) {
    progress.lockpickUi = {
      ...(progress.lockpickUi ?? {
        heights: [...state.heights],
        verdicts: [],
        feedback: state.feedback.textContent ?? '',
        hinted: [...state.hinted],
        selected: state.selected,
      }),
      timerStartedAt: started,
    };
  }
  const ms = scaleQaMs(phase.timerMs, ctx.session.getQaTimescale());
  const tick = window.setInterval(() => {
    if (!body.isConnected) {
      window.clearInterval(tick);
      return;
    }
    const left = Math.max(0, ms - (Date.now() - started));
    timerEl.textContent =
      left > 0
        ? tf('ui.skill.timer', { s: String(Math.ceil(left / 1000)) })
        : t('ui.skill.timerExpiredPick');
    if (left > 0) return;
    window.clearInterval(tick);
    state.expired = true;
    if (state.settled) return;
    state.settled = true;
    ctx.cleanup();
    ctx.session.submitSkill(encodePins(target.map((p) => (p + 1) % LOCK_PIN_LEVELS)));
    ctx.after();
  }, 200);
  const skillPanel = body.closest('.skill-panel') ?? body;
  onPanelDispose(skillPanel as HTMLElement, () => window.clearInterval(tick));
}

function clearLockpickUi(session: GameSession): void {
  const p = session.getSkillProgress();
  if (p) p.lockpickUi = undefined;
}

function submitLockpickGuess(
  state: LockpickState,
  target: number[],
  session: GameSession,
  after: () => void,
  cleanup: () => void,
): void {
  if (state.settled || state.expired) return;
  const { verdicts, text } = lockpickVerdicts(state.heights, target);
  state.feedback.textContent = text;
  refreshLockpick(state, verdicts);
  state.settled = true;
  cleanup();
  if (verdicts.every((v) => v === 'ok')) {
    clearLockpickUi(session);
    session.submitSkill(encodePins(state.heights));
    after();
    return;
  }
  session.submitSkill(encodePins(state.heights));
  const next = session.getSkillProgress();
  if (!next || next.done) {
    after();
    return;
  }
  applyHintIfNeeded(session, state, target);
  const afterHint = lockpickVerdicts(state.heights, target);
  let feedback = afterHint.text;
  if (next.misses >= 3 && state.hinted.size > 0) {
    const hi = [...state.hinted][0]!;
    feedback = `${feedback} · ${tf('ui.skill.pinHint', {
      n: String(hi + 1),
      bars: pinBars(target[hi]!),
    })}`;
  }
  persistLockpickUi(session, state, afterHint.verdicts, feedback, state.timerStartedAt);
  after();
}

function makeLockpickState(target: number[], saved?: LockpickUiState): LockpickState {
  // Playtest #41: no idle yellow duplicate — legend lives on the cyan hint line.
  return {
    heights:
      saved?.heights?.length === target.length ? [...saved.heights] : target.map(() => 0),
    labels: [],
    verdictEls: [],
    feedback: el('p', 'skill-lockpick-feedback', saved?.feedback ?? ''),
    selected: saved?.selected ?? 0,
    hinted: new Set(saved?.hinted ?? []),
    expired: false,
    settled: false,
    timerStartedAt: saved?.timerStartedAt ?? Date.now(),
  };
}

function paintLockpickSkill(
  body: HTMLElement,
  actions: HTMLElement,
  session: GameSession,
  after: () => void,
  phase: SkillPhase,
  pickLeft?: number,
): void {
  void pickLeft;
  const target = phasePins(phase);
  const saved = session.getSkillProgress()?.lockpickUi;
  const state = makeLockpickState(target, saved);
  body.appendChild(state.feedback);
  const selectPin = (i: number): void => {
    state.selected = Math.max(0, Math.min(target.length - 1, i));
    refreshLockpick(state, saved?.verdicts);
    state.labels[state.selected]?.focus();
  };
  const bumpPin = (i: number): void => {
    if (state.expired || state.settled || state.hinted.has(i)) return;
    state.heights[i] = ((state.heights[i] ?? 0) + 1) % LOCK_PIN_LEVELS;
    refreshLockpick(state, saved?.verdicts);
  };
  let cleanup = (): void => undefined;
  const submit = (): void => submitLockpickGuess(state, target, session, after, cleanup);
  const onKey = (e: KeyboardEvent): boolean => {
    if (state.settled || state.expired || !body.isConnected) return false;
    // Playtest #35: Space raises (with ↑/W); Enter/Tab submit — match on-screen hints.
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      selectPin(state.selected - 1);
      return true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      selectPin(state.selected + 1);
      return true;
    }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
      bumpPin(state.selected);
      return true;
    }
    if (e.key === 'Tab' || (e.key === 'Enter' && !e.repeat)) {
      submit();
      return true;
    }
    return false;
  };
  const keyHandler = (e: KeyboardEvent): void => {
    if (!onKey(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  cleanup = (): void => {
    body.ownerDocument?.removeEventListener('keydown', keyHandler, true);
  };
  body.ownerDocument?.addEventListener('keydown', keyHandler, true);
  const skillPanel = body.closest('.skill-panel') ?? body;
  onPanelDispose(skillPanel as HTMLElement, cleanup);
  body.appendChild(buildLockpickRow(state, target.length, selectPin, bumpPin));
  bindLockpickTimer(body, phase, target, state, { cleanup, session, after });
  refreshLockpick(state, saved?.verdicts);
  const submitBtn = button(t('ui.skill.submitLock'), submit);
  bindEnterGate(submitBtn, submit);
  actions.appendChild(submitBtn);
  selectPin(state.selected);
}

function buildLockpickRow(
  state: LockpickState,
  count: number,
  selectPin: (i: number) => void,
  bumpPin: (i: number) => void,
): HTMLElement {
  const row = el('div', 'lockpick-row');
  for (let i = 0; i < count; i += 1) {
    const h = state.heights[i] ?? 0;
    const slot = el('div', 'lockpick-slot');
    const btn = button(
      lockpickPinLabel(i + 1, h, state.hinted.has(i), i === state.selected),
      () => {
        selectPin(i);
        bumpPin(i);
      },
    );
    btn.classList.add('lockpick-pin');
    btn.dataset.skipNav = '1';
    const verdict = el('p', 'lockpick-pin-verdict', '');
    state.labels.push(btn);
    state.verdictEls.push(verdict);
    slot.append(btn, verdict);
    row.appendChild(slot);
  }
  return row;
}

type SeqTimerCtl = {
  /** Start (or resume after reveal). */
  run: () => void;
  /** Pause during R re-show — does not add time. */
  pause: () => void;
  /** Resume after re-show with remaining ms. */
  resume: () => void;
};

function bindSequenceTimer(
  ui: SeqUi,
  timerMs: number,
  timerEl: HTMLElement,
): SeqTimerCtl {
  const { body, settled, session, after } = ui;
  let started = 0;
  let remaining = timerMs;
  let paused = true;
  let tick = 0;
  const paint = (left: number): void => {
    timerEl.textContent =
      left > 0
        ? tf('ui.skill.timer', { s: String(Math.ceil(left / 1000)) })
        : t('ui.skill.timerExpiredSeq');
  };
  const clear = (): void => {
    if (tick) window.clearInterval(tick);
    tick = 0;
  };
  const expire = (): void => {
    clear();
    if (settled.v) return;
    settled.v = true;
    session.failSkillOffer();
    after();
  };
  const startTick = (): void => {
    clear();
    tick = window.setInterval(() => {
      if (!body.isConnected) {
        clear();
        return;
      }
      if (paused) return;
      const left = Math.max(0, remaining - (Date.now() - started));
      paint(left);
      if (left > 0 || settled.v) return;
      expire();
    }, 200);
  };
  const ctl: SeqTimerCtl = {
    run: () => {
      paused = false;
      started = Date.now();
      remaining = timerMs;
      paint(remaining);
      startTick();
    },
    pause: () => {
      if (paused) return;
      remaining = Math.max(0, remaining - (Date.now() - started));
      paused = true;
      paint(remaining);
    },
    resume: () => {
      if (!paused || settled.v) return;
      paused = false;
      started = Date.now();
      paint(remaining);
      startTick();
    },
  };
  const skillPanel = body.closest('.skill-panel') ?? body;
  onPanelDispose(skillPanel as HTMLElement, clear);
  return ctl;
}

/** Mastermind: reveal matched glyphs; · for remaining. */
function seqRevealLabel(seq: SeqKey[], index: number): string {
  return tf('ui.skill.sequenceLabel', {
    seq: seq.map((k, i) => (i < index ? k : '·')).join('  '),
  });
}

type SeqUi = {
  body: HTMLElement;
  pattern: HTMLElement;
  status: HTMLElement;
  hint: HTMLElement;
  memorizeBar: HTMLElement;
  memorizeFill: HTMLElement;
  seq: SeqKey[];
  missCap: number | undefined;
  settled: { v: boolean };
  armed: { v: boolean };
  /** Playtest #45: one free re-show per attempt. */
  reshowUsed: { v: boolean };
  session: GameSession;
  after: () => void;
  startTimer?: () => void;
  pauseTimer?: () => void;
  resumeTimer?: () => void;
  /** Invalidate an in-flight reveal when re-show / miss restarts. */
  revealGen: { n: number };
};

function paintRevealFrame(
  ui: SeqUi,
  panel: HTMLElement,
  reveal: ReturnType<typeof startSequenceReveal>,
  now: number,
): void {
  // Hold phase always shows ALL glyphs (never dots).
  const shown =
    sequenceRevealPhase(reveal) === 'hold' || reveal.done
      ? reveal.seq.length
      : reveal.shown;
  ui.pattern.textContent = tf('ui.skill.sequenceLabel', {
    seq: sequenceRevealGlyphs(reveal.seq, shown),
  });
  const phase = sequenceRevealPhase(reveal);
  panel.dataset.seqPhase = phase;
  if (phase !== 'hold') return;
  ui.status.textContent = t('ui.skill.memorizeHold');
  const holdMs = scaleQaMs(SEQ_FULL_HOLD_MS, ui.session.getQaTimescale());
  ui.memorizeFill.style.width = `${Math.round(sequenceHoldProgress(reveal, now, holdMs) * 100)}%`;
}

function armSequenceInput(
  ui: SeqUi,
  panel: HTMLElement,
  index: number,
  resumeTimer: boolean,
): void {
  ui.armed.v = true;
  ui.pattern.classList.remove('skill-seq-flash');
  ui.memorizeBar.hidden = true;
  ui.memorizeFill.style.width = '100%';
  panel.dataset.seqPhase = 'input';
  ui.pattern.textContent = seqRevealLabel(ui.seq, index);
  ui.status.textContent =
    tf('ui.skill.matchNext', {
      current: String(index + 1),
      total: String(ui.seq.length),
    }) + (ui.missCap ? tf('ui.skill.missesFail', { n: String(ui.missCap) }) : '');
  updateSequenceHint(ui);
  if (resumeTimer) ui.resumeTimer?.();
  else ui.startTimer?.();
}

/**
 * Playtest #42/#45/#48: progressive reveal → explicit ≥2s hold (Memorize bar) →
 * input. Hold duration scales with ?timescale. Timer starts only after hold.
 */
function flashSequence(
  ui: SeqUi,
  index: number,
  panel: HTMLElement,
  resumeTimer = false,
): void {
  ui.armed.v = false;
  ui.revealGen.n += 1;
  const gen = ui.revealGen.n;
  ui.pattern.classList.add('skill-seq-flash');
  ui.status.textContent = t('ui.skill.memorizeSeq');
  ui.memorizeBar.hidden = false;
  ui.memorizeFill.style.width = '0%';
  panel.dataset.seqPhase = 'reveal';
  updateSequenceHint(ui);
  let reveal = startSequenceReveal(ui.seq, Date.now());
  paintRevealFrame(ui, panel, reveal, Date.now());
  const tick = window.setInterval(() => {
    if (!panel.isConnected || ui.settled.v || gen !== ui.revealGen.n) {
      window.clearInterval(tick);
      return;
    }
    const before = reveal.shown;
    const wasDone = reveal.done;
    const wasHold = sequenceRevealPhase(reveal) === 'hold';
    const scale = ui.session.getQaTimescale();
    const now = Date.now();
    reveal = tickSequenceReveal(
      reveal,
      now,
      scaleQaMs(SEQ_REVEAL_STEP_MS, scale),
      scaleQaMs(SEQ_FULL_HOLD_MS, scale),
    );
    const nowHold = sequenceRevealPhase(reveal) === 'hold';
    if (reveal.shown !== before || nowHold || wasHold || (reveal.done && !wasDone)) {
      paintRevealFrame(ui, panel, reveal, now);
    }
    if (reveal.done && !wasDone) {
      paintRevealFrame(ui, panel, reveal, now);
      window.clearInterval(tick);
      if (!ui.settled.v && gen === ui.revealGen.n) {
        armSequenceInput(ui, panel, index, resumeTimer);
      }
    }
  }, 50);
  onPanelDispose(panel, () => window.clearInterval(tick));
}

function updateSequenceHint(ui: SeqUi): void {
  const base = t(sequenceHintKey(ui.seq));
  if (ui.reshowUsed.v) {
    ui.hint.textContent = base;
    return;
  }
  ui.hint.textContent = `${base} · ${t('ui.skill.reshowHint')}`;
}

function tryReshowSequence(ui: SeqUi): boolean {
  if (ui.settled.v || ui.reshowUsed.v || !ui.armed.v) return false;
  ui.reshowUsed.v = true;
  // Playtest #47: R pauses the input timer — never adds time.
  ui.pauseTimer?.();
  updateSequenceHint(ui);
  const btn = ui.body
    .closest('.skill-panel')
    ?.querySelector('.skill-reshow-btn') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.hidden = true;
  }
  const progress = ui.session.getSkillProgress();
  const index = progress?.seqIndex ?? 0;
  const panel =
    (ui.body.closest('.skill-panel') as HTMLElement | null) ??
    (ui.body.closest('.panel') as HTMLElement | null) ??
    ui.body;
  flashSequence(ui, index, panel, true);
  return true;
}

function onSequenceKey(ui: SeqUi, keyIndex: number): void {
  if (ui.settled.v || !ui.armed.v) return;
  const beforePhase = ui.session.getSkillProgress()?.phaseIndex;
  const beforeMiss = ui.session.getSkillProgress()?.misses ?? 0;
  ui.session.submitSkill(keyIndex);
  const next = ui.session.getSkillProgress();
  // Playtest #47: soft miss → fail card (Retry/Leave), never silent replay.
  if (ui.session.getSkillMissCard()) {
    ui.settled.v = true;
    ui.after();
    return;
  }
  if (!next || next.done || next.phaseIndex !== beforePhase) {
    ui.settled.v = true;
    ui.after();
    return;
  }
  const left = ui.missCap
    ? tf('ui.skill.missesProgress', {
        current: String(next.misses),
        max: String(ui.missCap),
      })
    : '';
  ui.status.textContent =
    tf('ui.skill.matchNext', {
      current: String(next.seqIndex + 1),
      total: String(ui.seq.length),
    }) + left;
  if (next.misses > beforeMiss) {
    ui.settled.v = true;
    ui.after();
    return;
  }
  ui.pattern.textContent = seqRevealLabel(ui.seq, next.seqIndex);
}

function bindSequencePad(ui: SeqUi, actions: HTMLElement, session: GameSession): void {
  const used = sequencePadKeys(ui.seq);
  const rIsPad = used.includes('R');
  const buffer = createSequenceKeyBuffer((keyIndex) => onSequenceKey(ui, keyIndex));
  const onKey = (keyIndex: number): void => buffer.push(keyIndex);
  const pad = el('div', 'skill-seq-pad');
  for (const key of used) {
    pad.appendChild(button(sequencePadLabel(key), () => onKey(SEQ_KEYS.indexOf(key))));
  }
  const reshowBtn = button(t('ui.skill.reshowBtn'), () => {
    tryReshowSequence(ui);
  });
  reshowBtn.classList.add('skill-reshow-btn');
  ui.body.append(pad, ui.hint);
  actions.appendChild(reshowBtn);
  panelKeyHook(actions, (ev) => {
    if (ev.repeat) return;
    if (ev.code === 'KeyR' && !rIsPad && tryReshowSequence(ui)) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (!ui.armed.v) return;
    const sym = SEQ_KEY_CODES[ev.code] as SeqKey | undefined;
    if (!sym) return;
    const progressNow = session.getSkillProgress();
    const expected = progressNow
      ? phaseSequence(progressNow.def.phases[progressNow.phaseIndex]!)[
          progressNow.seqIndex
        ]
      : undefined;
    if (!expected && !used.includes(sym)) return;
    ev.preventDefault();
    ev.stopPropagation();
    onKey(expected ? sequenceInputIndex(sym, expected) : SEQ_KEYS.indexOf(sym));
  });
}

function paintSequenceSkill(
  body: HTMLElement,
  actions: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  const progress = session.getSkillProgress();
  const phase = progress?.def.phases[progress.phaseIndex];
  if (!progress || !phase) return;
  const seq = phaseSequence(phase);
  const status = el('p', 'skill-seq skill-seq-status', t('ui.skill.memorizeSeq'));
  // Playtest #47/#48: fixed-height pattern slot so reveal → hold → input does not shift.
  const pattern = el(
    'p',
    'skill-pattern skill-seq-flash skill-seq-slot',
    tf('ui.skill.sequenceLabel', { seq: sequenceRevealGlyphs(seq, 1) }),
  );
  const memorizeFill = el('span', '');
  const memorizeBar = el('div', 'skill-memorize-bar');
  memorizeBar.setAttribute('role', 'progressbar');
  memorizeBar.setAttribute('aria-label', t('ui.skill.memorizeSeq'));
  memorizeBar.appendChild(memorizeFill);
  const timerEl = el('p', 'skill-seq skill-seq-timer', '');
  const hint = el('p', 'skill-seq skill-seq-hint', '');
  body.append(pattern, memorizeBar, status, timerEl);
  const ui: SeqUi = {
    body,
    pattern,
    status,
    hint,
    memorizeBar,
    memorizeFill,
    seq,
    missCap: phase.maxMisses,
    settled: { v: false },
    armed: { v: false },
    reshowUsed: { v: false },
    revealGen: { n: 0 },
    session,
    after,
  };
  updateSequenceHint(ui);
  const inputMs = scaleQaMs(
    sequenceInputMs(seq.length, phase.timerMs),
    session.getQaTimescale(),
  );
  if (inputMs > 0) {
    const ctl = bindSequenceTimer(ui, inputMs, timerEl);
    ui.startTimer = ctl.run;
    ui.pauseTimer = ctl.pause;
    ui.resumeTimer = ctl.resume;
  }
  bindSequencePad(ui, actions, session);
  queueMicrotask(() => {
    const panel =
      (body.closest('.skill-panel') as HTMLElement | null) ??
      (body.closest('.panel') as HTMLElement | null) ??
      body;
    if (!panel.isConnected || ui.settled.v) return;
    flashSequence(ui, progress.seqIndex, panel);
  });
}

/**
 * Queue every keydown immediately so rapid taps (~150ms) never drop
 * between frame polls / UI paint.
 */
export function createSequenceKeyBuffer(submit: (keyIndex: number) => void): {
  push: (keyIndex: number) => void;
} {
  const q: number[] = [];
  let draining = false;
  return {
    push(keyIndex: number): void {
      q.push(keyIndex);
      if (draining) return;
      draining = true;
      while (q.length) submit(q.shift()!);
      draining = false;
    },
  };
}

const SEQ_KEY_CODES: Record<string, SeqKey> = {
  ArrowUp: '↑',
  ArrowRight: '→',
  ArrowDown: '↓',
  ArrowLeft: '←',
  KeyW: '↑',
  KeyD: '→',
  KeyS: '↓',
  KeyA: '←',
  KeyR: 'R',
  KeyG: 'G',
  KeyB: 'B',
  KeyY: 'Y',
};

function panelKeyHook(root: HTMLElement, handler: (ev: KeyboardEvent) => void): void {
  // Prefer the skill/bet panel root so clearNode aborts listeners on repaint.
  const panel = (root.closest('.panel') as HTMLElement | null) ?? root;
  bindPanelKeydown(panel, handler);
}

export function paintBet(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  const bet = session.getPendingBet();
  if (!bet) return;
  const body = el('div', 'panel-body');
  appendBetDetails(body, session, bet);
  panel.append(body, betActionRow(panel, session, after));
  panel.scrollTop = 0;
}

function appendBetDetails(
  panel: HTMLElement,
  session: GameSession,
  bet: NonNullable<ReturnType<GameSession['getPendingBet']>>,
): void {
  const stakeLine = el('p', 'stake-line', '');
  const losses = session.getBetLosses(bet.id);
  const story = isSoftStakeBet(bet);
  const pityStacks = story ? Math.min(2, losses) : 0;
  const writeStake = (): void => {
    stakeLine.textContent = tf('ui.stakeLine', {
      stake: String(session.getPendingStake()),
    });
  };
  writeStake();
  const sideHustle = bet.id === 'agua-gelada' && session.story.getFlag('free_roam');
  const pityPct = pityStacks > 0 ? pityStacks * 8 : 0;
  const pityStr = pityPct > 0 ? tf('ui.bet.pity', { pct: String(pityPct) }) : '';
  const localized = localizeBet(bet);
  panel.append(
    el('h2', '', sideHustle ? t('ui.sideHustle.title') : localized.title),
    el('p', 'bet-desc', sideHustle ? t('ui.sideHustle.descBet') : localized.description),
    stakeLine,
    el(
      'p',
      '',
      tf('ui.bet.winChance', {
        chance: formatWinChance(bet.odds, bet.houseEdge, losses, story),
        odds: formatOdds(bet.odds),
        pity: pityStr,
      }),
    ),
    el('p', 'bet-flavor', applyHouseFlavor(bet.houseEdge)),
    stakeControls(session, writeStake),
    el('div', 'bet-roll', t('ui.bet.readyToRoll')),
  );
}

function betActionRow(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): HTMLElement {
  const actions = el('div', 'bet-actions panel-actions');
  const confirm = button(UI.confirmBet, () => {
    animateRoll(panel, () => {
      session.confirmBet();
      after();
    });
  });
  confirm.classList.add('btn-confirm-bet', 'btn-primary');
  actions.append(
    confirm,
    button(UI.cancel, () => {
      session.cancelBet();
      after();
    }),
  );
  return actions;
}

function stakeControls(session: GameSession, writeStake: () => void): HTMLElement {
  const row = el('div', 'stake-row');
  // Mouse/touch only — Enter must never lower/raise stake (playtest #30).
  const down = button(UI.stakeDown, () => {
    session.adjustStake(-5);
    writeStake();
  });
  down.dataset.skipNav = '1';
  down.tabIndex = -1;
  const up = button(UI.stakeUp, () => {
    session.adjustStake(5);
    writeStake();
  });
  up.dataset.skipNav = '1';
  up.tabIndex = -1;
  row.append(down, up);
  return row;
}

function animateRoll(panel: HTMLElement, done: () => void): void {
  const roll = panel.querySelector('.bet-roll');
  if (roll) roll.textContent = t('ui.bet.rollAnim');
  window.setTimeout(() => {
    if (roll) roll.textContent = t('ui.bet.resolving');
    window.setTimeout(done, 160);
  }, 220);
}

export function paintTravel(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  panel.appendChild(el('h2', '', UI.travel));
  for (const d of DISTRICTS) {
    panel.appendChild(travelBtn(localizeDistrictName(d.id), d.id, session, after));
  }
  const close = button(UI.close, () => {
    if (!session.returnToMenu()) session.closeModal();
    after();
  });
  bindEnterGate(close, () => {
    if (!session.returnToMenu()) session.closeModal();
    after();
  });
  panel.appendChild(close);
}

function travelBtn(
  name: string,
  id: (typeof DISTRICTS)[number]['id'],
  session: GameSession,
  after: () => void,
): HTMLButtonElement {
  const unlocked = session.world.isUnlocked(id);
  const go = (): void => {
    if (!unlocked) return;
    session.travelTo(id);
    after();
  };
  const btn = button(unlocked ? name : `${name}${t('ui.travel.lockedSuffix')}`, go);
  btn.classList.add('travel-dest');
  btn.dataset.district = id;
  btn.disabled = !unlocked;
  if (unlocked) {
    bindEnterGate(btn, () => {
      // Gate already cleared on open; still ignore held key from Viajar Enter.
      if (!session.allowModalConfirm()) return;
      go();
    });
  }
  return btn;
}

export function paintJobs(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  panel.appendChild(el('h2', '', UI.grind));
  panel.appendChild(el('p', 'hint', t('ui.jobs.hint')));
  const s = session.player.getStats();
  const jobs = listJobs(s.districtId, s.reputation);
  if (!jobs.length) panel.appendChild(el('p', '', UI.noJobs));
  for (const job of jobs) {
    panel.appendChild(
      button(jobLabel(job), () => {
        if (job.flatPay) {
          session.doSafeJob(job.id);
          after();
          return;
        }
        if (job.betId && session.offerBet(job.betId)) after();
      }),
    );
  }
  panel.appendChild(
    button(UI.close, () => {
      if (!session.returnToMenu()) session.closeModal();
      after();
    }),
  );
}

export function paintUpgrades(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  panel.appendChild(el('h2', '', UI.upgrades));
  const credits = session.player.getStats().credits;
  for (const def of UPGRADES) {
    const level = session.upgrades.getLevel(def.id);
    const cost = session.upgrades.nextCost(def.id);
    const maxed = level >= def.maxLevel;
    const name = upgradeName(def.id);
    const label = maxed
      ? tf('ui.upgrade.maxed', { name, level: String(level) })
      : tf('ui.upgrade.row', { name, level: String(level), cost: String(cost) });
    const btn = button(label, () => {
      if (session.buyUpgrade(def.id)) paintUpgrades(panel, session, after);
    });
    btn.disabled = maxed || !session.upgrades.canBuy(def.id, credits);
    panel.append(btn, el('p', 'hint', upgradeDescription(def.id)));
  }
  panel.appendChild(
    button(UI.close, () => {
      if (!session.returnToMenu()) session.closeModal();
      after();
    }),
  );
}
