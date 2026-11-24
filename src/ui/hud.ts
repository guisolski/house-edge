import { el, clearNode, setVisible } from './dom';
import { UI } from './strings';
import type { GameSession } from '../systems/session';
import type { DialogueLine } from '../core/types';
import { listJobs } from '../systems/grind';
import { UPGRADES } from '../systems/upgrade';

export type HudHandles = {
  root: HTMLElement;
  showTitle: (hasSave: boolean) => void;
  showHud: () => void;
  updateStats: () => void;
  showDialogue: (lines: DialogueLine[]) => void;
  showToast: (message: string, kind: string) => void;
  showMenu: (open: boolean) => void;
  showEnding: (text: string) => void;
};

export function createHud(session: GameSession, mount: HTMLElement): HudHandles {
  const root = el('div', 'hud');
  mount.appendChild(root);
  const parts = mountPanels(session, root);
  return makeHandles(session, parts);
}

function mountPanels(session: GameSession, root: HTMLElement): PanelParts {
  const title = buildTitle(session);
  const play = buildPlay(session);
  const menu = buildMenu(session);
  const dialogue = el('div', 'dialogue-panel');
  const toast = el('div', 'toast');
  const ending = el('div', 'ending-panel');
  root.append(title, play, menu, dialogue, toast, ending);
  setVisible(play, false);
  setVisible(menu, false);
  setVisible(dialogue, false);
  setVisible(ending, false);
  return { title, play, menu, dialogue, toast, ending, root };
}

type PanelParts = {
  root: HTMLElement;
  title: HTMLElement;
  play: HTMLElement;
  menu: HTMLElement;
  dialogue: HTMLElement;
  toast: HTMLElement;
  ending: HTMLElement;
};

function makeHandles(session: GameSession, p: PanelParts): HudHandles {
  return {
    root: p.root,
    showTitle: (hasSave) => revealTitle(p.title, p.play, hasSave),
    showHud: () => revealPlay(p.title, p.play),
    updateStats: () => refreshStats(p.play, session),
    showDialogue: (lines) => paintDialogue(p.dialogue, lines),
    showToast: (message, kind) => paintToast(p.toast, message, kind),
    showMenu: (open) => setVisible(p.menu, open),
    showEnding: (text) => paintEnding(p.ending, text),
  };
}

function buildTitle(session: GameSession): HTMLElement {
  const panel = el('section', 'title-screen');
  panel.append(
    el('h1', 'logo', UI.title),
    el('p', 'tagline', UI.tagline),
    button(UI.newGame, () => session.startNew()),
    button(UI.continue, () => {
      if (!session.tryLoad()) session.startNew();
    }),
    el('p', 'hint', UI.controlsHint),
  );
  return panel;
}

function buildPlay(session: GameSession): HTMLElement {
  const panel = el('section', 'play-hud');
  panel.append(
    el('div', 'stats', ''),
    button(UI.story, () => runAvailableStory(session)),
    button(UI.grind, () => runFirstJob(session)),
    button(UI.travel, () => travelNext(session)),
    button(UI.menu, () => emitMenu(session, true)),
  );
  return panel;
}

function buildMenu(session: GameSession): HTMLElement {
  const panel = el('section', 'menu-panel');
  panel.append(
    el('h2', '', UI.menu),
    button(UI.resume, () => emitMenu(session, false)),
    button(UI.mute, () => toggleMute(session)),
    button(UI.upgrades, () => buyFirstUpgrade(session)),
    el('p', 'hint', UI.gamepadHint),
  );
  return panel;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'btn', label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

function emitMenu(session: GameSession, open: boolean): void {
  session.bus.emit('ui:menu', { open, screen: 'pause' });
}

function revealTitle(title: HTMLElement, play: HTMLElement, hasSave: boolean): void {
  setVisible(title, true);
  setVisible(play, false);
  const cont = title.querySelectorAll('button')[1] as HTMLButtonElement | undefined;
  if (cont) cont.disabled = !hasSave;
}

function revealPlay(title: HTMLElement, play: HTMLElement): void {
  setVisible(title, false);
  setVisible(play, true);
}

function refreshStats(play: HTMLElement, session: GameSession): void {
  const stats = play.querySelector('.stats');
  if (!stats) return;
  const s = session.player.getStats();
  const district = session.world.get(s.districtId)?.name ?? s.districtId;
  stats.textContent = `${district} · ${UI.credits} ${s.credits} · ${UI.reputation} ${s.reputation}`;
}

function paintDialogue(panel: HTMLElement, lines: DialogueLine[]): void {
  clearNode(panel);
  setVisible(panel, true);
  for (const line of lines) {
    panel.appendChild(el('p', 'line', `${line.speaker}: ${line.text}`));
  }
  panel.appendChild(button(UI.close, () => setVisible(panel, false)));
}

function paintToast(toast: HTMLElement, message: string, kind: string): void {
  toast.className = `toast toast-${kind}`;
  toast.textContent = message;
  setVisible(toast, true);
  window.setTimeout(() => setVisible(toast, false), 2200);
}

function paintEnding(panel: HTMLElement, text: string): void {
  clearNode(panel);
  panel.append(el('h2', '', UI.wonEnding), el('p', '', text));
  setVisible(panel, true);
}

function runAvailableStory(session: GameSession): void {
  const beat = session.availableStory()[0];
  if (!beat) {
    session.bus.emit('ui:toast', { message: UI.noStory, kind: 'info' });
    return;
  }
  session.runStoryBeat(beat.id);
}

function runFirstJob(session: GameSession): void {
  const s = session.player.getStats();
  const job = listJobs(s.districtId, s.reputation)[0];
  if (!job) {
    session.bus.emit('ui:toast', { message: UI.noJobs, kind: 'info' });
    return;
  }
  session.placeBet(job.betId);
}

function travelNext(session: GameSession): void {
  const unlocked = session.world.unlockedList();
  const current = session.player.getStats().districtId;
  const next = unlocked.find((d) => d.id !== current) ?? unlocked[0];
  if (next) session.travelTo(next.id);
}

function toggleMute(session: GameSession): void {
  session.setMuted(!session.getAudio().muted);
}

function buyFirstUpgrade(session: GameSession): void {
  const def = UPGRADES[0];
  if (!def) return;
  const credits = session.player.getStats().credits;
  if (credits < def.cost) {
    session.bus.emit('ui:toast', { message: 'Need more credits.', kind: 'danger' });
    return;
  }
  session.player.addCredits(-def.cost);
  session.bus.emit('ui:toast', { message: `Bought ${def.name}`, kind: 'success' });
}
