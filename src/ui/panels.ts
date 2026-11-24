import { el, clearNode } from './dom';
import { UI } from './strings';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import { listJobs } from '../systems/grind';
import { formatOdds, applyHouseFlavor } from '../systems/betting';
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
  onClose: () => void,
): void {
  clearNode(panel);
  for (const line of lines) {
    panel.appendChild(el('p', 'line', `${line.speaker}: ${line.text}`));
  }
  panel.appendChild(button(UI.close, onClose));
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
  appendBetBody(panel, bet);
  panel.append(
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
}

function appendBetBody(
  panel: HTMLElement,
  bet: NonNullable<ReturnType<GameSession['getPendingBet']>>,
): void {
  panel.append(
    el('h2', '', bet.title),
    el('p', '', bet.description),
    el('p', '', `Stake: ${bet.stake} · Odds ${formatOdds(bet.odds)}`),
    el('p', '', applyHouseFlavor(bet.houseEdge)),
    el('div', 'bet-roll', 'Ready to roll'),
  );
}

function animateRoll(panel: HTMLElement, done: () => void): void {
  const roll = panel.querySelector('.bet-roll');
  if (roll) roll.textContent = '⚀ ⚁ ⚂ …';
  window.setTimeout(done, 450);
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
        session.closeModal();
        session.offerBet(job.betId);
        after();
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
