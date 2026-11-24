import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { BetDefinition, GameSave, DistrictId } from '../core/types';
import { canAfford, resolveBet } from './betting';
import { PlayerSystem } from './player';
import { StorySystem } from './story';
import { WorldSystem } from './world';
import { DISTRICTS } from '../content/districts';
import { STORY_BEATS } from '../content/story';
import { getBet } from '../content/bets';
import { createDefaultSave, loadFromStorage, saveToStorage } from './save';

export class GameSession {
  readonly bus: EventBus;
  readonly player: PlayerSystem;
  readonly story: StorySystem;
  readonly world: WorldSystem;
  private rng: Rng;
  private muted = false;
  private masterVolume = 0.7;

  constructor(seed = 42, bus = new EventBus()) {
    this.bus = bus;
    this.rng = createRng(seed);
    this.player = new PlayerSystem(bus);
    this.story = new StorySystem(bus, STORY_BEATS);
    this.world = new WorldSystem(bus, DISTRICTS);
  }

  startNew(): void {
    this.applySave(createDefaultSave());
    this.bus.emit('game:started', { newGame: true });
  }

  tryLoad(): boolean {
    const save = loadFromStorage();
    if (!save) return false;
    this.applySave(save);
    this.bus.emit('game:started', { newGame: false });
    return true;
  }

  persist(): void {
    saveToStorage(this.toSave());
    this.bus.emit('game:saved', { slot: 1 });
  }

  move(dx: number, dy: number): void {
    const s = this.player.getStats();
    const next = this.world.clampPosition(s.districtId, s.x + dx, s.y + dy);
    this.player.setPosition(next.x, next.y);
  }

  travelTo(districtId: DistrictId): boolean {
    if (!this.world.isUnlocked(districtId)) return false;
    const district = this.world.get(districtId);
    if (!district) return false;
    this.player.setDistrict(districtId);
    this.player.setPosition(district.spawn.x, district.spawn.y);
    return true;
  }

  placeBet(betId: string, stakeOverride?: number): boolean {
    const bet = getBet(betId);
    if (!bet) return false;
    const stake = stakeOverride ?? bet.stake;
    const credits = this.player.getStats().credits;
    if (!canAfford(credits, stake)) {
      this.bus.emit('ui:toast', {
        message: 'Not enough credits, parça.',
        kind: 'danger',
      });
      return false;
    }
    return this.settleBet(bet, stake);
  }

  runStoryBeat(beatId: string): boolean {
    const beat = this.story.startBeat(beatId);
    if (!beat) return false;
    for (const line of beat.dialogue) {
      this.bus.emit('ui:dialogue', { speaker: line.speaker, text: line.text });
    }
    if (beat.betId) {
      const ok = this.placeBet(beat.betId);
      if (!ok) return false;
    }
    this.finishBeat(beat.id);
    return true;
  }

  availableStory(): ReturnType<StorySystem['availableBeats']> {
    return this.story.availableBeats(this.player.getStats().districtId);
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
    };
  }

  private settleBet(bet: BetDefinition, stake: number): boolean {
    this.player.addCredits(-stake);
    const result = resolveBet(bet, this.rng, stake);
    this.player.addCredits(result.payout);
    const rep = result.won ? bet.reputationDeltaWin : bet.reputationDeltaLose;
    this.player.addReputation(rep);
    this.bus.emit('bet:resolved', {
      betId: bet.id,
      won: result.won,
      payout: result.payout,
      stake,
    });
    this.afterBetFlags(bet, result.won);
    this.toastBet(result.won, result.payout);
    return true;
  }

  private afterBetFlags(bet: BetDefinition, won: boolean): void {
    if (!won) return;
    if (bet.unlocksFlag) this.story.setFlag(bet.unlocksFlag, true);
    if (bet.unlocksDistrict) this.world.unlock(bet.unlocksDistrict);
  }

  private toastBet(won: boolean, payout: number): void {
    this.bus.emit('ui:toast', {
      message: won ? `Won ${payout} credits!` : 'The house took this one.',
      kind: won ? 'success' : 'danger',
    });
    this.bus.emit('audio:play-sfx', { id: won ? 'win' : 'lose' });
  }

  private finishBeat(beatId: string): void {
    const done = this.story.completeBeat(beatId);
    if (done?.unlocksDistrict) this.world.unlock(done.unlocksDistrict);
    this.persist();
  }

  private applySave(save: GameSave): void {
    this.player.hydrate(save.player);
    this.story.hydrate(save.flags, save.completedBeats);
    this.world.hydrate(save.unlockedDistricts);
    this.world.syncFromFlags((f) => this.story.getFlag(f));
    this.muted = save.muted;
    this.masterVolume = save.masterVolume;
    this.emitVolume();
  }

  private emitVolume(): void {
    this.bus.emit('audio:volume', {
      master: this.masterVolume,
      muted: this.muted,
    });
  }
}
