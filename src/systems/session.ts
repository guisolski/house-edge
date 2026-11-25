import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { BetDefinition, GameSave, DistrictId } from '../core/types';
import { canAfford, clampStake, defaultStake, resolveBet } from './betting';
import { PlayerSystem } from './player';
import { StorySystem } from './story';
import { WorldSystem } from './world';
import { UpgradeSystem } from './upgrade';
import { DISTRICTS } from '../content/districts';
import { STORY_BEATS, getBeat } from '../content/story';
import { getBet } from '../content/bets';
import { getJob } from './grind';
import { createDefaultSave, loadFromStorage, saveToStorage } from './save';
import { UiStateMachine } from './ui-state';
import {
  districtExits,
  districtNpcs,
  nearestExit,
  nearestNpc,
  npcStoryBeatIds,
  EXIT_STAND_RANGE,
  type DistrictExit,
  type WorldNpc,
} from './interaction';
import { buildDistrictMap, isWalkable, tileAt, type MapDef } from '../world/maps';
import { currentObjective, sideQuestMarkers, type Objective } from './objectives';

const SAFE_JOB_COOLDOWN_MS = 10_000;
const SAFE_JOB_CAP = 6;
/** Soft floor matching common story/grind stakes (e.g. água gelada). */
const BROKE_STAKE_FLOOR = 8;

export class GameSession {
  readonly bus: EventBus;
  readonly player: PlayerSystem;
  readonly story: StorySystem;
  readonly world: WorldSystem;
  readonly upgrades: UpgradeSystem;
  readonly ui: UiStateMachine;
  readonly npcs: WorldNpc[] = districtNpcs();
  readonly exits: DistrictExit[] = districtExits();
  private maps = new Map<DistrictId, MapDef>();
  private rng: Rng;
  private muted = false;
  private masterVolume = 0.7;
  private pendingBetId: string | null = null;
  private pendingStake = 0;
  private pendingStoryBeat: string | null = null;
  private pendingBetAfterDialogue: string | null = null;
  private lastDialogue: import('../core/types').DialogueLine[] = [];
  private lossesByBet = new Map<string, number>();
  private safeJobUses = 0;
  private lastSafeJobMs = 0;

  constructor(seed = 42, bus = new EventBus()) {
    this.bus = bus;
    this.rng = createRng(seed);
    this.player = new PlayerSystem(bus);
    this.story = new StorySystem(bus, STORY_BEATS);
    this.world = new WorldSystem(bus, DISTRICTS);
    this.upgrades = new UpgradeSystem();
    this.ui = new UiStateMachine();
    for (const d of DISTRICTS) this.maps.set(d.id, buildDistrictMap(d.id));
  }

  startNew(): void {
    this.applySave(createDefaultSave());
    this.ui.go('play');
    this.story.completeBeat('intro-laje');
    this.bus.emit('game:started', { newGame: true });
    this.bus.emit('ui:toast', {
      message: 'Find Dona Nair at the boteco (follow the marker).',
      kind: 'info',
    });
  }

  tryLoad(): boolean {
    const save = loadFromStorage();
    if (!save) return false;
    this.applySave(save);
    this.ui.go('play');
    this.bus.emit('game:started', { newGame: false });
    return true;
  }

  persist(): void {
    saveToStorage(this.toSave());
    this.bus.emit('game:saved', { slot: 1 });
  }

  getMap(): MapDef {
    const id = this.player.getStats().districtId;
    return this.maps.get(id) ?? buildDistrictMap(id);
  }

  move(dx: number, dy: number): boolean {
    if (!this.ui.is('play')) return false;
    const s = this.player.getStats();
    const map = this.getMap();
    const nx = Math.max(0, Math.min(map.width - 1, s.x + dx));
    const ny = Math.max(0, Math.min(map.height - 1, s.y + dy));
    if (!isWalkable(map, nx, ny)) return false;
    this.player.setFacing(dx, dy);
    // NPCs are non-blocking — walk-through keeps interaction from trapping the player.
    this.player.setPosition(nx, ny);
    // Walk-on travel only on exit tiles (plus-pad). Stand margin still shows E — Travel.
    if (tileAt(map, nx, ny) === 'exit') {
      const exit = this.nearbyExit();
      if (exit) return this.travelTo(exit.toDistrict);
    }
    return true;
  }

