import { EventBus } from '../core/event-bus';
import { createRng, type Rng } from '../core/rng';
import type { BetDefinition, GameSave, DistrictId } from '../core/types';
import { canAfford, clampStake, defaultStake, payoutForWin, resolveBet } from './betting';
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
  EXIT_CLEAR_RANGE,
  EXIT_STAND_RANGE,
  type DistrictExit,
  type WorldNpc,
} from './interaction';
import { buildDistrictMap, buildTorreVip, type MapDef } from '../world/maps';
import { slideStep } from '../world/slide';
import { currentObjective, sideQuestMarkers, type Objective } from './objectives';
import {
  assistAfterMiss,
  attemptSkill,
  isSequencePhase,
  perfectAttempt,
  skillForBet,
  startSkill,
  type SkillProgress,
} from './minigame';
import { resolveInteractPriority, shouldClearExitLatch } from './interact-priority';
import {
  anyDroneSpots,
  reachedGoal,
  spotReset,
  startStealth,
  stealthForBet,
  tickStealth,
  winStealth,
  type StealthProgress,
} from './stealth';

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
  private skillProgress: SkillProgress | null = null;
  private stealthProgress: StealthProgress | null = null;
  private elevating = false;
  /** After travel, ignore pads until the player walks clear of EXIT_CLEAR_RANGE. */
  private exitLatch = false;
  /** Brief time latch so a held key cannot bounce on the reciprocal pad. */
  private exitLatchUntil = 0;
  /** True while Rita is on the distinct VIP floor map. */
  private vipFloor = false;
  private skillStreak = 0;
  private vipMap: MapDef = buildTorreVip();
  /** Ending panel shows the credits roll after the laje epilogue. */
  private creditsRoll = false;

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

  isVipFloor(): boolean {
    return this.vipFloor;
  }

  showingCreditsRoll(): boolean {
    return this.creditsRoll;
  }

  getSkillStreak(): number {
    return this.skillStreak;
  }

  startNew(): void {
    this.applySave(createDefaultSave());
    this.vipFloor = false;
    this.exitLatch = false;
    this.exitLatchUntil = 0;
    this.stealthProgress = null;
    this.skillStreak = 0;
    this.creditsRoll = false;
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
    if (id === 'torre-casa' && this.vipFloor) return this.vipMap;
    return this.maps.get(id) ?? buildDistrictMap(id);
  }

  /** NPCs visible on the active Casa floor (or all NPCs elsewhere). */
  floorNpcs(): WorldNpc[] {
    const id = this.player.getStats().districtId;
    if (id !== 'torre-casa') return this.npcs;
    const want = this.vipFloor ? 'vip' : 'foyer';
    return this.npcs.filter((n) => {
      if (n.districtId !== 'torre-casa') return true;
      return (n.floor ?? 'foyer') === want;
    });
  }

  move(dx: number, dy: number): boolean {
    if (!this.ui.is('play')) return false;
    if (this.stealthProgress && !this.stealthProgress.done) {
      return this.moveStealth(dx, dy);
    }
    const s = this.player.getStats();
    const map = this.getMap();
    const dest = slideStep(map, s.x, s.y, dx, dy);
    if (!dest) return false;
    this.player.setFacing(dest.x - s.x || dx, dest.y - s.y || dy);
    // NPCs are non-blocking — walk-through keeps interaction from trapping the player.
    this.player.setPosition(dest.x, dest.y);
    this.refreshExitLatch();
    // All pads: walk-in within stand range (latch prevents bounce-back).
    if (!this.vipFloor) {
      const exit = this.nearbyExit();
      if (exit) return this.travelTo(exit.toDistrict);
    }
    return true;
  }

  private moveStealth(dx: number, dy: number): boolean {
    const s = this.player.getStats();
    const map = this.getMap();
    const dest = slideStep(map, s.x, s.y, dx, dy);
    if (!dest) return false;
    this.player.setFacing(dest.x - s.x || dx, dest.y - s.y || dy);
    this.player.setPosition(dest.x, dest.y);
    this.tickStealthFrame(0.05);
    return true;
  }

  /** Advance drones; spot → checkpoint; goal → win. Call from the render loop. */
  tickStealthFrame(dt: number): void {
    if (!this.stealthProgress || this.stealthProgress.done) return;
    this.stealthProgress = tickStealth(this.stealthProgress, dt);
    const pos = this.player.getStats();
    if (reachedGoal(this.stealthProgress, pos)) {
      this.stealthProgress = winStealth(this.stealthProgress);
      this.finishSkill(true);
      return;
    }
    if (anyDroneSpots(this.stealthProgress, pos)) {
      this.stealthProgress = spotReset(this.stealthProgress);
      const cp = this.stealthProgress.checkpoint;
      this.player.setPosition(cp.x, cp.y);
      this.bus.emit('ui:toast', {
        message: 'Spotted — back to checkpoint. No credit loss.',
        kind: 'danger',
      });
      this.bus.emit('fx:flash', { kind: 'lose' });
    }
  }

  getStealthProgress(): StealthProgress | null {
    return this.stealthProgress;
  }

  isStealthActive(): boolean {
    return Boolean(this.stealthProgress && !this.stealthProgress.done);
  }

  /** E2e / harness: skip the stealth corridor. */
  completeStealthPerfect(): boolean {
    if (!this.stealthProgress || !this.pendingBetId) return false;
    this.stealthProgress = winStealth(this.stealthProgress);
    return this.finishSkill(true);
  }

  travelTo(districtId: DistrictId): boolean {
    if (!this.world.isUnlocked(districtId)) return false;
    const district = this.world.get(districtId);
    if (!district) return false;
    const from = this.player.getStats().districtId;
    this.bus.emit('world:transition', { kind: 'fade', from, to: districtId });
    this.bus.emit('fx:flash', { kind: 'travel' });
    this.bus.emit('audio:play-sfx', { id: 'travel' });
    this.vipFloor = false;
    this.player.setDistrict(districtId);
    // Arrive at the reciprocal pad (not mid-street spawn) with latch engaged.
    const arrival = this.exits.find(
      (e) => e.districtId === districtId && e.toDistrict === from,
    );
    if (arrival) this.player.setPosition(arrival.x, arrival.y);
    else this.player.setPosition(district.spawn.x, district.spawn.y);
    this.exitLatch = true;
    // Time latch + spatial hysteresis — stops Odds↔Tower bounce from a held step.
    this.exitLatchUntil = Date.now() + 450;
    this.ui.go('play');
    this.bus.emit('district:entered', { districtId });
    return true;
  }

  /** True while a chase/hack/evade sequence phase owns arrow input. */
  isSequenceSkillActive(): boolean {
    if (!this.ui.is('skill') || !this.skillProgress || this.skillProgress.done) {
      return false;
    }
    const phase = this.skillProgress.def.phases[this.skillProgress.phaseIndex];
    return isSequencePhase(phase);
  }

  /** Last player screen anchor for the E-prompt (updated by world-view). */
  promptAnchor: { x: number; y: number } | null = null;

  /**
   * Elevator pad wins when the player stands on/near the car (≤1.6 tiles),
   * even if another objective NPC is still in the wider interact radius.
   */
  nearbyElevatorPad(): WorldNpc | null {
    const s = this.player.getStats();
    const elev = this.floorNpcs().find((n) => n.id.startsWith('elevator'));
    if (!elev || elev.districtId !== s.districtId) return null;
    if (Math.hypot(elev.x - s.x, elev.y - s.y) > 1.6) return null;
    return elev;
  }

  /** Objective NPC first when in range; otherwise nearest preferred story NPC. */
  nearbyNpc(): WorldNpc | null {
    const elev = this.nearbyElevatorPad();
    if (elev) return elev;
    const s = this.player.getStats();
    const face = this.player.getFacing();
    const pool = this.floorNpcs();
    const available = new Set(this.story.availableBeats(s.districtId).map((b) => b.id));
    const obj = this.objective();
    const objectiveNpc =
      obj.targetName && obj.districtId === s.districtId
        ? pool.find(
            (n) =>
              n.districtId === s.districtId &&
              n.name === obj.targetName &&
              Math.hypot(n.x - s.x, n.y - s.y) <= 3.5,
          )
        : undefined;
    if (objectiveNpc) return objectiveNpc;
    return nearestNpc({
      npcs: pool,
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      faceDx: face.dx,
      faceDy: face.dy,
      prefer: (npc) => npcStoryBeatIds(npc).some((id) => available.has(id)),
    });
  }

  /** Secondary nearby NPC when objective already claimed the primary prompt. */
  nearbyAltNpc(): WorldNpc | null {
    const primary = this.nearbyNpc();
    const s = this.player.getStats();
    const face = this.player.getFacing();
    const available = new Set(this.story.availableBeats(s.districtId).map((b) => b.id));
    const alt = nearestNpc({
      npcs: this.floorNpcs().filter((n) => n.id !== primary?.id),
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      faceDx: face.dx,
      faceDy: face.dy,
      prefer: (npc) => npcStoryBeatIds(npc).some((id) => available.has(id)),
    });
    return alt && alt.id !== primary?.id ? alt : null;
  }

  nearbyExit(): DistrictExit | null {
    if (this.vipFloor) return null;
    // Time latch only while still standing on/near a pad after arrival.
    if (this.exitLatch || Date.now() < this.exitLatchUntil) return null;
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
    if (this.vipFloor) return null;
    if (this.exitLatch || Date.now() < this.exitLatchUntil) return null;
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

  private refreshExitLatch(): void {
    if (!this.exitLatch && Date.now() >= this.exitLatchUntil) return;
    const s = this.player.getStats();
    const here = this.exits.filter((e) => e.districtId === s.districtId);
    // Clear spatial + time latch once outside the larger hysteresis radius.
    if (shouldClearExitLatch(s, here, EXIT_CLEAR_RANGE)) {
      this.exitLatch = false;
      this.exitLatchUntil = 0;
    }
  }

  /** Dismiss ending / credits and keep the completed save for side jobs / grind. */
  continueExploring(): boolean {
    if (!this.ui.is('ending')) return false;
    const afterCredits = this.creditsRoll;
    this.creditsRoll = false;
    this.story.setFlag('free_roam', true);
    this.persist();
    if (!this.ui.go('play')) return false;
    this.bus.emit('game:started', { newGame: false });
    this.bus.emit('ui:toast', {
      message: afterCredits
        ? 'Credits rolled — free roam. Side hustles stay open on every district.'
        : 'Free roam — grind side jobs or explore. Epilogue waits on the hill with Nair.',
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
    // Standing on an elevator pad always uses the car before other NPCs.
    const elev = this.nearbyElevatorPad();
    if (elev) return this.interactNpc(elev);
    const npc = this.nearbyNpc();
    const obj = this.objective();
    const objHit = Boolean(npc && obj.targetName && npc.name === obj.targetName);
    const exit = this.nearbyExit();
    const locked = this.nearbyLockedExit();
    const kind = resolveInteractPriority({
      objectiveNpcInRange: objHit,
      unlockedExitInRange: Boolean(exit),
      lockedExitInRange: Boolean(locked),
      otherNpcInRange: Boolean(npc) && !objHit,
    });
    if (kind === 'objective' && npc) return this.interactNpc(npc);
    if (kind === 'travel' && exit) return this.travelTo(exit.toDistrict);
    if (kind === 'locked') {
      this.bus.emit('ui:toast', {
        message: 'Path locked — finish the current bet first.',
        kind: 'info',
      });
      return false;
    }
    if (kind === 'npc' && npc) return this.interactNpc(npc);
    this.bus.emit('ui:toast', { message: 'Nobody in range.', kind: 'info' });
    return false;
  }

  offerBet(betId: string): boolean {
    const bet = getBet(betId);
    if (!bet) return false;
    // Story skills: top up before afford check so a broke player is never locked out.
    if (this.pendingStoryBeat && bet.skill) this.ensureStoryCredits(bet.stake);
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
    // In-world stealth corridor (Neon Snap) — walk Odds Avenue, dodge drones.
    const stealthDef = stealthForBet(betId);
    if (stealthDef && this.pendingStoryBeat) {
      this.stealthProgress = startStealth(stealthDef);
      this.player.setPosition(stealthDef.start.x, stealthDef.start.y);
      this.bus.emit('skill:started', { betId, kind: 'evade' });
      this.bus.emit('audio:play-sfx', { id: 'bet' });
      this.bus.emit('ui:toast', {
        message:
          'Neon Snap — slip past the drones. Spotted = checkpoint, no credit loss.',
        kind: 'info',
      });
      return this.ui.go('play');
    }
    // Story skill encounters skip the coin-flip panel.
    if (bet.skill && this.pendingStoryBeat) {
      const def = skillForBet(bet.id, bet.skill);
      if (def) {
        this.skillProgress = startSkill(def);
        this.bus.emit('skill:started', { betId, kind: bet.skill });
        this.bus.emit('audio:play-sfx', { id: 'bet' });
        return this.ui.go('skill');
      }
    }
    return this.ui.go('bet');
  }

  getSkillProgress(): SkillProgress | null {
    return this.skillProgress;
  }

  /** Player attempt on the current skill phase. */
  submitSkill(value: number): boolean {
    if (!this.skillProgress || !this.pendingBetId) return false;
    const beforeMisses = this.skillProgress.misses;
    const next = attemptSkill(this.skillProgress, {
      phaseIndex: this.skillProgress.phaseIndex,
      value,
    });
    // Pick snap / full fail ends the encounter (do not treat as a soft retry).
    if (next.done) {
      this.skillProgress = next;
      return this.finishSkill(next.won);
    }
    if (next.justMissed || next.misses > beforeMisses) {
      // Retry current phase only — no stake drain, optional timing assist.
      this.skillProgress = assistAfterMiss(next);
      const phase = this.skillProgress.def.phases[this.skillProgress.phaseIndex];
      const left =
        phase?.kind === 'lockpick' && this.skillProgress.pickLeft !== undefined
          ? ` Pick left: ${this.skillProgress.pickLeft}.`
          : '';
      const widened =
        phase?.kind === 'timing'
          ? ' Zone widened / needle slowed — try this phase again.'
          : ` Retry this phase.${left}`;
      this.bus.emit('ui:toast', {
        message: `Missed phase ${this.skillProgress.phaseIndex + 1}.${widened}`,
        kind: 'info',
      });
      this.bus.emit('audio:play-sfx', { id: 'lose' });
      this.bus.emit('fx:flash', { kind: 'lose' });
      return true;
    }
    this.skillProgress = next;
    this.bus.emit('audio:play-sfx', { id: 'interact' });
    return true;
  }

  /** Harness / e2e: auto-clear remaining skill phases with perfect play. */
  completeSkillPerfect(): boolean {
    if (this.stealthProgress && !this.stealthProgress.done) {
      return this.completeStealthPerfect();
    }
    if (!this.skillProgress) return false;
    let p = this.skillProgress;
    let guard = 0;
    while (!p.done && guard < 64) {
      guard += 1;
      const before = p.misses;
      p = attemptSkill(p, perfectAttempt(p));
      if (p.justMissed || p.misses > before) {
        // Perfect attempts should never miss — bail if they do.
        break;
      }
    }
    this.skillProgress = p;
    if (!p.done || !p.won) return false;
    return this.finishSkill(true);
  }

  /**
   * Story skills never charge stake on a miss. Stake is only settled on a
   * full encounter win so the player cannot be credit-locked out of the story.
   */
  private finishSkill(won: boolean): boolean {
    const betId = this.pendingBetId;
    if (!betId) return false;
    const bet = getBet(betId);
    if (!bet) return false;
    this.ensureStoryCredits(bet.stake);
    const stake = clampStake(
      bet,
      this.pendingStake || bet.stake,
      this.player.getStats().credits,
    );
    let payout = 0;
    let delta = 0;
    if (won) {
      this.player.addCredits(-stake);
      payout = payoutForWin(stake, bet.odds);
      this.skillStreak += 1;
      if (this.skillStreak >= 2) {
        payout += Math.min(40, 5 * this.skillStreak);
      }
      this.player.addCredits(payout);
      delta = payout - stake;
    } else {
      // Story-critical: no stake loss on incomplete fail paths (cancel / abandon).
      this.skillStreak = 0;
    }
    const rep =
      (won ? bet.reputationDeltaWin : bet.reputationDeltaLose) +
      (won ? this.upgrades.fameBonus() : 0);
    this.player.addReputation(rep);
    const phase = this.skillProgress?.cleared ?? 0;
    this.bus.emit('skill:resolved', { betId, won, phase });
    this.bus.emit('fx:flash', { kind: won ? 'win' : 'lose' });
    this.bus.emit('fx:credits', { delta });
    this.afterBetResolved(bet, won);
    this.bus.emit('bet:resolved', {
      betId: bet.id,
      won,
      payout: won ? payout : 0,
      stake: won ? stake : 0,
    });
    if (!this.ui.is('ending') && !this.elevating) {
      this.toastSkill(won, payout);
      this.ui.go('play');
    }
    this.pendingBetId = null;
    this.pendingStake = 0;
    this.skillProgress = null;
    this.stealthProgress = null;
    return true;
  }

  /** Top up credits so a story skill stake is always payable. */
  ensureStoryCredits(minStake: number): void {
    if (!this.pendingStoryBeat) return;
    const need = Math.max(0, minStake - this.player.getStats().credits);
    if (need > 0) this.player.addCredits(need);
  }

  private toastSkill(won: boolean, payout: number): void {
    this.bus.emit('ui:toast', {
      message: won
        ? `Cleared — ${payout} credits.`
        : 'Encounter closed — story beat still open. No stake taken.',
      kind: won ? 'success' : 'info',
    });
    this.bus.emit('audio:play-sfx', { id: won ? 'win' : 'ui' });
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
    this.skillProgress = null;
    this.stealthProgress = null;
    this.ui.go('play');
  }

  /** Apply a dialogue choice flag mid-beat. Choices are stripped so they don't loop. */
  pickDialogueChoice(setsFlag?: string, reply?: string): void {
    // Drop choice buttons from the transcript — pick once, then Continue / Take bet.
    this.lastDialogue = this.lastDialogue.map((line) =>
      line.choices ? { speaker: line.speaker, text: line.text } : line,
    );
    if (setsFlag) this.story.setFlag(setsFlag, true);
    if (reply) {
      this.lastDialogue = [...this.lastDialogue, { speaker: 'Rita Odds', text: reply }];
      this.bus.emit('ui:dialogue', { speaker: 'Rita Odds', text: reply });
    }
    // Epilogue: after the choice strip, ensure Nair's Saúde line is the closing beat
    // (already in dialogue — re-emit so HUD paints it before the credits timeout).
    if (this.pendingStoryBeat === 'epilogue-laje') {
      const beat = getBeat('epilogue-laje');
      const saude = beat?.dialogue.find(
        (l) => /Saúde/i.test(l.text) && !l.choices?.length,
      );
      if (saude) {
        // Move Saúde to the end (after reply) so paint shows it last.
        this.lastDialogue = [
          ...this.lastDialogue.filter((l) => !/Saúde/i.test(l.text)),
          saude,
        ];
        this.bus.emit('ui:dialogue', { speaker: saude.speaker, text: saude.text });
      }
    }
    this.bus.emit('audio:play-sfx', { id: 'ui' });
  }

  /** True when the open dialogue still has unresolved choice buttons. */
  hasOpenDialogueChoices(): boolean {
    return this.lastDialogue.some((l) => Boolean(l.choices?.length));
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
        detail: 'Safe odd jobs refill credits without a house edge.',
        targetName: giver?.name,
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
      npcs: this.floorNpcs(),
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
      const id = this.pendingStoryBeat;
      this.pendingStoryBeat = null;
      this.finishBeat(id);
      // Ending / credits must stick — do not bounce back to play.
      if (this.ui.is('ending')) return;
    }
    this.ui.backToPlay();
  }

  /** Pending dialogue beat id (tests / HUD). */
  getPendingStoryBeat(): string | null {
    return this.pendingStoryBeat;
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
    this.bus.emit('fx:flash', { kind: 'interact' });
    this.bus.emit('audio:play-sfx', { id: 'interact' });
    if (npc.id === 'elevator-vip' && this.vipFloor) {
      this.descendVipElevator();
      return true;
    }
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

  private descendVipElevator(): void {
    this.bus.emit('world:transition', {
      kind: 'elevator',
      from: 'torre-casa',
      to: 'torre-casa',
    });
    this.vipFloor = false;
    this.player.setPosition(24, 11);
    this.player.setFacing(0, 1);
    this.bus.emit('ui:toast', {
      message: 'Elevator returns to the pit foyer.',
      kind: 'info',
    });
    this.bus.emit('district:entered', { districtId: 'torre-casa' });
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
    // Soft pity is capped at 2 stacks (+16%) — never claim climbing past 100%.
    const stacks = Math.min(2, Math.max(0, priorLosses + 1));
    const pity =
      !won && stacks > 0 ? ` Soft pity +${stacks * 8}% (max +16%) on the next roll.` : '';
    this.bus.emit('ui:toast', {
      message: won ? `Won ${payout} credits!` : `The house took this one.${pity}`,
      kind: won ? 'success' : 'danger',
    });
    this.bus.emit('audio:play-sfx', { id: won ? 'win' : 'lose' });
  }

  private finishBeat(beatId: string): void {
    const done = this.story.completeBeat(beatId);
    if (done?.unlocksDistrict) this.world.unlock(done.unlocksDistrict);
    if (beatId === 'torre-elevator') this.runElevatorRide();
    if (done?.isEnding) this.ui.go('ending');
    if (beatId === 'epilogue-laje') {
      this.creditsRoll = true;
      this.ui.go('ending');
      this.bus.emit('story:credits', {});
    }
    this.persist();
  }

  /** Visible elevator ride: fade + swap to the distinct VIP floor map. */
  private runElevatorRide(): void {
    this.elevating = true;
    this.bus.emit('world:transition', {
      kind: 'elevator',
      from: 'torre-casa',
      to: 'torre-casa',
    });
    this.bus.emit('fx:flash', { kind: 'travel' });
    this.bus.emit('audio:play-sfx', { id: 'travel' });
    this.ui.go('transition');
    // Floor state swaps immediately so objectives/NPCs resolve; UI fades ~1.1s.
    this.vipFloor = true;
    this.player.setPosition(30, 10);
    this.player.setFacing(0, 1);
    const finish = (): void => {
      this.elevating = false;
      this.ui.go('play');
      this.bus.emit('district:entered', { districtId: 'torre-casa' });
      this.bus.emit('ui:toast', {
        message: 'Elevator doors open on the VIP salon.',
        kind: 'success',
      });
    };
    if (typeof setTimeout === 'function') setTimeout(finish, 1100);
    else finish();
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
