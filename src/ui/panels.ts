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
import {
  encodePins,
  LOCK_PIN_LEVELS,
  phasePins,
  phaseSequence,
  SEQ_KEYS,
  timingZone,
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
  onChoice?: (setsFlag?: string, reply?: string) => void;
  choiceArmAt?: number;
  holdCloseUntil?: number;
  closingLine?: boolean;
};

function fillDialogueActions(
  actions: HTMLElement,
  choices: DialogueLine['choices'] | undefined,
  opts: DialogueOpts,
): void {
  if (choices?.length && opts.onChoice) {
    const armAt = opts.choiceArmAt ?? 0;
    for (const c of choices) {
      const btn = button(c.label, () => {
        if (Date.now() < armAt) return;
        opts.onChoice?.(c.setsFlag, c.reply);
      });
      btn.classList.add('dialogue-choice');
      btn.addEventListener(
        'keydown',
        (e) => {
          if (Date.now() >= armAt) return;
          if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
      actions.appendChild(btn);
    }
    return;
  }
  if (opts.offerBet && opts.onAcceptBet) {
    const take = button(UI.takeBet, opts.onAcceptBet);
    take.classList.add('btn-primary', 'btn-take-bet');
    actions.append(take, button(UI.walkAway, opts.onClose));
    return;
  }
  const holdUntil = opts.holdCloseUntil ?? 0;
  const close = button(UI.close, () => {
    if (Date.now() < holdUntil) return;
    opts.onClose();
  });
  if (opts.closingLine) close.classList.add('btn-closing-continue');
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
  if (primary) primary.focus();
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
  // Sequence skills: focus Cancel only — arrows drive the pad, not first option.
  if (session.isSequenceSkillActive()) cancel.focus();
  else focusFirst(panel);
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
  const tick = window.setInterval(() => {
    needlePos = (needlePos + step) % 1;
    needle.style.left = `${needlePos * 100}%`;
  }, 32);
  meter.dataset.needleTick = String(tick);
  const sampleNeedle = (): number => {
    const raw = needle.style.left;
    if (raw.endsWith('%')) {
      const v = parseFloat(raw) / 100;
      if (Number.isFinite(v)) return v;
    }
    return needlePos;
  };
  const stopAt = (pos: number): void => {
    if (settled) return;
    settled = true;
    window.clearInterval(tick);
    window.removeEventListener('keydown', onKey, true);
    session.submitSkill(pos);
    after();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (!(e.key === 'Enter' || e.code === 'Enter' || e.key === ' ' || e.code === 'Space'))
      return;
    e.preventDefault();
    e.stopPropagation();
    stopAt(sampleNeedle());
  };
  window.addEventListener('keydown', onKey, true);
  const stopBtn = button(t('ui.skill.stop'), () => stopAt(sampleNeedle()));
  stopBtn.classList.add('btn-needle-stop');
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
    btn.addEventListener(
      'keydown',
      (e) => {
        if (Date.now() >= armUntil) return;
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true,
    );
    actions.appendChild(btn);
  });
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
  revealed: Set<number>;
  hidden: number | undefined;
  labels: HTMLButtonElement[];
  expired: boolean;
  settled: boolean;
};

function refreshLockpick(state: LockpickState): void {
  state.labels.forEach((btn, i) => {
    if (state.hidden === i && !state.revealed.has(i)) {
      btn.textContent = tf('ui.skill.pinHidden', { n: String(i + 1) });
      return;
    }
    const h = state.heights[i] ?? 0;
    btn.textContent = `${tf('ui.skill.pinBtn', { n: String(i + 1) })}: ${'▮'.repeat(h + 1)}${'▯'.repeat(LOCK_PIN_LEVELS - 1 - h)}`;
  });
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

function paintLockpickSkill(
  body: HTMLElement,
  actions: HTMLElement,
  session: GameSession,
  after: () => void,
  phase: SkillPhase,
  pickLeft?: number,
): void {
  const target = phasePins(phase);
  const state: LockpickState = {
    heights: target.map(() => 0),
    revealed: new Set(),
    hidden: phase.hiddenPin,
    labels: [],
    expired: false,
    settled: false,
  };
  const row = el('div', 'lockpick-row');
  const submit = (): void => {
    if (state.settled || state.expired) return;
    state.settled = true;
    cleanup();
    session.submitSkill(encodePins(state.heights));
    after();
  };
  const onTab = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || state.settled || state.expired || !body.isConnected) return;
    e.preventDefault();
    e.stopPropagation();
    submit();
  };
  const cleanup = (): void => {
    body.ownerDocument?.removeEventListener('keydown', onTab, true);
  };
  body.ownerDocument?.addEventListener('keydown', onTab, true);
  target.forEach((_, i) => {
    const btn = button(tf('ui.skill.pinBtn', { n: String(i + 1) }), () => {
      if (state.expired || state.settled) return;
      if (state.hidden === i) state.revealed.add(i);
      state.heights[i] = ((state.heights[i] ?? 0) + 1) % LOCK_PIN_LEVELS;
      refreshLockpick(state);
    });
    btn.classList.add('lockpick-pin');
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submit();
        return;
      }
      // Space raises the focused pin (matches on-screen hint).
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        btn.click();
      }
    });
    state.labels.push(btn);
    row.appendChild(btn);
  });
  body.appendChild(row);
  void pickLeft;
  bindLockpickTimer(body, phase, target, state, { cleanup, session, after });
  refreshLockpick(state);
  actions.appendChild(button(t('ui.skill.submitLock'), submit));
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