  travelTo(districtId: DistrictId): boolean {
    if (!this.world.isUnlocked(districtId)) return false;
    const district = this.world.get(districtId);
    if (!district) return false;
    this.player.setDistrict(districtId);
    this.player.setPosition(district.spawn.x, district.spawn.y);
    this.ui.go('play');
    return true;
  }

  nearbyNpc(): WorldNpc | null {
    const s = this.player.getStats();
    const face = this.player.getFacing();
    const available = new Set(this.story.availableBeats(s.districtId).map((b) => b.id));
    // Prefer story NPCs with an active beat so side-job rematches don't steal E.
    return nearestNpc({
      npcs: this.npcs,
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      faceDx: face.dx,
      faceDy: face.dy,
      prefer: (npc) => npcStoryBeatIds(npc).some((id) => available.has(id)),
    });
  }

  nearbyExit(): DistrictExit | null {
    const s = this.player.getStats();
    const exit = nearestExit({
      exits: this.exits,
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      range: EXIT_STAND_RANGE,
    });
    if (!exit) return null;
    return this.world.isUnlocked(exit.toDistrict) ? exit : null;
  }

  /** Locked exit underfoot / adjacent — for toast + prompt feedback. */
  nearbyLockedExit(): DistrictExit | null {
    const s = this.player.getStats();
    const exit = nearestExit({
      exits: this.exits,
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      range: EXIT_STAND_RANGE,
    });
    if (!exit) return null;
    return this.world.isUnlocked(exit.toDistrict) ? null : exit;
  }

  /** Dismiss ending and keep the completed save for side jobs / grind. */
  continueExploring(): boolean {
    if (!this.ui.is('ending')) return false;
    // Epilogue is optional free-roam flavour — mark it available without blocking HUD.
    this.story.setFlag('free_roam', true);
    this.persist();
    if (!this.ui.go('play')) return false;
    this.bus.emit('game:started', { newGame: false });
    this.bus.emit('ui:toast', {
      message: 'Free roam — grind side jobs or explore. Epilogue waits on the hill.',
      kind: 'info',
    });
    return true;
  }

  /** Optional side-quest markers in the current district. */
  sideMarkers(): { x: number; y: number; label: string }[] {
    const s = this.player.getStats();
    return sideQuestMarkers({
      beats: STORY_BEATS,
      completed: this.story.getCompleted(),
      flags: (f) => this.story.getFlag(f),
      districtId: s.districtId,
      npcs: this.npcs,
      exits: this.exits,
      unlocked: (id) => this.world.isUnlocked(id as DistrictId),
    });
  }

