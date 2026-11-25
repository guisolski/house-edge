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

export function paintDialogue(
  panel: HTMLElement,
  lines: DialogueLine[],
  opts: {
    onClose: () => void;
    offerBet?: boolean;
    onAcceptBet?: () => void;
    onChoice?: (setsFlag?: string, reply?: string) => void;
  },
): void {
  clearNode(panel);
  const body = el('div', 'panel-body');
  let pendingChoices: DialogueLine['choices'] | undefined;
  for (const line of lines) {
    body.appendChild(el('p', 'line', `${line.speaker}: ${line.text}`));
    if (line.choices?.length) pendingChoices = line.choices;
  }
  const actions = el('div', 'panel-actions');
  if (pendingChoices?.length && opts.onChoice) {
    for (const c of pendingChoices) {
      actions.appendChild(button(c.label, () => opts.onChoice?.(c.setsFlag, c.reply)));
    }
  }
  if (opts.offerBet && opts.onAcceptBet) {
    actions.append(
      button(UI.takeBet, opts.onAcceptBet),
      button(UI.walkAway, opts.onClose),
    );
  } else if (!pendingChoices?.length) {
    actions.appendChild(button(UI.close, opts.onClose));
  } else {
    actions.appendChild(button(UI.close, opts.onClose));
  }
  panel.append(body, actions);
  focusFirst(panel);
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
  body.append(
    el('h2', '', progress.def.title),
    el('p', 'bet-desc', progress.def.blurb),
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
  const actions = el('div', 'panel-actions skill-actions');
  if (phase?.kind === 'timing') {
    paintTimingSkill(body, actions, session, after, phase);
  } else if (phase?.kind === 'choice' || phase?.kind === 'puzzle') {
    paintChoiceSkill(actions, phase.options ?? ['A', 'B', 'C'], session, after);
  } else if (phase) {
    paintSequenceSkill(body, actions, session, after);
  }
  actions.appendChild(
    button(UI.cancel, () => {
      session.cancelBet();
      after();
    }),
  );
  panel.append(body, actions);
  focusFirst(panel);
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
): void {
  options.forEach((label, i) => {
    actions.appendChild(
      button(label, () => {
        session.submitSkill(i);
        after();
      }),
    );
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
  const pattern = el('p', 'skill-pattern', `Sequence: ${seq.join('  ')}`);
  const status = el(
    'p',
    'skill-seq',
    `Match ${progress.seqIndex + 1} / ${seq.length} — next key…`,
  );
  body.append(pattern, status);
  const pad = el('div', 'skill-seq-pad');
  const used = [...new Set(seq)] as SeqKey[];
  const onKey = (keyIndex: number): void => {
    const beforePhase = session.getSkillProgress()?.phaseIndex;
    session.submitSkill(keyIndex);
    const next = session.getSkillProgress();
    if (!next || next.done) {
      after();
      return;
    }
    // Still mid-sequence — refresh status without clearing pad.
    if (next.phaseIndex === beforePhase) {
      status.textContent = `Match ${next.seqIndex + 1} / ${seq.length} — next key…`;
      return;
    }
    after();
  };
  for (const key of used) {
    const idx = SEQ_KEYS.indexOf(key);
    pad.appendChild(
      button(key, () => {
        onKey(idx);
      }),
    );
  }
  actions.appendChild(pad);
  const onKeyDown = (ev: KeyboardEvent): void => {
    const map: Record<string, SeqKey> = {
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
    const sym = map[ev.code];
    if (!sym || !used.includes(sym)) return;
    ev.preventDefault();
    onKey(SEQ_KEYS.indexOf(sym));
  };
  panelKeyHook(actions, onKeyDown);
}

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
  panel.append(
    el('h2', '', bet.title),
    el('p', 'bet-desc', bet.description),
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
