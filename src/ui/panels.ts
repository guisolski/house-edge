import { el, clearNode } from './dom';
import { UI } from './strings';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import { listJobs } from '../systems/grind';
import {
  formatOdds,
  formatWinChance,
  applyHouseFlavor,
  isSoftStakeBet,
} from '../systems/betting';
import { DISTRICTS } from '../content/districts';
import { UPGRADES } from '../systems/upgrade';
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

export function paintDialogue(
  panel: HTMLElement,
  lines: DialogueLine[],
  opts: {
    onClose: () => void;
    offerBet?: boolean;
    onAcceptBet?: () => void;
    onChoice?: (setsFlag?: string, reply?: string) => void;
    /** Ignore Enter/activate on choices until this timestamp (ms). */
    choiceArmAt?: number;
    /** Block Close / skip until this timestamp (ms) — closing-line hold. */
    holdCloseUntil?: number;
  },
): void {
  clearNode(panel);
  const body = el('div', 'panel-body dialogue-body');
  let pendingChoices: DialogueLine['choices'] | undefined;
  for (const line of dialogueVisibleLines(lines)) {
    body.appendChild(el('p', 'line', `${line.speaker}: ${line.text}`));
    if (line.choices?.length) pendingChoices = line.choices;
  }
  const actions = el('div', 'panel-actions');
  if (pendingChoices?.length && opts.onChoice) {
    const armAt = opts.choiceArmAt ?? 0;
    // Mandatory choices: no Close — Enter/focus lands on the first option.
    for (const c of pendingChoices) {
      const btn = button(c.label, () => {
        if (Date.now() < armAt) return;
        opts.onChoice?.(c.setsFlag, c.reply);
      });
      btn.classList.add('dialogue-choice');
      // Swallow early Enter/Space so spam can't pick before arm.
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
  } else if (opts.offerBet && opts.onAcceptBet) {
    actions.append(
      button(UI.takeBet, opts.onAcceptBet),
      button(UI.walkAway, opts.onClose),
    );
  } else {
    const holdUntil = opts.holdCloseUntil ?? 0;
    const close = button(UI.close, () => {
      if (Date.now() < holdUntil) return;
      opts.onClose();
    });
    if (Date.now() < holdUntil) {
      close.disabled = true;
      const left = Math.max(0, holdUntil - Date.now());
      window.setTimeout(() => {
        close.disabled = false;
      }, left);
    }
    actions.appendChild(close);
  }
  panel.append(body, actions);
  focusFirst(panel);
}

function lockpickControlHint(panel: HTMLElement): string {
  const mode = panel.closest('.hud')?.getAttribute('data-input-mode') ?? 'keyboard';
  if (mode === 'gamepad') return UI.lockpickHintGamepad;
  if (mode === 'touch') return UI.lockpickHintTouch;
  return UI.lockpickHintKeyboard;
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
  const phase = progress.def.phases[progress.phaseIndex];
  const body = el('div', 'panel-body skill-body');
  const streak = session.getSkillStreak();
  const sideHustle = bet.id === 'agua-gelada' && session.story.getFlag('free_roam');
  body.append(
    el('h2', '', sideHustle ? 'Side hustle: ice pour' : progress.def.title),
    el(
      'p',
      'bet-desc',
      sideHustle
        ? 'Repeatable post-credits grind — stop the needle on cold.'
        : progress.def.blurb,
    ),
    el('p', 'stake-line', `Stake at risk: ${session.getPendingStake()} credits`),
    el(
      'p',
      'skill-phase',
      `Phase ${progress.phaseIndex + 1}/${progress.def.phases.length}: ${phase?.prompt ?? ''}`,
    ),
  );
  if (streak > 0) {
    body.appendChild(el('p', 'skill-streak', `Combo ×${streak} — bonus on next win`));
  }
  if (phase?.clue) {
    body.appendChild(el('p', 'skill-clue', `Clue: ${phase.clue}`));
  }
  if (phase?.kind === 'lockpick' && progress.pickLeft !== undefined) {
    body.appendChild(
      el(
        'p',
        'skill-seq',
        `Pick durability: ${progress.pickLeft} snap${progress.pickLeft === 1 ? '' : 's'} left`,
      ),
    );
    body.appendChild(el('p', 'skill-seq lockpick-hint', lockpickControlHint(panel)));
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
    paintChoiceSkill(actions, phase.options ?? ['A', 'B', 'C'], session, after, phase);
    return;
  }
  paintSequenceSkill(body, actions, session, after);
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
  // Drawn zone MUST match judgeTimingStop(timingZone(phase)).
  const zone = timingZone(phase);
  zoneEl.style.left = `${zone.lo * 100}%`;
  zoneEl.style.width = `${(zone.hi - zone.lo) * 100}%`;
  meter.append(zoneEl, needle);
  body.appendChild(meter);
  body.appendChild(
    el(
      'p',
      'skill-seq',
      `Green zone ${Math.round(zone.lo * 100)}–${Math.round(zone.hi * 100)}% · stop on the needle`,
    ),
  );
  const misses = session.getSkillProgress()?.misses ?? 0;
  if (misses > 0) {
    body.appendChild(el('p', 'skill-clue skill-miss-hint', UI.needleMissHint));
  }
  let t = 0;
  const speed = phase.needleSpeed ?? 0.8;
  const step = Math.max(0.015, 0.028 * speed);
  const tick = window.setInterval(() => {
    t = (t + step) % 1;
    needle.style.left = `${t * 100}%`;
  }, 32);
  // Harness / e2e can freeze the needle before Stop without a frame race.
  meter.dataset.needleTick = String(tick);
  actions.appendChild(
    button('Stop!', () => {
      window.clearInterval(tick);
      // Capture the needle position at input time (no extra animation frame).
      const raw = needle.style.left;
      const pos = raw.endsWith('%') ? parseFloat(raw) / 100 : t;
      session.submitSkill(Number.isFinite(pos) ? pos : t);
      after();
    }),
  );
}

function paintChoiceSkill(
  actions: HTMLElement,
  options: string[],
  session: GameSession,
  after: () => void,
  phase?: SkillPhase,
): void {
  let settled = false;
  const settle = (i: number): void => {
    if (settled) return;
    settled = true;
    session.submitSkill(i);
    after();
  };
  options.forEach((label, i) => {
    actions.appendChild(button(label, () => settle(i)));
  });
  const ms = phase?.timerMs;
  if (ms && ms > 0) {
    const timer = el('p', 'skill-seq', `Offer expires in ${Math.ceil(ms / 1000)}s`);
    actions.prepend(timer);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(0, ms - (Date.now() - started));
      timer.textContent =
        left > 0 ? `Offer expires in ${Math.ceil(left / 1000)}s` : 'Offer expired';
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
      btn.textContent = `Pin ${i + 1}: ???`;
      return;
    }
    const h = state.heights[i] ?? 0;
    btn.textContent = `Pin ${i + 1}: ${'▮'.repeat(h + 1)}${'▯'.repeat(LOCK_PIN_LEVELS - 1 - h)}`;
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
      left > 0 ? `Timer ${Math.ceil(left / 1000)}s` : 'Timer expired — pick snaps';
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
    const btn = button(`Pin ${i + 1}`, () => {
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
  actions.appendChild(button('Submit lock', submit));
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
      left > 0 ? `Timer ${Math.ceil(left / 1000)}s` : 'Time’s up — sequence failed';
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
    `Match ${progress.seqIndex + 1} / ${seq.length} — next key…` +
      (missCap ? ` · ${missCap} misses fail` : ''),
  );
  body.append(el('p', 'skill-pattern', `Sequence: ${seq.join('  ')}`), status);
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
    const left = missCap ? ` · misses ${next.misses}/${missCap}` : '';
    status.textContent = `Match ${next.seqIndex + 1} / ${seq.length} — next key…${left}`;
  });
  const onKey = (keyIndex: number): void => buffer.push(keyIndex);
  const pad = el('div', 'skill-seq-pad');
  for (const key of used) {
    pad.appendChild(button(key, () => onKey(SEQ_KEYS.indexOf(key))));
  }
  actions.appendChild(pad);
  actions.appendChild(el('p', 'skill-seq', 'Esc cancels · arrows are sequence only'));
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
  const fn = (ev: KeyboardEvent): void => {
    if (!root.isConnected) {
      window.removeEventListener('keydown', fn);
      return;
    }
    handler(ev);
  };
  window.addEventListener('keydown', fn);
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
  const pity = pityStacks > 0 ? ` · pity +${pityStacks * 8}%` : '';
  const writeStake = (): void => {
    stakeLine.textContent = `Stake: ${session.getPendingStake()} credits`;
  };
  writeStake();
  const sideHustle = bet.id === 'agua-gelada' && session.story.getFlag('free_roam');
  panel.append(
    el('h2', '', sideHustle ? 'Side hustle: ice pour' : bet.title),
    el(
      'p',
      'bet-desc',
      sideHustle
        ? 'Repeatable post-credits grind at Nair’s boteco — stop the needle on cold.'
        : bet.description,
    ),
    stakeLine,
    el(
      'p',
      '',
      `Win chance ${formatWinChance(bet.odds, bet.houseEdge, losses, story)} · Odds ${formatOdds(bet.odds)}${pity}`,
    ),
    el('p', 'bet-flavor', applyHouseFlavor(bet.houseEdge)),
    stakeControls(session, writeStake),
    el('div', 'bet-roll', 'Ready to roll'),
  );
}