  /** Nearest odd-job giver (same district first). */
  nearestSafeJobNpc(): WorldNpc | null {
    const s = this.player.getStats();
    const givers = this.npcs.filter((n) => n.safeJobId);
    const here = givers.filter((n) => n.districtId === s.districtId);
    const pool = here.length > 0 ? here : givers;
    if (pool.length === 0) return null;
    let best = pool[0]!;
    let bestD = Infinity;
    for (const n of pool) {
      const d = n.districtId === s.districtId ? Math.hypot(n.x - s.x, n.y - s.y) : 1000;
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  /** Credits below the soft story/grind stake floor. */
  isBroke(): boolean {
    return this.player.getStats().credits < BROKE_STAKE_FLOOR;
  }

  brokeHintText(): string | null {
    if (!this.isBroke()) return null;
    const giver = this.nearestSafeJobNpc();
    if (!giver) {
      return 'Broke — open Esc → Side Jobs for safe pay.';
    }
    const same = giver.districtId === this.player.getStats().districtId;
    return same
      ? `Broke — talk to ${giver.name} for safe odd jobs (marker).`
      : `Broke — find ${giver.name} (${giver.districtId}) for safe odd jobs.`;
  }

  interact(): boolean {
    if (!this.ui.is('play')) return false;
    const exit = this.nearbyExit();
    if (exit) return this.travelTo(exit.toDistrict);
    const locked = this.nearbyLockedExit();
    if (locked) {
      this.bus.emit('ui:toast', {
        message: 'Path locked — finish the current bet first.',
        kind: 'info',
      });
      return false;
    }
    const npc = this.nearbyNpc();
    if (!npc) {
      this.bus.emit('ui:toast', { message: 'Nobody in range.', kind: 'info' });
      return false;
    }
    return this.interactNpc(npc);
  }

  offerBet(betId: string): boolean {
    const bet = getBet(betId);
    if (!bet) return false;
    const credits = this.player.getStats().credits;
    const stake = defaultStake(bet, credits);
    if (!canAfford(credits, stake)) {
      this.bus.emit('ui:toast', {
        message: this.brokeHintText() ?? 'Not enough credits — find an odd-job NPC.',
        kind: 'danger',
      });
      return false;
    }
    this.pendingBetId = betId;
    this.pendingStake = stake;
    this.bus.emit('bet:offered', { betId, title: bet.title });
    return this.ui.go('bet');
  }

  /** Guaranteed credits — cooldown + daily cap so it can't be farmed forever. */
  doSafeJob(jobId: string): boolean {
    const job = getJob(jobId);
    if (!job?.flatPay) return false;
    if (this.safeJobUses >= SAFE_JOB_CAP) {
      this.bus.emit('ui:toast', {
        message: 'Odd jobs are tapped out — try a real bet or story beat.',
        kind: 'info',
      });
      return false;
    }
    const now = Date.now();
    if (now - this.lastSafeJobMs < SAFE_JOB_COOLDOWN_MS) {
      this.bus.emit('ui:toast', {
        message: 'Catch your breath — odd jobs need a short cooldown.',
        kind: 'info',
      });
      return false;
    }
    const pay = job.flatPay + this.upgrades.getLevel('bolso') * 40;
    this.player.addCredits(pay);
    this.safeJobUses += 1;
    this.lastSafeJobMs = now;
    this.bus.emit('ui:toast', {
      message: `Earned ${pay} credits (safe odd jobs · ${this.safeJobUses}/${SAFE_JOB_CAP}).`,
      kind: 'success',
    });
    this.ui.go('play');
    return true;
  }

  openUpgrades(): boolean {
    return this.ui.canOpenModal() && this.ui.go('upgrades');
  }

  buyUpgrade(id: import('./upgrade').UpgradeId): boolean {
    const cost = this.upgrades.buy(id, this.player.getStats().credits);
    if (cost === null) {
      this.bus.emit('ui:toast', {
        message: 'Cannot buy that upgrade.',
        kind: 'danger',
      });
      return false;
    }
    this.player.addCredits(-cost);
    this.persist();
    this.bus.emit('ui:toast', {
      message: `Bought upgrade (${cost} credits).`,
      kind: 'success',
    });
    return true;
  }

  getBetLosses(betId: string): number {
    return this.lossesByBet.get(betId) ?? 0;
  }

  /** Instant settle helper for tests / grind shortcuts. */
  placeBet(betId: string, stakeOverride?: number): boolean {
    if (!this.offerBet(betId)) return false;
    return this.confirmBet(stakeOverride);
  }

  confirmBet(stakeOverride?: number): boolean {
    const betId = this.pendingBetId;
    if (!betId) return false;
    const bet = getBet(betId);
    if (!bet) return false;
    const stake = clampStake(
      bet,
      stakeOverride ?? this.pendingStake ?? bet.stake,
      this.player.getStats().credits,
    );
    const ok = this.settleBet(bet, stake);
    this.pendingBetId = null;
    this.pendingStake = 0;
    if (!this.ui.is('ending')) this.ui.go('play');
    return ok;
  }

  cancelBet(): void {
    this.pendingBetId = null;
    this.pendingStake = 0;
    this.pendingStoryBeat = null;
    this.pendingBetAfterDialogue = null;
    this.ui.go('play');
  }

  getPendingBet(): BetDefinition | null {
    return this.pendingBetId ? (getBet(this.pendingBetId) ?? null) : null;
  }

  getPendingStake(): number {
    return this.pendingStake;
  }

  adjustStake(delta: number): number {
    const bet = this.getPendingBet();
    if (!bet) return 0;
    this.pendingStake = clampStake(
      bet,
      this.pendingStake + delta,
      this.player.getStats().credits,
    );
    return this.pendingStake;
  }

  /** After dialogue: player opts into the linked story bet. */
  acceptStoryBet(): boolean {
    const betId = this.pendingBetAfterDialogue;
    this.pendingBetAfterDialogue = null;
    if (!betId) {
      // Dialogue-only beat: finish it instead of leaving it hanging.
      if (this.pendingStoryBeat) {
        this.finishBeat(this.pendingStoryBeat);
        this.pendingStoryBeat = null;
      }
      this.ui.backToPlay();
      return false;
    }
    if (this.offerBet(betId)) return true;
    this.pendingStoryBeat = null;
    this.ui.backToPlay();
    return false;
  }

  /** After dialogue: decline the bet and leave the beat retryable. */
  declineStoryBet(): void {
    this.pendingBetAfterDialogue = null;
    this.pendingStoryBeat = null;
    this.ui.backToPlay();
  }

  hasPendingStoryBet(): boolean {
    return this.pendingBetAfterDialogue !== null;
  }

  availableStory(): ReturnType<StorySystem['availableBeats']> {
    return this.story.availableBeats(this.player.getStats().districtId);
  }

  runStoryBeat(beatId: string): boolean {
    return this.beginStoryBeat(beatId);
  }

  getDialogue(): import('../core/types').DialogueLine[] {
    return this.lastDialogue;
  }

  objective(): Objective {
    const s = this.player.getStats();
    const broke = this.brokeHintText();
    if (broke) {
      const giver = this.nearestSafeJobNpc();
      const same = giver?.districtId === s.districtId;
      return {
        text: broke,
        targetX: same ? giver!.x : undefined,
        targetY: same ? giver!.y : undefined,
        districtId: giver?.districtId ?? s.districtId,
      };
    }
    return currentObjective({
      beats: STORY_BEATS,
      completed: this.story.getCompleted(),
      flags: (f) => this.story.getFlag(f),
      districtId: s.districtId,
      npcs: this.npcs,
      exits: this.exits,
      unlocked: (id) => this.world.isUnlocked(id as DistrictId),
    });
  }

  openMenu(): boolean {
    return this.ui.canOpenModal() && this.ui.go('menu');
  }

  openTravel(): boolean {
    return this.ui.canOpenModal() && this.ui.go('travel');
  }

  openJobs(): boolean {
    return this.ui.canOpenModal() && this.ui.go('jobs');
  }

  closeModal(): void {
    if (this.ui.is('dialogue')) {
      this.advanceDialogue();
      return;
    }
    this.ui.backToPlay();
  }

  /** Side Jobs / Travel / Upgrades Close → main pause menu (not straight to play). */
  returnToMenu(): boolean {
    if (!this.ui.is('jobs') && !this.ui.is('travel') && !this.ui.is('upgrades')) {
      return false;
    }
    return this.ui.go('menu');
  }

  private advanceDialogue(): void {
    // Story bets require an explicit Accept / Decline from the HUD — never auto-open.
    if (this.pendingBetAfterDialogue) {
      this.declineStoryBet();
      return;
    }
    if (this.pendingStoryBeat) {
      this.finishBeat(this.pendingStoryBeat);
      this.pendingStoryBeat = null;
    }
    this.ui.backToPlay();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.emitVolume();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    this.emitVolume();
  }

  getAudio(): { muted: boolean; masterVolume: number } {
    return { muted: this.muted, masterVolume: this.masterVolume };
  }

  toSave(): GameSave {
    return {
      version: 1,
      player: this.player.getStats(),
      flags: this.story.exportFlags(),
      completedBeats: this.story.getCompleted(),
      unlockedDistricts: this.world.exportUnlocked(),
      muted: this.muted,
      masterVolume: this.masterVolume,
      upgrades: this.upgrades.export(),
    };
  }

  private interactNpc(npc: WorldNpc): boolean {
    this.bus.emit('npc:interacted', { npcId: npc.id });
    if (this.tryNpcStory(npc)) return true;
    if (this.npcStoryBlocksRematch(npc)) {
      this.toastNpcBusy(npc);
      return false;
    }
    if (npc.jobBetId) return this.offerBet(npc.jobBetId);
    if (npc.safeJobId) return this.doSafeJob(npc.safeJobId);
    this.toastNpcBusy(npc);
    return false;
  }

  private tryNpcStory(npc: WorldNpc): boolean {
    const available = this.story.availableBeats(npc.districtId);
    const ready = npcStoryBeatIds(npc).find((id) => available.some((b) => b.id === id));
    return ready ? this.beginStoryBeat(ready) : false;
  }

  private npcStoryBlocksRematch(npc: WorldNpc): boolean {
    const primary = npc.beatId ? getBeat(npc.beatId) : undefined;
    return Boolean(
      primary && !primary.optional && !this.story.getCompleted().includes(primary.id),
    );
  }

  private toastNpcBusy(npc: WorldNpc): void {
    this.bus.emit('ui:toast', {
      message: `${npc.name}: Not now — ${this.objective().text}`,
      kind: 'info',
    });
  }

  private beginStoryBeat(beatId: string): boolean {
    const beat = this.story.startBeat(beatId);
    if (!beat) return false;
    this.pendingStoryBeat = beatId;
    this.pendingBetAfterDialogue = beat.betId ?? null;
    this.lastDialogue = [...beat.dialogue];
    this.ui.go('dialogue');
    for (const line of beat.dialogue) {
      this.bus.emit('ui:dialogue', { speaker: line.speaker, text: line.text });
    }
    return true;
  }

  /** Call after bet resolves when a story beat was pending. */
  finishPendingStory(): void {
    if (!this.pendingStoryBeat) return;
    this.finishBeat(this.pendingStoryBeat);
    this.pendingStoryBeat = null;
  }

  private settleBet(bet: BetDefinition, stake: number): boolean {
    if (!canAfford(this.player.getStats().credits, stake)) return false;
    const losses = this.lossesByBet.get(bet.id) ?? 0;
    this.player.addCredits(-stake);
    const result = resolveBet(bet, this.rng, {
      stake,
      consecutiveLosses: losses,
      luckBonus: this.upgrades.luckBonus(),
    });
    this.player.addCredits(result.payout);
    const rep =
      (result.won ? bet.reputationDeltaWin : bet.reputationDeltaLose) +
      (result.won ? this.upgrades.fameBonus() : 0);
    this.player.addReputation(rep);
    // Apply story/ending first so UI listeners see `ending` before bet:resolved.
    this.afterBetResolved(bet, result.won);
    this.bus.emit('bet:resolved', {
      betId: bet.id,
      won: result.won,
      payout: result.payout,
      stake,
    });
    // Skip win toast on ending so it doesn't overlap the ending panel.
    if (!this.ui.is('ending')) this.toastBet(result.won, result.payout, losses);
    return true;
  }

  private afterBetResolved(bet: BetDefinition, won: boolean): void {
    if (won) {
      this.lossesByBet.set(bet.id, 0);
      this.applyBetWins(bet);
      this.finishPendingStory();
      return;
    }
    this.lossesByBet.set(bet.id, (this.lossesByBet.get(bet.id) ?? 0) + 1);
    // Losses keep the story beat incomplete so the player can retry.
    this.pendingStoryBeat = null;
  }

  private applyBetWins(bet: BetDefinition): void {
    if (bet.unlocksFlag) this.story.setFlag(bet.unlocksFlag, true);
    if (bet.unlocksDistrict) this.world.unlock(bet.unlocksDistrict);
  }

  private toastBet(won: boolean, payout: number, priorLosses: number): void {
    const pity =
      !won && priorLosses + 1 > 0
        ? ` Retry odds improve (+${(priorLosses + 1) * 10}%).`
        : '';
    this.bus.emit('ui:toast', {
      message: won ? `Won ${payout} credits!` : `The house took this one.${pity}`,
      kind: won ? 'success' : 'danger',
    });
    this.bus.emit('audio:play-sfx', { id: won ? 'win' : 'lose' });
  }

  private finishBeat(beatId: string): void {
    const done = this.story.completeBeat(beatId);
    if (done?.unlocksDistrict) this.world.unlock(done.unlocksDistrict);
    if (done?.isEnding) this.ui.go('ending');
    this.persist();
  }

  private applySave(save: GameSave): void {
    this.player.hydrate(save.player);
    this.story.hydrate(save.flags, save.completedBeats);
    this.world.hydrate(save.unlockedDistricts);
    this.world.syncFromFlags((f) => this.story.getFlag(f));
    this.upgrades.hydrate(save.upgrades ?? {});
    this.muted = save.muted;
    this.masterVolume = save.masterVolume;
    this.safeJobUses = 0;
    this.lastSafeJobMs = 0;
    this.emitVolume();
  }

  private emitVolume(): void {
    this.bus.emit('audio:volume', {
      master: this.masterVolume,
      muted: this.muted,
    });
  }
}
