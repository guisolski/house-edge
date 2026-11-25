import { el, clearNode, bindPanelKeydown } from './dom';
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
  SEQ_KEYS,
  timingZone,
  type LockpickUiState,
  type SeqKey,
  type SkillPhase,
} from '../systems/minigame';

export function button(label: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'btn', label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
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
function bindEnterGate(btn: HTMLButtonElement, onKey: () => void): void {
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

export function paintDialogue(
  panel: HTMLElement,
  lines: DialogueLine[],
  opts: DialogueOpts,
): void {
  clearNode(panel);
  panel.classList.toggle('dialogue-closing', Boolean(opts.closingLine));
  const body = el('div', 'panel-body dialogue-body');
  let pendingChoices: DialogueLine['choices'] | undefined;
  let lastLine: HTMLElement | null = null;
  const visible = opts.closingLine ? lines : dialogueVisibleLines(lines);
  for (const line of visible) {
    const node = el(
      'p',
      opts.closingLine ? 'line dialogue-closing-line' : 'line',
      `${line.speaker}: ${line.text}`,
    );
    body.appendChild(node);
    lastLine = node;
    if (line.choices?.length) pendingChoices = line.choices;
  }
  const actions = el('div', 'panel-actions');
  fillDialogueActions(actions, pendingChoices, opts);
  panel.append(body, actions);
  const primary = panel.querySelector('.btn-take-bet') as HTMLElement | null;
  if (pendingChoices?.length) {
    // Playtest #32/#33: blur at open (mash-safe); after arm, focus first choice
    // so one clean Enter works without Tab.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const armAt = opts.choiceArmAt ?? Date.now();
    const delay = Math.max(0, armAt - Date.now()) + 20;
    window.setTimeout(() => {
      if (!panel.isConnected) return;
      if (opts.allowChoice && !opts.allowChoice()) return;
      const first = panel.querySelector(
        'button.dialogue-choice:not([disabled])',
      ) as HTMLButtonElement | null;
      first?.focus();
    }, delay);
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
  body.appendChild(el('p', 'skill-seq lockpick-hint', lockpickControlHint(panel)));
}

export function paintSkill(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  const progress = session.getSkillProgress();
  const bet = session.getPendingBet();
  if (!progress || !bet) return;
  const localizedDef = localizeSkillDef(bet.id, progress.def);
  const multi = progress.def.phases.length > 1;
  const phase = localizePhase(
    bet.id,
    progress.def.phases[progress.phaseIndex]!,
    progress.phaseIndex,
    multi,
  );
  const body = el('div', 'panel-body skill-body');
  const streak = session.getSkillStreak();
  const sideHustle = bet.id === 'agua-gelada' && session.story.getFlag('free_roam');
  body.append(
    el('h2', '', sideHustle ? t('ui.sideHustle.title') : localizedDef.title),
    el('p', 'bet-desc', sideHustle ? t('ui.sideHustle.descSkill') : localizedDef.blurb),
    el(
      'p',
      'stake-line',
      tf('ui.stakeAtRisk', { stake: String(session.getPendingStake()) }),
    ),
    el(
      'p',
      'skill-phase',
      tf('ui.skill.phase', {
        current: String(progress.phaseIndex + 1),
        total: String(progress.def.phases.length),
        prompt: phase?.prompt ?? '',
      }),
    ),
  );
  if (streak > 0) {
    body.appendChild(
      el('p', 'skill-streak', tf('ui.skill.combo', { streak: String(streak) })),
    );
  }
  if (phase?.clue) {
    body.appendChild(el('p', 'skill-clue', tf('ui.skill.clue', { clue: phase.clue })));
  }
  if (phase?.kind === 'lockpick' && progress.pickLeft !== undefined) {
    appendPickDurability(body, progress.pickLeft, panel);
  }
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
  const zone = timingZone(phase);
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
  if ((session.getSkillProgress()?.misses ?? 0) > 0) {
    body.appendChild(el('p', 'skill-clue skill-miss-hint', needleMissLine(session)));
  }
  let needlePos = 0;
  let settled = false;
  const step = Math.max(0.015, 0.028 * (phase.needleSpeed ?? 0.8));
  // Playtest #33: rAF wrap — avoid stuck needle at 100% from interval drift.
  let raf = 0;
  let lastTs = performance.now();
  const tickNeedle = (ts: number): void => {
    if (settled || !meter.isConnected) return;
    const dt = Math.min(48, Math.max(8, ts - lastTs));
    lastTs = ts;
    needlePos = (needlePos + step * (dt / 32)) % 1;
    if (needlePos < 0) needlePos += 1;
    needle.style.left = `${(needlePos * 100).toFixed(3)}%`;
    raf = requestAnimationFrame(tickNeedle);
  };
  raf = requestAnimationFrame(tickNeedle);
  meter.dataset.needleRaf = '1';
  const sampleNeedle = (): number => needlePos % 1;
  const stopAt = (pos: number): void => {
    if (settled) return;
    settled = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    session.submitSkill(pos % 1);
    after();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (!isConfirmKey(e) && e.code !== 'KeyE') return;
    e.preventDefault();
    e.stopPropagation();
    stopAt(sampleNeedle());
  };
  window.addEventListener('keydown', onKey, true);
  const stopBtn = button(t('ui.skill.stop'), () => stopAt(sampleNeedle()));
  stopBtn.classList.add('btn-needle-stop');
  bindEnterGate(stopBtn, () => stopAt(sampleNeedle()));
  actions.appendChild(stopBtn);
}

function paintChoiceSkill(
  actions: HTMLElement,
  options: string[],
  session: GameSession,
  after: () => void,
  phase?: SkillPhase,
): void {
  let settled = false;
  // Arm 450ms so leftover Enter from Take bet / dialogue can't pick option 0.
  const armUntil = Date.now() + 450;
  const settle = (i: number): void => {
    if (settled || Date.now() < armUntil) return;
    settled = true;
    session.submitSkill(i);
    after();
  };
  options.forEach((label, i) => {
    const btn = button(label, () => settle(i));
    btn.classList.add('skill-choice');
    bindEnterGate(btn, () => settle(i));
    btn.addEventListener(
      'keydown',
      (e) => {
        if (Date.now() >= armUntil) return;
        if (isConfirmKey(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true,
    );
    actions.appendChild(btn);
  });
  // Playtest #32: no default focus — arrow onto an offer before Enter.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  const ms = phase?.timerMs;
  if (ms && ms > 0) {
    const timer = el(
      'p',
      'skill-seq',
      tf('ui.skill.offerExpires', { s: String(Math.ceil(ms / 1000)) }),
    );
    actions.prepend(timer);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(0, ms - (Date.now() - started));
      timer.textContent =
        left > 0
          ? tf('ui.skill.offerExpires', { s: String(Math.ceil(left / 1000)) })
          : t('ui.skill.offerExpired');
      if (left <= 0) {
        window.clearInterval(tick);
        // Wrong answer on timeout — miss, then UI refreshes via after.
        settle((phase?.target ?? 0) === 0 ? 1 : 0);
      }
    }, 200);
  }
}

type LockpickState = {
  heights: number[];
  labels: HTMLButtonElement[];
  feedback: HTMLElement;
  selected: number;
  hinted: Set<number>;
  expired: boolean;
  settled: boolean;
};

function pinBars(h: number): string {
  return `${'▮'.repeat(h + 1)}${'▯'.repeat(LOCK_PIN_LEVELS - 1 - h)}`;
}

function refreshLockpick(
  state: LockpickState,
  verdicts?: ('ok' | 'low' | 'high')[],
): void {
  state.labels.forEach((btn, i) => {
    const h = state.heights[i] ?? 0;
    const hint = state.hinted.has(i) ? ` ★` : '';
    btn.textContent = `${tf('ui.skill.pinBtn', { n: String(i + 1) })}: ${pinBars(h)}${hint}`;
    btn.classList.toggle('lockpick-pin-selected', i === state.selected);
    btn.setAttribute('aria-current', i === state.selected ? 'true' : 'false');
    const v = verdicts?.[i];
    btn.classList.toggle('lockpick-pin-ok', v === 'ok');
    btn.classList.toggle('lockpick-pin-low', v === 'low');
    btn.classList.toggle('lockpick-pin-high', v === 'high');
    btn.classList.toggle('lockpick-pin-bad', v === 'low' || v === 'high');
  });
}

function lockpickVerdicts(
  heights: number[],
  target: number[],
): { verdicts: ('ok' | 'low' | 'high')[]; text: string } {
  const verdicts: ('ok' | 'low' | 'high')[] = [];
  const bits: string[] = [];
  heights.forEach((h, i) => {
    const want = target[i] ?? 0;
    if (h === want) {
      verdicts.push('ok');
      bits.push(tf('ui.skill.pinClick', { n: String(i + 1) }));
    } else if (h < want) {
      verdicts.push('low');
      bits.push(tf('ui.skill.pinLow', { n: String(i + 1) }));
    } else {
      verdicts.push('high');
      bits.push(tf('ui.skill.pinHigh', { n: String(i + 1) }));
    }
  });
  return { verdicts, text: bits.join(' · ') };
}

function persistLockpickUi(
  session: GameSession,
  state: LockpickState,
  verdicts: ('ok' | 'low' | 'high')[],
  feedback: string,
): void {
  const progress = session.getSkillProgress();
  if (!progress) return;
  const ui: LockpickUiState = {
    heights: [...state.heights],
    verdicts,
    feedback,
    hinted: [...state.hinted],
    selected: state.selected,
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
  const timerEl = el('p', 'skill-seq', '');
  body.appendChild(timerEl);
  const started = Date.now();
  const ms = phase.timerMs;
  const tick = window.setInterval(() => {
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
  persistLockpickUi(session, state, afterHint.verdicts, feedback);
  after();
}

function makeLockpickState(target: number[], saved?: LockpickUiState): LockpickState {
  return {
    heights:
      saved?.heights?.length === target.length ? [...saved.heights] : target.map(() => 0),
    labels: [],
    feedback: el(
      'p',
      'skill-clue skill-lockpick-feedback',
      saved?.feedback ?? t('ui.skill.lockpickFeedbackIdle'),
    ),
    selected: saved?.selected ?? 0,
    hinted: new Set(saved?.hinted ?? []),
    expired: false,
    settled: false,
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
    if (e.key === 'Tab' || (isConfirmKey(e) && !e.repeat)) {
      submit();
      return true;
    }
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
    const btn = button(tf('ui.skill.pinBtn', { n: String(i + 1) }), () => {
      selectPin(i);
      bumpPin(i);
    });
    btn.classList.add('lockpick-pin');
    btn.dataset.skipNav = '1';
    state.labels.push(btn);
    row.appendChild(btn);
  }
  return row;
}

function bindSequenceTimer(
  body: HTMLElement,
  session: GameSession,
  seq: SeqKey[],
  timerMs: number,
  settled: { v: boolean },
  after: () => void,
): void {
  const timerEl = el('p', 'skill-seq', '');
  body.appendChild(timerEl);
  const started = Date.now();
  const tick = window.setInterval(() => {
    const left = Math.max(0, timerMs - (Date.now() - started));
    timerEl.textContent =
      left > 0
        ? tf('ui.skill.timer', { s: String(Math.ceil(left / 1000)) })
        : t('ui.skill.timerExpiredSeq');
    if (left > 0 || settled.v) return;
    window.clearInterval(tick);
    settled.v = true;
    let p = session.getSkillProgress();
    while (p && !p.done) {
      session.submitSkill((SEQ_KEYS.indexOf(seq[0]!) + 1) % SEQ_KEYS.length);
      p = session.getSkillProgress();
    }
    after();
  }, 200);
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
  seq: SeqKey[];
  missCap: number | undefined;
  settled: { v: boolean };
  armed: { v: boolean };
  session: GameSession;
  after: () => void;
};

function flashSequence(ui: SeqUi, index: number, ms: number): void {
  ui.armed.v = false;
  ui.pattern.classList.add('skill-seq-flash');
  ui.pattern.textContent = tf('ui.skill.sequenceLabel', { seq: ui.seq.join('  ') });
  window.setTimeout(() => {
    if (!ui.body.isConnected || ui.settled.v) return;
    ui.armed.v = true;
    ui.pattern.classList.remove('skill-seq-flash');
    ui.pattern.textContent = seqRevealLabel(ui.seq, index);
  }, ms);
}

function onSequenceKey(ui: SeqUi, keyIndex: number): void {
  if (ui.settled.v || !ui.armed.v) return;
  const beforePhase = ui.session.getSkillProgress()?.phaseIndex;
  const beforeMiss = ui.session.getSkillProgress()?.misses ?? 0;
  ui.session.submitSkill(keyIndex);
  const next = ui.session.getSkillProgress();
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
    flashSequence(ui, next.seqIndex, Math.min(2200, 1500 + next.misses * 350));
    return;
  }
  ui.pattern.textContent = seqRevealLabel(ui.seq, next.seqIndex);
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
  const missCap = phase.maxMisses;
  // Playtest #31: memory flash — longer after each miss (1.5s → 2.2s).
  const flashMs = Math.min(2200, 1500 + progress.misses * 350);
  const status = el(
    'p',
    'skill-seq',
    tf('ui.skill.matchNext', {
      current: String(progress.seqIndex + 1),
      total: String(seq.length),
    }) + (missCap ? tf('ui.skill.missesFail', { n: String(missCap) }) : ''),
  );
  const pattern = el(
    'p',
    'skill-pattern skill-seq-flash',
    tf('ui.skill.sequenceLabel', { seq: seq.join('  ') }),
  );
  body.append(pattern, status);
  const ui: SeqUi = {
    body,
    pattern,
    status,
    seq,
    missCap,
    settled: { v: false },
    armed: { v: false },
    session,
    after,
  };
  flashSequence(ui, progress.seqIndex, flashMs);
  if (phase.timerMs && phase.timerMs > 0) {
    bindSequenceTimer(body, session, seq, phase.timerMs + flashMs, ui.settled, after);
  }
  const used = sequencePadKeys(seq);
  const buffer = createSequenceKeyBuffer((keyIndex) => onSequenceKey(ui, keyIndex));
  const onKey = (keyIndex: number): void => buffer.push(keyIndex);
  const pad = el('div', 'skill-seq-pad');
  for (const key of used) {
    pad.appendChild(button(key, () => onKey(SEQ_KEYS.indexOf(key))));
  }
  actions.appendChild(pad);
  actions.appendChild(el('p', 'skill-seq', t('ui.skill.escSeqHint')));
  panelKeyHook(actions, (ev) => {
    if (ev.repeat || !ui.armed.v) return;
    const sym = SEQ_KEY_CODES[ev.code];
    if (!sym || !used.includes(sym)) return;
    ev.preventDefault();
    ev.stopPropagation();
    onKey(SEQ_KEYS.indexOf(sym));
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
  btn.disabled = !unlocked;
  if (unlocked) bindEnterGate(btn, go);
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
