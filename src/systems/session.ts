import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { BetDefinition, GameSave, DistrictId } from '../core/types';
import { canAfford, clampStake, resolveBet } from './betting';
import { PlayerSystem } from './player';
import { StorySystem } from './story';
import { WorldSystem } from './world';
import { UpgradeSystem } from './upgrade';
import { DISTRICTS } from '../content/districts';
import { STORY_BEATS } from '../content/story';
import { getBet } from '../content/bets';
import { getJob } from './grind';
import { createDefaultSave, loadFromStorage, saveToStorage } from './save';
import { UiStateMachine } from './ui-state';
import {
  districtExits,
  districtNpcs,
  nearestExit,
  nearestNpc,
  type DistrictExit,
  type WorldNpc,
} from './interaction';
import { buildDistrictMap, isWalkable, tileAt, type MapDef } from '../world/maps';
import { currentObjective, type Objective } from './objectives';

const SAFE_JOB_COOLDOWN_MS = 10_000;
const SAFE_JOB_CAP = 6;

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
    if (this.npcBlocks(nx, ny)) return false;
    this.player.setPosition(nx, ny);
    // All districts: stepping onto an unlocked exit pad travels (consistent).
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
    return nearestNpc(this.npcs, s.districtId, s.x, s.y);
  }

  nearbyExit(): DistrictExit | null {
    const s = this.player.getStats();
    const exit = nearestExit(this.exits, s.districtId, s.x, s.y);
    if (!exit) return null;
    return this.world.isUnlocked(exit.toDistrict) ? exit : null;
  }

  interact(): boolean {
    if (!this.ui.is('play')) return false;
    const exit = this.nearbyExit();
    if (exit) return this.travelTo(exit.toDistrict);
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
    const stake = clampStake(bet, bet.stake, credits);
    if (!canAfford(credits, stake)) {
      const giver = this.safeJobHint();
      this.bus.emit('ui:toast', {
        message: `Not enough credits — talk to ${giver} (safe odd jobs) or Esc → Side Jobs.`,
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
    if (npc.beatId) {
      const available = this.story.availableBeats(npc.districtId);
      if (available.some((b) => b.id === npc.beatId)) {
        return this.beginStoryBeat(npc.beatId);
      }
    }
    if (npc.jobBetId) return this.offerBet(npc.jobBetId);
    if (npc.safeJobId) return this.doSafeJob(npc.safeJobId);
    this.bus.emit('ui:toast', {
      message: `${npc.name}: Come back later.`,
      kind: 'info',
    });
    return false;
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

  private npcBlocks(x: number, y: number): boolean {
    const id = this.player.getStats().districtId;
    return this.npcs.some((n) => n.districtId === id && n.x === x && n.y === y);
  }

  private safeJobHint(): string {
    const id = this.player.getStats().districtId;
    const giver = this.npcs.find((n) => n.districtId === id && n.safeJobId);
    return giver?.name ?? 'the odd-job worker';
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