function seqProgressLabel(seq: SeqKey[], index: number): string {
  return tf('ui.skill.sequenceLabel', {
    seq: seq.map((_, i) => (i < index ? '✓' : '·')).join('  '),
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
  const missCap = phase.maxMisses;
  const status = el(
    'p',
    'skill-seq',
    tf('ui.skill.matchNext', {
      current: String(progress.seqIndex + 1),
      total: String(seq.length),
    }) + (missCap ? tf('ui.skill.missesFail', { n: String(missCap) }) : ''),
  );
  // Playtest #30: never print the full sequence — only progress (2–3 tries).
  const pattern = el('p', 'skill-pattern', seqProgressLabel(seq, progress.seqIndex));
  body.append(pattern, status);
  const settled = { v: false };
  if (phase.timerMs && phase.timerMs > 0) {
    bindSequenceTimer(body, session, seq, phase.timerMs, settled, after);
  }
  const used = sequencePadKeys(seq);
  const buffer = createSequenceKeyBuffer((keyIndex) => {
    if (settled.v) return;
    const beforePhase = session.getSkillProgress()?.phaseIndex;
    session.submitSkill(keyIndex);
    const next = session.getSkillProgress();
    if (!next || next.done || next.phaseIndex !== beforePhase) {
      settled.v = true;
      after();
      return;
    }
    const left = missCap
      ? tf('ui.skill.missesProgress', {
          current: String(next.misses),
          max: String(missCap),
        })
      : '';
    status.textContent =
      tf('ui.skill.matchNext', {
        current: String(next.seqIndex + 1),
        total: String(seq.length),
      }) + left;
    pattern.textContent = seqProgressLabel(seq, next.seqIndex);
  });
  const onKey = (keyIndex: number): void => buffer.push(keyIndex);
  const pad = el('div', 'skill-seq-pad');
  for (const key of used) {
    pad.appendChild(button(key, () => onKey(SEQ_KEYS.indexOf(key))));
  }
  actions.appendChild(pad);
  actions.appendChild(el('p', 'skill-seq', t('ui.skill.escSeqHint')));
  panelKeyHook(actions, (ev) => {
    if (ev.repeat) return;
    const sym = SEQ_KEY_CODES[ev.code];
    if (!sym || !used.includes(sym)) return;
    ev.preventDefault();
    ev.stopPropagation();
    onKey(SEQ_KEYS.indexOf(sym));
  });
}

/** Arrow chase pads always show ↑→↓← so “match 4” never shows only 3 buttons. */
function sequencePadKeys(seq: SeqKey[]): SeqKey[] {
  const arrows: SeqKey[] = ['↑', '→', '↓', '←'];
  if (seq.every((k) => arrows.includes(k))) return arrows;
  return [...new Set(seq)] as SeqKey[];
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
  panel.appendChild(
    button(UI.close, () => {
      if (!session.returnToMenu()) session.closeModal();
      after();
    }),
  );
}

function travelBtn(
  name: string,
  id: (typeof DISTRICTS)[number]['id'],
  session: GameSession,
  after: () => void,
): HTMLButtonElement {
  const unlocked = session.world.isUnlocked(id);
  const btn = button(unlocked ? name : `${name}${t('ui.travel.lockedSuffix')}`, () => {
    if (unlocked) {
      session.travelTo(id);
      after();
    }
  });
  btn.disabled = !unlocked;
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
