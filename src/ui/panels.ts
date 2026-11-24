import { el, clearNode } from './dom';
import { UI } from './strings';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import { listJobs } from '../systems/grind';
import { formatOdds, formatWinChance, applyHouseFlavor } from '../systems/betting';
import { DISTRICTS } from '../content/districts';

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
  },
): void {
  clearNode(panel);
  for (const line of lines) {
    panel.appendChild(el('p', 'line', `${line.speaker}: ${line.text}`));
  }
  if (opts.offerBet && opts.onAcceptBet) {
    panel.append(button(UI.takeBet, opts.onAcceptBet), button(UI.walkAway, opts.onClose));
  } else {
    panel.appendChild(button(UI.close, opts.onClose));
  }
  focusFirst(panel);
}

export function paintBet(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): void {
  clearNode(panel);
  const bet = session.getPendingBet();
  if (!bet) return;
  appendBetDetails(panel, session, bet);
  panel.append(betActionRow(panel, session, after));
  panel.scrollTop = 0;
}

function appendBetDetails(
  panel: HTMLElement,
  session: GameSession,
  bet: NonNullable<ReturnType<GameSession['getPendingBet']>>,
): void {
  const stakeLine = el('p', 'stake-line', '');
  const losses = session.getBetLosses(bet.id);
  const pity = losses > 0 ? ` · pity +${losses * 10}%` : '';
  const writeStake = (): void => {
    stakeLine.textContent = `Stake: ${session.getPendingStake()} credits`;
  };
  writeStake();
  panel.append(
    el('h2', '', bet.title),
    el('p', '', bet.description),
    stakeLine,
    el(
      'p',
      '',
      `Win chance ${formatWinChance(bet.odds, bet.houseEdge, losses)} · Odds ${formatOdds(bet.odds)}${pity}`,
    ),
    el('p', '', applyHouseFlavor(bet.houseEdge)),
    stakeControls(session, writeStake),
    el('div', 'bet-roll', 'Ready to roll'),
  );
}

function betActionRow(
  panel: HTMLElement,
  session: GameSession,
  after: () => void,
): HTMLElement {
  const actions = el('div', 'bet-actions');
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
      session.closeModal();
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
      session.closeModal();
      after();
    }),
  );
}