function betActionRow(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): HTMLElement {
  const actions = el('div', 'bet-actions panel-actions');
  actions.append(
    button(UI.confirmBet, () => {
      animateRoll(panel, () => {
        session.confirmBet();
        after();
      });
    }),
    button(UI.cancel, () => {
      session.cancelBet();
      after();
    }),
  );
  return actions;
}

function stakeControls(session: GameSession, writeStake: () => void): HTMLElement {
  const row = el('div', 'stake-row');
  row.append(
    button(UI.stakeDown, () => {
      session.adjustStake(-5);
      writeStake();
    }),
    button(UI.stakeUp, () => {
      session.adjustStake(5);
      writeStake();
    }),
  );
  return row;
}

function animateRoll(panel: HTMLElement, done: () => void): void {
  const roll = panel.querySelector('.bet-roll');
  if (roll) roll.textContent = '⚀ ⚁ ⚂ …';
  window.setTimeout(() => {
    if (roll) roll.textContent = 'Resolving…';
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
    panel.appendChild(travelBtn(d.name, d.id, session, after));
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
  const btn = button(unlocked ? name : `${name} (locked)`, () => {
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
  panel.appendChild(el('p', 'hint', '[SAFE] = flat pay · [BET] = opens a wager panel'));
  const s = session.player.getStats();
  const jobs = listJobs(s.districtId, s.reputation);
  if (!jobs.length) panel.appendChild(el('p', '', UI.noJobs));
  for (const job of jobs) {
    panel.appendChild(
      button(job.label, () => {
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
    const label = maxed
      ? `${def.name} · Lv ${level} (max)`
      : `${def.name} · Lv ${level} → ${cost}cr`;
    const btn = button(label, () => {
      if (session.buyUpgrade(def.id)) paintUpgrades(panel, session, after);
    });
    btn.disabled = maxed || !session.upgrades.canBuy(def.id, credits);
    panel.append(btn, el('p', 'hint', def.description));
  }
  panel.appendChild(
    button(UI.close, () => {
      if (!session.returnToMenu()) session.closeModal();
      after();
    }),
  );
}
