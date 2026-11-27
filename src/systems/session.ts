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
  tickNpcWander,
  EXIT_CLEAR_RANGE,
  EXIT_COOLDOWN_MS,
  EXIT_STAND_RANGE,
  INTERACT_RANGE,
  arrivalSpawnFromPad,
  type DistrictExit,
  type WorldNpc,
} from './interaction';
import { buildDistrictMap, buildTorreVip, type MapDef } from '../world/maps';
import { nearestWalkable, slideStep, unstuckAlongPush } from '../world/slide';
import {
  currentObjective,
  nextBeat,
  sideQuestMarkers,
  type Objective,
} from './objectives';
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
import {
  advanceTutorial,
  consumeMinigameTip,
  createTutorialState,
  noteTutorialAction,
  setTutorialOverlayHidden,
  skipTutorial,
  tutorialFinished,
  tutorialFlags,
  tutorialPanelVisible,
  tutorialStepId,
  type TutorialAction,
  type TutorialState,
} from './tutorial';
import { t, tf } from '../i18n';
import { localizedNpcName } from '../i18n/localize-npc';
import { localizeBeatDialogue, localizeHushLine } from '../i18n/localize-story';
import { DEBUG_CHAPTERS, parseDebugChapter, type DebugChapterId } from './debug-chapter';
import {
  canNeedleInput,
  markNeedleMotionStarted,
  startNeedleArm,
  type NeedleArmState,
} from './needle-arm';
import { DEBUG_MINIGAME_BETS, type DebugMinigameId } from './debug-qa';

const SAFE_JOB_COOLDOWN_MS = 10_000;
const SAFE_JOB_CAP = 6;
/** Soft floor matching common story/grind stakes (e.g. água gelada). */
const BROKE_STAKE_FLOOR = 8;

/** Align with keyboard.ts normalizeKeyCode for Interact keys. */
export function normInteractCode(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === 'Enter' || code === 'NumpadEnter') return 'Enter';
  if (code === 'Space') return 'Space';
  return code;
}

/**
 * Playtest #40/#46: Stop / E only after ready + arm time.
 * Prefer `canNeedleInput(session.getNeedleArm(), now)` for new code.
 */
export function canNeedleStop(ready: boolean, now: number, readyUntil: number): boolean {
  return ready && now >= readyUntil;
}

/** Playtest #41: visible skill end banner before returning to play. */
export type SkillResultBanner = {
  won: boolean;
  payout: number;
  creditsDelta: number;
  repDelta: number;
  /** Playtest #49: duel win/lose uses a dedicated headline. */
  skillKind?: string;
};

/** Playtest #46: soft-miss fail card (retry / leave) — not toast-only. */
export type SkillMissCard = {
  headline: string;
  detail: string;
};

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
  /**
   * Playtest #43: true when dialogue was opened from play (E / beat start).
   * False after a choice pick — offer-bet then needs a time arm against Enter leak.
   */
  private dialogueFromPlay = false;
  private lossesByBet = new Map<string, number>();
  private safeJobUses = 0;
  private lastSafeJobMs = 0;
  private skillProgress: SkillProgress | null = null;
  /** Playtest #41: brief win/lose banner after a skill before returning to play. */
  private skillResult: SkillResultBanner | null = null;
  private stealthProgress: StealthProgress | null = null;
  private elevating = false;
  /** After travel, ignore the arrival pad until leave CLEAR + cooldown. */
  private exitLatch = false;
  /** Cooldown after travel before the arrival pad can re-arm. */
  private exitLatchUntil = 0;
  /** True once the player has left CLEAR of the arrival pad. */
  private exitCleared = false;
  /** Reciprocal pad id that bounced us here — only this pad is gated. */
  private arrivalExitId: string | null = null;
  /** Pad id currently underfoot for dwell timing. */
  /** After travel, block all walk-in exits until Run is released once. */
  private awaitRunRelease = false;
  private runHeld = false;
  /** True while Rita is on the distinct VIP floor map. */
  private vipFloor = false;
  private skillStreak = 0;
  private vipMap: MapDef = buildTorreVip();
  /** Ending panel shows the credits roll after the laje epilogue. */
  private creditsRoll = false;
  /** Playtest #46: rewatch credits from menu after first completion. */
  private creditsUnlocked = false;
  /** Playtest #46: needle Stop/E gate (countdown + grace). */
  private needleArm: NeedleArmState | null = null;
  /** Playtest #46: soft-miss fail card while the encounter is still live. */
  private skillMissCard: SkillMissCard | null = null;
  /** QA `?timescale=` — slows minigame clocks (1 = realtime). */
  private qaTimescale = 1;
  /** QA `?minigame=` — win/lose returns to play, never story dialogue. */
  private qaSandbox = false;
  /** Rematch anti-spam after Close — short arm; held keys need release. */
  private interactLockUntil = 0;
  /** After a dialog closes/opens, require Interact key release if it was held. */
  private interactNeedsRelease = false;
  /** Key-up arrived during the time lock — apply after lock expires. */
  private interactReleasePending = false;
  /** True while Interact (E/Enter/Space/A) is physically down. */
  private interactKeyDown = false;
  /** Physical key code of the current Interact press (KeyE / Enter / Space / …). */
  private lastInteractCode: string | null = null;
  /**
   * Playtest #28: after any skill result, Enter/Space must not rematch —
   * only a fresh KeyE (or gamepad/touch) on the NPC.
   */
  private rematchNeedsKeyE = false;
  /** Modal confirm (dialogue/skill): ignore Interact held at open until key-up. */
  private modalConfirmNeedsRelease = false;
  private modalConfirmArmUntil = 0;
  /** Enter/E was down during the arm — release must start a quiet period. */
  private modalHeldThroughArm = false;
  /** Key-up arrived during the arm — apply when the arm expires. */
  private modalReleasePending = false;
  /**
   * Playtest #40: Interact codes held when the modal opened. A fresh keydown of a
   * code not in this set advances — we must not require a keyup we never saw.
   */
  private modalHeldCodes = new Set<string>();
  /** Playtest #38: holding into a solid wall — nudge after >1s. */
  private wallPush: {
    dx: number;
    dy: number;
    since: number;
    x: number;
    y: number;
  } | null = null;
  /** New Game onboarding + first-time minigame tips. */
  private tutorial: TutorialState = createTutorialState();

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

  /** Ambient NPC leash — tiny drift, never into Neon Snap lane. */
  tickWorldNpcs(dt: number, phase: number): void {
    for (const npc of this.npcs) tickNpcWander(npc, dt, phase);
  }

  showingCreditsRoll(): boolean {
    return this.creditsRoll;
  }

  /** True after the story credits have rolled once (menu rewatch). */
  canRewatchCredits(): boolean {
    return (
      this.creditsUnlocked ||
      this.story.getFlag('epilogue_done') ||
      this.story.getFlag('casa_quebrada')
    );
  }

  /** Esc / title: re-open the credits roll when the story is complete. */
  openCreditsRoll(): boolean {
    if (!this.canRewatchCredits()) return false;
    this.creditsRoll = true;
    this.creditsUnlocked = true;
    this.ui.go('ending');
    this.bus.emit('story:credits', {});
    return true;
  }

  getSkillStreak(): number {
    return this.skillStreak;
  }

  getNeedleArm(): NeedleArmState | null {
    return this.needleArm;
  }

  /** Start Em 3…2…1 + grace gate for the live timing panel. */
  beginNeedleArm(now = performance.now(), countdownMs?: number, graceMs?: number): void {
    this.needleArm = startNeedleArm(now, countdownMs, graceMs);
  }

  markNeedleMotionStarted(now = performance.now()): void {
    if (!this.needleArm) return;
    this.needleArm = markNeedleMotionStarted(this.needleArm, now);
  }

  isNeedleInputArmed(now = performance.now()): boolean {
    return canNeedleInput(this.needleArm, now);
  }

  clearNeedleArm(): void {
    this.needleArm = null;
  }

  getSkillMissCard(): SkillMissCard | null {
    return this.skillMissCard;
  }

  /** Soft-miss card → keep progress and remount the phase. */
  retrySkillMiss(): void {
    this.skillMissCard = null;
    const p = this.skillProgress;
    if (!p || p.done) return;
    const phase = p.def.phases[p.phaseIndex];
    const cap = phase?.maxMisses;
    // At/over the soft-miss cap, Retry resets the phase attempt.
    if (cap !== undefined && p.misses >= cap) {
      this.skillProgress = {
        ...p,
        misses: 0,
        seqIndex: 0,
        justMissed: false,
      };
    }
  }

  /**
   * Soft-miss card → abandon the encounter with a lose result card
   * (playtest #49: never silent-drop back to the world).
   */
  leaveSkillMiss(): void {
    this.skillMissCard = null;
    if (this.skillProgress && this.pendingBetId) {
      this.finishSkill(false);
      return;
    }
    this.cancelBet();
  }

  isQaSandbox(): boolean {
    return this.qaSandbox;
  }

  getQaTimescale(): number {
    return this.qaTimescale;
  }

  setQaTimescale(scale: number): void {
    this.qaTimescale = scale > 0 && scale <= 1 ? scale : 1;
  }

  /** QA `?minigame=` — open a skill panel over the current scene. */
  debugOpenMinigame(id: DebugMinigameId): boolean {
    const betId = DEBUG_MINIGAME_BETS[id];
    if (!betId) return false;
    this.player.addCredits(500);
    this.qaSandbox = true;
    this.pendingStoryBeat = 'qa-minigame';
    return this.offerBet(betId);
  }

  startNew(): void {
    this.applySave(createDefaultSave());
    this.qaSandbox = false;
    this.qaTimescale = 1;
    this.vipFloor = false;
    this.exitLatch = false;
    this.exitLatchUntil = 0;
    // Fresh spawn can use pads; travelTo gates only the arrival pad.
    this.exitCleared = true;
    this.arrivalExitId = null;
    this.awaitRunRelease = false;
    this.runHeld = false;
    this.stealthProgress = null;
    this.skillStreak = 0;
    this.creditsRoll = false;
    this.tutorial = createTutorialState();
    // Playwright / automated runs: skip onboarding so e2e stays deterministic.
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      this.tutorial = skipTutorial(this.tutorial);
      this.story.setFlag('tutorialDone', true);
    }
    this.ui.go('play');
    this.story.completeBeat('intro-laje');
    this.bus.emit('game:started', { newGame: true });
    if (this.tutorial.active) this.bus.emit('ui:tutorial', { active: true });
    this.bus.emit('ui:toast', {
      message: t('ui.findNairToast'),
      kind: 'info',
    });
  }

  getTutorial(): TutorialState {
    return this.tutorial;
  }

  tutorialStep(): string | null {
    return tutorialStepId(this.tutorial);
  }

  advanceTutorialStep(): void {
    this.tutorial = advanceTutorial(this.tutorial);
    this.emitTutorial();
  }

  /** Advance when the player does the matching action (move / E / objective / bet). */
  noteTutorialProgress(action: TutorialAction): void {
    if (!this.tutorial.active) return;
    const before = this.tutorial.stepIndex;
    this.tutorial = noteTutorialAction(this.tutorial, action);
    if (this.tutorial.stepIndex !== before || tutorialFinished(this.tutorial)) {
      this.emitTutorial();
    }
  }

  skipTutorialNow(): void {
    this.tutorial = skipTutorial(this.tutorial);
    this.story.setFlag('tutorialDone', true);
    this.bus.emit('ui:tutorial', { active: false });
    this.persist();
  }

  /** Hide tutorial panel under dialogs/menus/minigames; restore on play. */
  setTutorialOverlay(hidden: boolean): void {
    if (!this.tutorial.active) return;
    const next = setTutorialOverlayHidden(this.tutorial, hidden);
    if (next === this.tutorial) return;
    this.tutorial = next;
    this.bus.emit('ui:tutorial', {
      active: tutorialPanelVisible(this.tutorial),
    });
  }

  tutorialIsPanelVisible(): boolean {
    return tutorialPanelVisible(this.tutorial);
  }

  private emitTutorial(): void {
    if (tutorialFinished(this.tutorial)) {
      this.story.setFlag('tutorialDone', true);
      this.bus.emit('ui:tutorial', { active: false });
      this.persist();
      return;
    }
    this.bus.emit('ui:tutorial', {
      active: tutorialPanelVisible(this.tutorial),
    });
  }

  /** First-time tip for a minigame kind; null if already seen. */
  /** Last first-open tip id shown this skill open (for in-panel howto line). */
  private lastMinigameTip: string | null = null;

  peekMinigameTip(kind: string): string | null {
    // Playtest #36: Luna ball uses a fair, clue-specific tip (not generic choice).
    const tipKind = this.pendingBetId === 'laje-lottery' ? 'lajeLottery' : kind;
    const { state, tip } = consumeMinigameTip(this.tutorial, tipKind);
    this.lastMinigameTip = tip;
    if (!tip) return null;
    this.tutorial = state;
    this.story.setFlag(`tip_${tip}`, true);
    return tip;
  }

  /** Playtest #48: one-sentence howto on first open of a minigame kind. */
  getLastMinigameTip(): string | null {
    return this.lastMinigameTip;
  }

  /** Consume the in-panel howto so phase remounts do not repeat it. */
  clearLastMinigameTip(): void {
    this.lastMinigameTip = null;
  }

  /** Harness / screenshots — reinstate onboarding without wiping the save. */
  resetTutorialForDemo(state: TutorialState): void {
    this.tutorial = state;
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
    // Playtest #29: exits are prompt + E only — never auto-travel on dwell/walk-in.
    const s = this.player.getStats();
    const map = this.getMap();
    // Playtest #37: free softlocks when standing inside a collider.
    if (this.unstuckIfNeeded(map)) return true;
    const dest = slideStep(map, s.x, s.y, dx, dy);
    if (dest) {
      this.wallPush = null;
      this.player.setFacing(dest.x - s.x || dx, dest.y - s.y || dy);
      // NPCs are non-blocking — walk-through keeps interaction from trapping the player.
      this.player.setPosition(dest.x, dest.y);
      this.refreshExitLatch();
      return true;
    }
    if (dx !== 0 || dy !== 0) {
      this.player.setFacing(dx, dy);
      // Playtest #38: pressed into a collider >1s → nudge to open corridor.
      if (this.maybeWallPushUnstuck(map, dx, dy)) {
        this.refreshExitLatch();
        return true;
      }
    } else {
      this.wallPush = null;
    }
    this.refreshExitLatch();
    return false;
  }

  /** Nudge onto the nearest free tile when the avatar is inside a solid. */
  unstuckIfNeeded(map = this.getMap()): boolean {
    const s = this.player.getStats();
    const free = nearestWalkable(map, s.x, s.y);
    if (!free) return false;
    this.wallPush = null;
    this.player.setPosition(free.x, free.y);
    this.refreshExitLatch();
    return true;
  }

  /**
   * Playtest #39: hold input >1s with ~zero displacement → nudge around the
   * collider (not only when dest===null for a matching push vector).
   */
  maybeWallPushUnstuck(map: MapDef, dx: number, dy: number): boolean {
    const now = Date.now();
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const s = this.player.getStats();
    const sameDir = this.wallPush && this.wallPush.dx === sx && this.wallPush.dy === sy;
    const sameTile = this.wallPush && this.wallPush.x === s.x && this.wallPush.y === s.y;
    if (!sameDir || !sameTile) {
      this.wallPush = { dx: sx, dy: sy, since: now, x: s.x, y: s.y };
      return false;
    }
    if (now - this.wallPush!.since < 1000) return false;
    const free = unstuckAlongPush(map, s.x, s.y, sx, sy);
    if (!free) return false;
    this.wallPush = null;
    this.player.setPosition(free.x, free.y);
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
        message: t('ui.toast.spotted'),
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

  /** True when the player is not inside any live drone cone (cover counts). */
  isStealthSafe(): boolean {
    if (!this.stealthProgress || this.stealthProgress.done) return true;
    const s = this.player.getStats();
    return !anyDroneSpots(this.stealthProgress, { x: s.x, y: s.y });
  }

  /** E2e / harness: skip the stealth corridor. */
  completeStealthPerfect(): boolean {
    if (!this.stealthProgress || !this.pendingBetId) return false;
    this.stealthProgress = winStealth(this.stealthProgress);
    return this.finishSkill(true);
  }

  /**
   * E2e / harness: open a story skill panel for `betId` without dialogue.
   * Sets a pending story beat so offerBet skips the coin-flip stake panel.
   */
  forceStorySkill(betId: string): boolean {
    this.pendingStoryBeat = 'e2e-skill';
    return this.offerBet(betId);
  }

  /**
   * QA / playtest: `?chapter=feira|avenida|torre|vip|epilogue` — new game at that beat.
   * Completes prior story beats, unlocks districts, seeds credits/rep.
   */
  debugStartChapter(raw: string): boolean {
    const id = parseDebugChapter(raw);
    if (!id) return false;
    return this.applyDebugChapter(id);
  }

  private applyDebugChapter(id: DebugChapterId): boolean {
    const preset = DEBUG_CHAPTERS[id];
    this.startNew();
    this.skipTutorialNow();
    for (const beat of STORY_BEATS) {
      if (preset.skipEndingBeat && beat.isEnding) continue;
      this.story.completeBeat(beat.id);
      if (beat.unlocksDistrict) this.world.unlock(beat.unlocksDistrict);
      if (beat.id === preset.completeThrough) break;
    }
    for (const flag of preset.extraFlags ?? []) this.story.setFlag(flag, true);
    const stats = this.player.getStats();
    if (preset.credits > stats.credits)
      this.player.addCredits(preset.credits - stats.credits);
    if (preset.reputation > stats.reputation) {
      this.player.addReputation(preset.reputation - stats.reputation);
    }
    this.world.unlock(preset.district);
    if (!this.travelTo(preset.district)) {
      this.player.setDistrict(preset.district);
    }
    if (preset.vipFloor) {
      this.vipFloor = true;
      this.player.setPosition(28, 11);
      this.player.setFacing(1, 0);
      this.bus.emit('district:entered', { districtId: 'torre-casa' });
    }
    this.ui.go('play');
    this.persist();
    // Playtest #45: chapter jumps must toast the live objective, not stale Find Nair.
    this.bus.emit('ui:toast', {
      message: this.objective().text,
      kind: 'info',
    });
    return true;
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
    // Spawn a few tiles OFF the reciprocal pad, facing inward — never on the trigger.
    const arrival = this.exits.find(
      (e) => e.districtId === districtId && e.toDistrict === from,
    );
    if (arrival) {
      const spawn = arrivalSpawnFromPad(arrival);
      this.player.setPosition(spawn.x, spawn.y);
      this.player.setFacing(spawn.dx, spawn.dy);
      this.arrivalExitId = arrival.id;
    } else {
      this.player.setPosition(district.spawn.x, district.spawn.y);
      this.arrivalExitId = null;
    }
    this.exitLatch = true;
    this.exitCleared = false;
    // Cooldown + leave/re-enter on the arrival pad only — other doors stay open.
    this.exitLatchUntil = Date.now() + EXIT_COOLDOWN_MS;
    // Holding Run through arrival chain-traveled the next district — require a release.
    this.awaitRunRelease = this.runHeld;
    this.ui.go('play');
    // Playtest #30: only arm when Interact is held across travel (harness stays free).
    if (this.interactKeyDown) this.armInteractLock(true, 300);
    // Playtest #37: arrival pad / spawn must never leave the avatar inside a solid.
    this.unstuckIfNeeded();
    this.bus.emit('district:entered', { districtId });
    return true;
  }

  /** App feeds Run key state each tick so arrival travel can wait for release. */
  setRunHeld(held: boolean): void {
    if (!held) this.awaitRunRelease = false;
    this.runHeld = held;
    this.player.setRunning(held);
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

  /** Prefer the objective NPC when in range; otherwise nearest. */
  nearbyNpc(): WorldNpc | null {
    const elev = this.nearbyElevatorPad();
    if (elev) return elev;
    const s = this.player.getStats();
    const face = this.player.getFacing();
    const pool = this.floorNpcs();
    const available = new Set(this.story.availableBeats(s.districtId).map((b) => b.id));
    const objectiveNpc = this.objectiveNpcInRange(pool);
    // Playtest #23/#29: objective wins whenever it is in interact range.
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

  /** Objective target NPC if standing inside INTERACT_RANGE (name, id, or marker). */
  objectiveNpcInRange(pool = this.floorNpcs()): WorldNpc | null {
    const s = this.player.getStats();
    const obj = this.objective();
    if (obj.districtId !== s.districtId) return null;
    const inRange = (n: WorldNpc): boolean =>
      n.districtId === s.districtId && Math.hypot(n.x - s.x, n.y - s.y) <= INTERACT_RANGE;
    // Match by English name, localized display name, or beat ownership.
    if (obj.targetName) {
      const byName = pool.find(
        (n) =>
          inRange(n) &&
          (n.name === obj.targetName || localizedNpcName(n) === obj.targetName),
      );
      if (byName) return byName;
    }
    const next = nextBeat({
      beats: STORY_BEATS,
      completed: this.story.getCompleted(),
      flags: (f) => this.story.getFlag(f),
      districtId: s.districtId,
      npcs: pool,
      exits: this.exits,
      unlocked: (id) => this.world.isUnlocked(id as DistrictId),
    });
    if (next) {
      const byBeat = pool.find((n) => inRange(n) && npcStoryBeatIds(n).includes(next.id));
      if (byBeat) return byBeat;
    }
    if (obj.targetX != null && obj.targetY != null) {
      const byPos = pool.find(
        (n) => inRange(n) && Math.hypot(n.x - obj.targetX!, n.y - obj.targetY!) < 0.6,
      );
      if (byPos) return byPos;
    }
    return null;
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
    // Chain-travel fix: no walk-in until Run is released after a running arrival.
    if (this.awaitRunRelease) return null;
    const s = this.player.getStats();
    const exit = nearestExit({
      exits: this.exits,
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      range: EXIT_STAND_RANGE,
    });
    if (!exit) return null;
    if (this.arrivalPadBlocked(exit)) return null;
    return this.world.isUnlocked(exit.toDistrict) ? exit : null;
  }

  /** Locked exit underfoot / adjacent — for toast + prompt feedback. */
  nearbyLockedExit(): DistrictExit | null {
    if (this.vipFloor) return null;
    const s = this.player.getStats();
    const exit = nearestExit({
      exits: this.exits,
      districtId: s.districtId,
      x: s.x,
      y: s.y,
      range: EXIT_STAND_RANGE,
    });
    if (!exit || this.arrivalPadBlocked(exit)) return null;
    return this.world.isUnlocked(exit.toDistrict) ? null : exit;
  }

  /** Only the reciprocal arrival pad is gated (leave + cooldown + re-enter). */
  private arrivalPadBlocked(exit: DistrictExit): boolean {
    if (!this.arrivalExitId || exit.id !== this.arrivalExitId) return false;
    if (Date.now() < this.exitLatchUntil || this.exitLatch || !this.exitCleared) {
      return true;
    }
    // Gate satisfied — release so walk-in / E works on this pad again.
    this.arrivalExitId = null;
    return false;
  }

  private refreshExitLatch(): void {
    if (!this.arrivalExitId) return;
    const s = this.player.getStats();
    const arrival = this.exits.find((e) => e.id === this.arrivalExitId);
    if (!arrival) {
      this.exitLatch = false;
      this.exitCleared = true;
      this.arrivalExitId = null;
      return;
    }
    // Arm re-entry after leaving CLEAR; drop the gate once cooldown also elapsed.
    if (shouldClearExitLatch(s, [arrival], EXIT_CLEAR_RANGE)) {
      this.exitLatch = false;
      this.exitCleared = true;
      if (Date.now() >= this.exitLatchUntil) this.arrivalExitId = null;
    }
  }

  /** Dismiss ending / credits and keep the completed save for side jobs / grind. */
  continueExploring(): boolean {
    if (!this.ui.is('ending')) return false;
    const afterCredits = this.creditsRoll;
    this.creditsRoll = false;
    if (afterCredits) this.creditsUnlocked = true;
    this.story.setFlag('free_roam', true);
    this.persist();
    if (!this.ui.go('play')) return false;
    // Playtest #31: Enter must never reopen Nair — only KeyE (same as rematch).
    this.rematchNeedsKeyE = true;
    this.armInteractLock(true, 500);
    this.bus.emit('game:started', { newGame: false });
    this.bus.emit('ui:toast', {
      message: afterCredits ? t('ui.toast.continueCredits') : t('ui.toast.continueFree'),
      kind: 'info',
    });
    return true;
  }

  /** Optional side-quest markers in the current district. */
  sideMarkers(): { x: number; y: number; label: string }[] {
    const s = this.player.getStats();
    const marks = sideQuestMarkers({
      beats: STORY_BEATS,
      completed: this.story.getCompleted(),
      flags: (f) => this.story.getFlag(f),
      districtId: s.districtId,
      npcs: this.npcs,
      exits: this.exits,
      unlocked: (id) => this.world.isUnlocked(id as DistrictId),
    });
    // VIP floor: always mark the descend pad (no district travel exits up here).
    if (this.vipFloor) {
      const elev = this.floorNpcs().find((n) => n.id === 'elevator-vip');
      if (elev)
        marks.push({ x: elev.x, y: elev.y, label: t('ui.elevatorCard.downMark') });
    }
    return marks;
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
      return t('ui.broke.escJobs');
    }
    const same = giver.districtId === this.player.getStats().districtId;
    return same
      ? tf('ui.broke.talkSame', { name: giver.name })
      : tf('ui.broke.talkOther', { name: giver.name, district: giver.districtId });
  }

  /**
   * Input-layer gate after Close/skill: ignore Interact while the arm is live.
   * After a skill result, Enter/Space never rematch — only KeyE / pad / touch.
   * Key-up during the arm clears needsRelease only after the arm expires.
   */
  allowInteractInput(): boolean {
    const now = Date.now();
    if (now < this.interactLockUntil) return false;
    if (this.rematchNeedsKeyE) {
      const code = this.lastInteractCode;
      if (code === 'Enter' || code === 'Space') return false;
      this.rematchNeedsKeyE = false;
      this.interactNeedsRelease = false;
      this.interactReleasePending = false;
      return true;
    }
    if (this.interactNeedsRelease && !this.interactKeyDown) {
      this.interactNeedsRelease = false;
      this.interactReleasePending = false;
    }
    if (this.interactReleasePending) {
      this.interactNeedsRelease = false;
      this.interactReleasePending = false;
    }
    if (this.interactNeedsRelease) return false;
    return true;
  }

  /** Track physical Interact key state for rematch / first-press gates. */
  noteInteractPressed(code?: string): void {
    this.interactKeyDown = true;
    this.lastInteractCode = code ?? null;
    const norm = normInteractCode(code);
    // Mash during the modal arm → require post-arm release + quiet period.
    if (Date.now() < this.modalConfirmArmUntil) {
      this.modalConfirmNeedsRelease = true;
      this.modalHeldThroughArm = true;
      if (norm) this.modalHeldCodes.add(norm);
    }
  }

  /**
   * Modal confirm gate. Optional `code` = the key being pressed now (playtest #40):
   * a fresh key that was not held at open is allowed once the time arm expires.
   */
  allowModalConfirm(code?: string): boolean {
    this.flushModalReleasePending();
    if (Date.now() < this.modalConfirmArmUntil) return false;
    const want = normInteractCode(code);
    if (want) {
      // Key still marked held-from-open → need its key-up first.
      if (this.modalHeldCodes.has(want)) return false;
      // Stuck needsRelease with no tracked key (keyup raced the arm) — heal.
      if (this.modalConfirmNeedsRelease && this.modalHeldCodes.size === 0) {
        this.modalConfirmNeedsRelease = false;
        this.modalHeldThroughArm = false;
      }
      // Fresh key (e.g. Enter after opening with E) → advance.
      return true;
    }
    if (this.modalHeldCodes.size > 0) return false;
    if (this.modalConfirmNeedsRelease) return false;
    return true;
  }

  /** True while Interact/Enter is physically held (HUD arm helpers). */
  isInteractHeld(): boolean {
    return this.interactKeyDown;
  }

  /** Last Interact key code (KeyE / Enter / Space) — for confirm gating. */
  getLastInteractCode(): string | null {
    return this.lastInteractCode;
  }

  /** Interact codes currently held (for dialog open arming). */
  heldInteractCodes(): string[] {
    if (!this.interactKeyDown) return [];
    const c = normInteractCode(this.lastInteractCode);
    return c ? [c] : ['KeyE'];
  }

  /** Call when dialogue/skill/bet opens. `interactHeld` = Interact down at open. */
  noteModalOpened(interactHeld: boolean, heldCodes?: string[]): void {
    // Playtest #28/#31: short arm; key-up only required for codes held at open.
    this.modalConfirmArmUntil = Date.now() + 250;
    const codes =
      heldCodes ?? (interactHeld || this.interactKeyDown ? this.heldInteractCodes() : []);
    this.modalHeldCodes = new Set(codes.map((c) => normInteractCode(c) ?? c));
    this.modalConfirmNeedsRelease =
      this.modalHeldCodes.size > 0 || interactHeld || this.interactKeyDown;
    // Playtest #43: do not mark heldThroughArm on open — that added a +400ms quiet
    // after releasing the choice Enter and made Take-bet need a 2nd press.
    // Mash during the arm still sets heldThroughArm via noteInteractPressed/bump.
    this.modalHeldThroughArm = false;
    this.modalReleasePending = false;
  }

  /** Playtest #33: clear arm so Viajar / menu Confirm works on the first Enter. */
  clearModalConfirmGate(): void {
    this.modalConfirmArmUntil = 0;
    this.modalConfirmNeedsRelease = false;
    this.modalHeldThroughArm = false;
    this.modalReleasePending = false;
    this.modalHeldCodes.clear();
  }

  /**
   * Playtest #40: plain dialogue — no time arm. Only block keys held at open;
   * a fresh keydown of any other confirm key advances immediately.
   */
  armPlainDialogueAdvance(interactHeld: boolean | string[] = false): void {
    const codes = Array.isArray(interactHeld)
      ? interactHeld
      : interactHeld || this.interactKeyDown
        ? this.heldInteractCodes()
        : [];
    this.modalConfirmArmUntil = 0;
    this.modalHeldCodes = new Set(
      codes.map((c) => normInteractCode(c)).filter((c): c is string => Boolean(c)),
    );
    this.modalConfirmNeedsRelease = this.modalHeldCodes.size > 0;
    this.modalHeldThroughArm = false;
    this.modalReleasePending = false;
  }

  /** True while the open dialogue has choice buttons (mash-sensitive). */
  dialogueHasChoices(): boolean {
    return this.lastDialogue.some((l) => Boolean(l.choices?.length));
  }

  /** True when this dialogue line was opened from play (E), not a choice follow-up. */
  isDialogueFromPlay(): boolean {
    return this.dialogueFromPlay;
  }

  /** Mash during arm / blocked confirm: reset arm so 60ms bursts never clear. */
  bumpModalConfirmArm(): void {
    // Playtest #42/#43: if nothing was held at open, do not invent a held Enter.
    // Also do NOT clear an active time/quiet arm — clearing made the first
    // blocked Enter disarm the gate so only the 2nd Enter advanced (Esc→E→Enter).
    if (this.modalHeldCodes.size === 0) return;
    this.modalConfirmArmUntil = Date.now() + 400;
    this.modalConfirmNeedsRelease = true;
    this.modalHeldThroughArm = true;
    this.modalReleasePending = false;
  }

  private flushModalReleasePending(): void {
    if (!this.modalReleasePending) return;
    if (Date.now() < this.modalConfirmArmUntil) return;
    if (this.interactKeyDown) return;
    this.modalReleasePending = false;
    if (this.modalHeldCodes.size === 0) this.modalConfirmNeedsRelease = false;
    // Release-during-arm: quiet starts at arm expiry (not at this flush),
    // so a late first Enter after a slow open can't auto-pick.
    if (this.modalHeldThroughArm) {
      const quietEnd = this.modalConfirmArmUntil + 400;
      this.modalHeldThroughArm = false;
      if (Date.now() < quietEnd) this.modalConfirmArmUntil = quietEnd;
    }
  }

  /**
   * @param fromInput — when true (keyboard/gamepad), also require Interact key release
   * after a dialog closes. Programmatic callers (story-walk / tests) omit this.
   */
  /** Playtest #31: Enter/Space never starts dialogue — only KeyE. */
  private talkBlockedByEnter(fromInput: boolean): boolean {
    if (!fromInput) return false;
    return this.lastInteractCode === 'Enter' || this.lastInteractCode === 'Space';
  }

  private talkToNpc(npc: WorldNpc): boolean {
    this.noteTutorialProgress('interacted');
    return this.interactNpc(npc);
  }

  private dispatchInteract(
    kind: ReturnType<typeof resolveInteractPriority>,
    npc: WorldNpc | null,
    exit: ReturnType<GameSession['nearbyExit']>,
    blockTalk: boolean,
  ): boolean {
    if ((kind === 'objective' || kind === 'npc') && npc) {
      return blockTalk ? false : this.talkToNpc(npc);
    }
    if (kind === 'travel' && exit) {
      this.noteTutorialProgress('interacted');
      return this.travelTo(exit.toDistrict);
    }
    if (kind === 'locked') {
      const lockedExit = this.nearbyLockedExit();
      const msg =
        lockedExit?.toDistrict === 'torre-casa'
          ? t('ui.toast.pathLockedTorre')
          : t('ui.toast.pathLocked');
      this.bus.emit('ui:toast', { message: msg, kind: 'info' });
      return false;
    }
    this.bus.emit('ui:toast', { message: t('ui.toast.nobodyInRange'), kind: 'info' });
    return false;
  }

  interact(fromInput = false): boolean {
    if (!this.ui.is('play')) return false;
    if (fromInput && !this.allowInteractInput()) return false;
    if (!fromInput && Date.now() < this.interactLockUntil) return false;
    // Standing on an elevator pad always uses the car before other NPCs.
    const elev = this.nearbyElevatorPad();
    if (elev) return this.talkToNpc(elev);
    const npc = this.nearbyNpc();
    const objNpc = this.objectiveNpcInRange();
    const objHit = Boolean(objNpc && npc && npc.id === objNpc.id);
    const exit = this.nearbyExit();
    const locked = this.nearbyLockedExit();
    const kind = resolveInteractPriority({
      objectiveNpcInRange: objHit,
      unlockedExitInRange: Boolean(exit),
      lockedExitInRange: Boolean(locked),
      otherNpcInRange: Boolean(npc) && !objHit,
    });
    return this.dispatchInteract(kind, npc, exit, this.talkBlockedByEnter(fromInput));
  }

  offerBet(betId: string): boolean {
    const bet = getBet(betId);
    if (!bet) return false;
    // Neon Snap: once cleared, never restart stealth / rematch the story bet.
    if (betId === 'avenida-drone' && this.story.getFlag('drone_ok')) {
      this.bus.emit('ui:toast', {
        message: t('ui.toast.neonSnapDone'),
        kind: 'info',
      });
      return false;
    }
    // Story skills: top up before afford check so a broke player is never locked out.
    if (this.pendingStoryBeat && bet.skill) this.ensureStoryCredits(bet.stake);
    const credits = this.player.getStats().credits;
    const stake = defaultStake(bet, credits);
    if (!canAfford(credits, stake)) {
      this.bus.emit('ui:toast', {
        message: this.brokeHintText() ?? t('ui.toast.notEnoughCredits'),
        kind: 'danger',
      });
      return false;
    }
    this.pendingBetId = betId;
    // Hush chip softens the final rail — cheaper Augusto stake.
    if (betId === 'duelo-casa' && this.story.getFlag('neg_hush')) {
      this.pendingStake = Math.max(bet.stakeMin ?? 1, Math.floor(stake * 0.8));
      this.bus.emit('ui:toast', {
        message: t('ui.toast.hushChip'),
        kind: 'success',
      });
    } else {
      this.pendingStake = stake;
    }
    this.bus.emit('bet:offered', { betId, title: bet.title });
    // In-world stealth corridor (Neon Snap) — walk Odds Avenue, dodge drones.
    const stealthDef = stealthForBet(betId);
    if (stealthDef && this.pendingStoryBeat) {
      this.stealthProgress = startStealth(stealthDef);
      this.player.setPosition(stealthDef.start.x, stealthDef.start.y);
      this.bus.emit('skill:started', { betId, kind: 'evade' });
      this.bus.emit('audio:play-sfx', { id: 'bet' });
      this.bus.emit('ui:toast', {
        message: t('ui.toast.neonSnapStart'),
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

  getSkillResult(): SkillResultBanner | null {
    return this.skillResult;
  }

  /** Dismiss the post-skill banner and return to play. */
  dismissSkillResult(): void {
    if (!this.skillResult) return;
    this.skillResult = null;
    // Playtest #47: ?minigame sandbox always returns to the world.
    if (this.qaSandbox) {
      this.qaSandbox = false;
      this.pendingStoryBeat = null;
      this.lastDialogue = [];
    }
    if (!this.elevating && !this.ui.is('ending')) this.ui.go('play');
    this.setTutorialOverlay(false);
  }

  /** Player attempt on the current skill phase. */
  submitSkill(value: number): boolean {
    if (!this.skillProgress || !this.pendingBetId) return false;
    // Playtest #46: unarmed needle Stop/E is a hard no-op (never a miss).
    const phaseLive = this.skillProgress.def.phases[this.skillProgress.phaseIndex];
    if (phaseLive?.kind === 'timing' && this.needleArm) {
      if (!this.isNeedleInputArmed()) return true;
    }
    const beforeMisses = this.skillProgress.misses;
    const next = attemptSkill(this.skillProgress, {
      phaseIndex: this.skillProgress.phaseIndex,
      value,
    });
    // Pick snap / full fail ends the encounter (do not treat as a soft retry).
    if (next.done) {
      this.skillProgress = next;
      this.clearNeedleArm();
      return this.finishSkill(next.won);
    }
    if (next.justMissed || next.misses > beforeMisses) {
      // Retry current phase only — no stake drain, optional timing assist.
      this.skillProgress = assistAfterMiss(next);
      this.clearNeedleArm();
      // Playtest #49: duel maxMisses → lose result (other skills keep soft miss card).
      const phaseNow = this.skillProgress.def.phases[this.skillProgress.phaseIndex];
      const cap = phaseNow?.maxMisses;
      if (
        this.skillProgress.def.kind === 'duel' &&
        cap !== undefined &&
        this.skillProgress.misses >= cap
      ) {
        this.bus.emit('audio:play-sfx', { id: 'lose' });
        this.bus.emit('fx:flash', { kind: 'lose' });
        return this.finishSkill(false);
      }
      this.showSoftMissCard();
      this.bus.emit('audio:play-sfx', { id: 'lose' });
      this.bus.emit('fx:flash', { kind: 'lose' });
      return true;
    }
    this.skillProgress = next;
    this.bus.emit('audio:play-sfx', { id: 'interact' });
    return true;
  }

  /**
   * Harness / e2e: auto-clear remaining skill phases with perfect play.
   * Pass `keepBanner: true` to leave the win/lose result card painted.
   */
  completeSkillPerfect(opts?: { keepBanner?: boolean }): boolean {
    const keepBanner = opts?.keepBanner === true;
    if (this.stealthProgress && !this.stealthProgress.done) {
      return this.completeStealthPerfect();
    }
    // Soft-miss card — clear so perfect play can remount the phase.
    if (this.skillMissCard) this.skillMissCard = null;
    this.clearNeedleArm();
    // Orphan result banner (no live phase) — dismiss so walkers are not stuck.
    if (!this.skillProgress) {
      if (this.skillResult) {
        if (!keepBanner) this.dismissSkillResult();
        return true;
      }
      return false;
    }
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
    const ok = this.finishSkill(true);
    // Harness / e2e: auto-clear the result banner so callers see play.
    // Panel screenshots pass keepBanner to capture the win card.
    if (this.skillResult && !keepBanner) this.dismissSkillResult();
    return ok;
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
    const { payout, delta } = this.applySkillPayout(won, stake, bet);
    const rep =
      (won ? bet.reputationDeltaWin : bet.reputationDeltaLose) +
      (won ? this.upgrades.fameBonus() : 0);
    this.player.addReputation(rep);
    const phase = this.skillProgress?.cleared ?? 0;
    const storyBeat = this.pendingStoryBeat;
    this.bus.emit('skill:resolved', { betId, won, phase });
    this.bus.emit('fx:flash', { kind: won ? 'win' : 'lose' });
    this.afterBetResolved(bet, won);
    this.bus.emit('bet:resolved', {
      betId: bet.id,
      won,
      payout: won ? payout : 0,
      stake: won ? stake : 0,
    });
    const skillKind = this.skillProgress?.def.kind;
    this.pendingBetId = null;
    this.pendingStake = 0;
    this.skillProgress = null;
    this.skillMissCard = null;
    this.clearNeedleArm();
    this.stealthProgress = null;
    if (!this.ui.is('ending')) {
      // Playtest #43: set result before credit floater so HUD can suppress it.
      this.skillResult = {
        won,
        payout,
        creditsDelta: delta,
        repDelta: rep,
        skillKind,
      };
      // Result card already shows the delta — skip overlapping +N cr floater.
      this.afterSkillUi(won, payout, storyBeat);
    } else {
      this.bus.emit('fx:credits', { delta });
    }
    return true;
  }

  private applySkillPayout(
    won: boolean,
    stake: number,
    bet: BetDefinition,
  ): { payout: number; delta: number } {
    if (!won) {
      this.skillStreak = 0;
      return { payout: 0, delta: 0 };
    }
    this.player.addCredits(-stake);
    let payout = payoutForWin(stake, bet.odds);
    this.skillStreak += 1;
    if (this.skillStreak >= 2) payout += Math.min(40, 5 * this.skillStreak);
    this.player.addCredits(payout);
    return { payout, delta: payout - stake };
  }

  /** Keep skill UI for the result banner (unless elevating); require fresh KeyE. */
  private afterSkillUi(won: boolean, _payout: number, _storyBeat: string | null): void {
    if (!this.elevating) {
      this.bus.emit('audio:play-sfx', { id: won ? 'win' : 'ui' });
      this.ui.go('skill');
    }
    // Playtest #28: fresh KeyE after any skill — never Enter rematch (incl. VIP).
    this.rematchNeedsKeyE = true;
    this.armInteractLock(this.interactKeyDown, 400);
    if (won) this.noteTutorialProgress('firstBet');
    this.setTutorialOverlay(true);
  }

  /** Top up credits so a story skill stake is always payable. */
  ensureStoryCredits(minStake: number): void {
    if (!this.pendingStoryBeat) return;
    const need = Math.max(0, minStake - this.player.getStats().credits);
    if (need > 0) this.player.addCredits(need);
  }

  /** Per-NPC / per-bet miss line — never the generic “try again” alone. */
  private missHintForBet(betId: string): string {
    const key = `ui.toast.missHint.${betId}`;
    const v = t(key);
    return v !== key ? v : t('ui.toast.missHint.default');
  }

  /** Guaranteed credits — cooldown + daily cap so it can't be farmed forever. */
  doSafeJob(jobId: string): boolean {
    const job = getJob(jobId);
    if (!job?.flatPay) return false;
    if (this.safeJobUses >= SAFE_JOB_CAP) {
      this.bus.emit('ui:toast', {
        message: t('ui.toast.oddJobsCap'),
        kind: 'info',
      });
      return false;
    }
    const now = Date.now();
    if (now - this.lastSafeJobMs < SAFE_JOB_COOLDOWN_MS) {
      this.bus.emit('ui:toast', {
        message: t('ui.toast.oddJobsCooldown'),
        kind: 'info',
      });
      return false;
    }
    const pay = job.flatPay + this.upgrades.getLevel('bolso') * 40;
    this.player.addCredits(pay);
    this.safeJobUses += 1;
    this.lastSafeJobMs = now;
    this.bus.emit('ui:toast', {
      message: tf('ui.toast.oddJobsEarned', {
        pay: String(pay),
        uses: String(this.safeJobUses),
        cap: String(SAFE_JOB_CAP),
      }),
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
        message: t('ui.toast.upgradeCannot'),
        kind: 'danger',
      });
      return false;
    }
    this.player.addCredits(-cost);
    this.persist();
    this.bus.emit('ui:toast', {
      message: tf('ui.toast.upgradeBought', { cost: String(cost) }),
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
    this.skillResult = null;
    this.skillMissCard = null;
    this.clearNeedleArm();
    this.stealthProgress = null;
    // Force play even if a prior transition edge was odd — Esc must free WASD.
    this.ui.backToPlay();
    this.armInteractLock(this.interactKeyDown);
    // Playtest #43: Esc-cancel must not leave Enter arming that swallows the
    // first Enter when the NPC dialogue is re-opened.
    this.clearModalConfirmGate();
  }

  /** Soft-miss fail card detail (sequence feedback / timing widen / lockpick). */
  private showSoftMissCard(): void {
    if (!this.skillProgress || !this.pendingBetId) return;
    const phase = this.skillProgress.def.phases[this.skillProgress.phaseIndex];
    const pickLeft =
      phase?.kind === 'lockpick' && this.skillProgress.pickLeft !== undefined
        ? tf('ui.toast.missedPhasePickLeft', {
            n: String(this.skillProgress.pickLeft),
          })
        : '';
    const missHint = this.missHintForBet(this.pendingBetId);
    const seqCap = phase?.maxMisses;
    const isSeq =
      phase?.kind === 'chase' || phase?.kind === 'hack' || phase?.kind === 'evade';
    const detail =
      isSeq && seqCap
        ? tf('ui.skill.missSeqFeedback', {
            current: String(this.skillProgress.misses),
            max: String(seqCap),
          })
        : phase?.kind === 'timing' && this.skillProgress.misses >= 2
          ? tf('ui.toast.missedPhaseZoneWide', { hint: missHint })
          : `${tf('ui.toast.missedPhaseRetry', { hint: missHint })}${pickLeft}`;
    this.skillMissCard = {
      headline: tf('ui.skill.missCardTitle', {
        phase: String(this.skillProgress.phaseIndex + 1),
      }),
      detail: detail.trim() || t('ui.skill.missCardDetail'),
    };
  }

  /** Playtest #38: negotiate/choice timer expired — lose the encounter (toast already shown). */
  failSkillOffer(): boolean {
    if (!this.skillProgress || !this.pendingBetId) return false;
    return this.finishSkill(false);
  }

  /**
   * Esc / cancel: fully dismiss any modal and restore play input
   * (playtest #29 — Neon Snap optional panel left input captured).
   */
  releaseModalToPlay(): void {
    this.pendingBetId = null;
    this.pendingStake = 0;
    this.pendingBetAfterDialogue = null;
    this.pendingStoryBeat = null;
    this.skillProgress = null;
    this.skillResult = null;
    this.skillMissCard = null;
    this.clearNeedleArm();
    this.stealthProgress = null;
    this.lastDialogue = [];
    this.ui.backToPlay();
    this.armInteractLock(this.interactKeyDown);
    this.clearModalConfirmGate();
  }

  /**
   * Apply a dialogue choice flag mid-beat. Choices are stripped so they don't loop.
   * `fails` (playtest #32): wrong Anfitrião offer — toast + abandon the beat.
   */
  pickDialogueChoice(setsFlag?: string, reply?: string, fails?: boolean): void {
    // Follow-up Take-bet must time-arm against buffered Enter from the choice.
    this.dialogueFromPlay = false;
    // Drop choice buttons from the transcript — pick once, then Continue / Take bet.
    this.lastDialogue = this.lastDialogue.map((line) =>
      line.choices ? { speaker: line.speaker, text: line.text } : line,
    );
    if (fails) {
      this.failDialogueOffer(reply);
      return;
    }
    if (setsFlag) this.story.setFlag(setsFlag, true);
    // Epilogue: skip the reply transcript — show ONLY Saúde as its own panel.
    // lastDialogue is already locale-localized from runStoryBeat.
    if (this.pendingStoryBeat === 'epilogue-laje') {
      const saude = this.lastDialogue.find(
        (l) => /Saúde/i.test(l.text) && !l.choices?.length,
      );
      if (saude) {
        this.lastDialogue = [saude];
        this.bus.emit('ui:dialogue', { speaker: saude.speaker, text: saude.text });
        this.bus.emit('audio:play-sfx', { id: 'ui' });
        return;
      }
    }
    if (reply) {
      this.lastDialogue = [...this.lastDialogue, { speaker: 'Rita Odds', text: reply }];
      this.bus.emit('ui:dialogue', { speaker: 'Rita Odds', text: reply });
    }
    this.bus.emit('audio:play-sfx', { id: 'ui' });
  }

  /** Wrong dialogue offer — soft fail, beat stays retryable. */
  private failDialogueOffer(reply?: string): void {
    const hint = reply?.trim() || t('ui.toast.missedStory');
    this.pendingBetAfterDialogue = null;
    this.pendingStoryBeat = null;
    this.lastDialogue = [];
    this.ui.backToPlay();
    this.armInteractLock(this.interactKeyDown, 400);
    this.bus.emit('ui:toast', { message: hint, kind: 'danger' });
    this.bus.emit('audio:play-sfx', { id: 'lose' });
    this.bus.emit('fx:flash', { kind: 'lose' });
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
      allNpcs: this.npcs,
      vipFloor: this.vipFloor,
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
    // Only demand a fresh Interact release when Interact is actually held
    // (Escape/click close must not eat the next KeyE — playtest #28 Luna).
    const held = this.interactKeyDown;
    if (this.ui.is('dialogue')) {
      // Offer-bet dialogs: Esc = Walk away / Sair — never leave a ghost modal.
      if (this.pendingBetAfterDialogue) {
        this.declineStoryBet();
        this.armInteractLock(held);
        return;
      }
      this.advanceDialogue();
      this.armInteractLock(held);
      return;
    }
    if (this.ui.is('bet') || this.ui.is('skill')) {
      this.cancelBet();
      return;
    }
    this.ui.backToPlay();
    this.armInteractLock(held);
  }

  /**
   * After Close/skill: if the closing key is still held, ignore that key until
   * key-up (playtest #35 — never blanket-swallow the next fresh E/Enter).
   * Skill finish still sets rematchNeedsKeyE so Enter never rematches.
   */
  private armInteractLock(interactHeld = true, ms = 500): void {
    if (interactHeld) {
      this.interactLockUntil = Date.now() + ms;
      this.interactNeedsRelease = true;
    } else {
      this.interactLockUntil = 0;
      this.interactNeedsRelease = false;
    }
    this.interactReleasePending = false;
  }

  /** Call on Interact key-up so a held Enter can't chain rematch dialogs. */
  noteInteractRelease(code?: string): void {
    this.interactKeyDown = false;
    const released = normInteractCode(code ?? this.lastInteractCode);
    if (released) this.modalHeldCodes.delete(released);
    // Key-up during the modal arm — apply once the arm expires (flush on allow).
    if (Date.now() < this.modalConfirmArmUntil) {
      this.modalReleasePending = true;
    } else if (this.modalConfirmNeedsRelease && this.modalHeldCodes.size === 0) {
      this.modalConfirmNeedsRelease = false;
      // Hold-through-arm / mash: quiet period so the next keydown can't auto-pick.
      if (this.modalHeldThroughArm) {
        this.modalConfirmArmUntil = Date.now() + 400;
        this.modalHeldThroughArm = false;
      }
    }
    // Key-up during the rematch time lock only counts once the arm expires.
    if (Date.now() < this.interactLockUntil) {
      this.interactReleasePending = true;
      return;
    }
    this.interactNeedsRelease = false;
    this.interactReleasePending = false;
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
      flags: { ...this.story.exportFlags(), ...tutorialFlags(this.tutorial) },
      completedBeats: this.story.getCompleted(),
      unlockedDistricts: this.world.exportUnlocked(),
      muted: this.muted,
      masterVolume: this.masterVolume,
      upgrades: this.upgrades.export(),
    };
  }

  private interactNpc(npc: WorldNpc): boolean {
    this.player.triggerTalk();
    this.bus.emit('npc:interacted', { npcId: npc.id });
    this.bus.emit('fx:flash', { kind: 'interact' });
    this.bus.emit('audio:play-sfx', { id: 'interact' });
    if (npc.id === 'elevator-vip' && this.vipFloor) {
      this.descendVipElevator();
      return true;
    }
    // Foyer car: re-ride up when the next story beat lives on the VIP floor.
    if (npc.id === 'elevator' && !this.vipFloor && this.needsVipFloorRide()) {
      this.runElevatorRide();
      return true;
    }
    // Neon Snap after clear: completed line only — never rematch stealth / side bet.
    if (npc.id === 'neon-snap' && this.story.getFlag('drone_ok')) {
      return this.showNpcDoneLine(npc, t('ui.neonSnapDone'));
    }
    if (this.tryNpcStory(npc)) return true;
    if (this.npcStoryBlocksRematch(npc)) {
      this.toastNpcBusy(npc);
      return false;
    }
    // Playtest #28: already-beaten story NPCs give a done line — no rematch bet on E.
    if (this.npcStoryBeatDone(npc)) {
      const doneKey = `ui.npcDone.${npc.id}`;
      const doneText = t(doneKey);
      return this.showNpcDoneLine(
        npc,
        doneText === doneKey ? t('ui.npcDone.default') : doneText,
      );
    }
    if (npc.jobBetId) return this.offerBet(npc.jobBetId);
    if (npc.safeJobId) return this.doSafeJob(npc.safeJobId);
    this.toastNpcBusy(npc);
    return false;
  }

  /** True when the NPC's primary story beat is already completed. */
  private npcStoryBeatDone(npc: WorldNpc): boolean {
    if (!npc.beatId) return false;
    return this.story.getCompleted().includes(npc.beatId);
  }

  /** One-shot thank-you dialogue with no bet attached. */
  private showNpcDoneLine(npc: WorldNpc, text: string): boolean {
    this.pendingStoryBeat = null;
    this.pendingBetAfterDialogue = null;
    const speaker = localizedNpcName(npc);
    this.lastDialogue = [{ speaker, text }];
    this.dialogueFromPlay = true;
    this.ui.go('dialogue');
    this.bus.emit('ui:dialogue', { speaker, text });
    return true;
  }

  /** True when the live objective NPC is on the VIP salon (player is in foyer). */
  private needsVipFloorRide(): boolean {
    const s = this.player.getStats();
    const next = nextBeat({
      beats: STORY_BEATS,
      completed: this.story.getCompleted(),
      flags: (f) => this.story.getFlag(f),
      districtId: s.districtId,
      npcs: this.npcs,
      exits: this.exits,
      unlocked: (id) => this.world.isUnlocked(id as DistrictId),
    });
    if (!next || next.districtId !== 'torre-casa') return false;
    const npc = this.npcs.find(
      (n) => n.beatId === next.id || n.extraBeatIds?.includes(next.id),
    );
    return Boolean(npc && (npc.floor ?? 'foyer') === 'vip');
  }

  private descendVipElevator(): void {
    this.bus.emit('world:transition', {
      kind: 'elevator',
      from: 'torre-casa',
      to: 'torre-casa',
      label: t('ui.elevatorCard.foyer'),
    });
    this.ui.go('transition');
    this.vipFloor = false;
    this.player.setPosition(24, 12);
    this.player.setFacing(0, 1);
    const finish = (): void => {
      this.ui.go('play');
      this.bus.emit('ui:toast', {
        message: t('ui.toast.elevatorFoyer'),
        kind: 'info',
      });
      this.bus.emit('district:entered', { districtId: 'torre-casa' });
    };
    if (typeof setTimeout === 'function') setTimeout(finish, 1200);
    else finish();
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
      message: tf('ui.npcBusy', {
        name: localizedNpcName(npc),
        objective: this.objective().text,
      }),
      kind: 'info',
    });
  }

  private beginStoryBeat(beatId: string): boolean {
    const beat = this.story.startBeat(beatId);
    if (!beat) return false;
    this.pendingStoryBeat = beatId;
    this.pendingBetAfterDialogue = beat.betId ?? null;
    this.lastDialogue = localizeBeatDialogue(beatId, beat.dialogue);
    // Hush chip consequence: Augusto notices the quiet door.
    if (beatId === 'torre-final' && this.story.getFlag('neg_hush')) {
      this.lastDialogue = [localizeHushLine(), ...this.lastDialogue];
    }
    this.dialogueFromPlay = true;
    this.ui.go('dialogue');
    for (const line of this.lastDialogue) {
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
    // Playtest #47: QA `?minigame=` never advances story / opens dialogue.
    if (this.qaSandbox || this.pendingStoryBeat === 'qa-minigame') {
      this.pendingStoryBeat = null;
      if (won) {
        this.lossesByBet.set(bet.id, 0);
        // Still grant bet unlocks so sandbox feels real — skip finishBeat.
        this.applyBetWins(bet);
      } else {
        this.lossesByBet.set(bet.id, (this.lossesByBet.get(bet.id) ?? 0) + 1);
      }
      return;
    }
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
      !won && stacks > 0 ? tf('ui.toast.lostBetPity', { pct: String(stacks * 8) }) : '';
    this.bus.emit('ui:toast', {
      message: won
        ? tf('ui.toast.wonBet', { payout: String(payout) })
        : tf('ui.toast.lostBet', { pity }),
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
      // Playtest #46: credits must roll on first completion (not toast-only free roam).
      this.creditsRoll = true;
      this.creditsUnlocked = true;
      this.ui.go('ending');
      this.bus.emit('story:credits', {});
    }
    this.persist();
  }

  /** Visible elevator ride: ~1.2s fade with floor indicator + VIP map swap. */
  private runElevatorRide(): void {
    this.elevating = true;
    this.bus.emit('world:transition', {
      kind: 'elevator',
      from: 'torre-casa',
      to: 'torre-casa',
      label: t('ui.elevatorCard.vip'),
    });
    this.bus.emit('fx:flash', { kind: 'travel' });
    this.bus.emit('audio:play-sfx', { id: 'travel' });
    this.ui.go('transition');
    // Floor state swaps immediately so objectives/NPCs resolve; UI fades ~1.2s.
    this.vipFloor = true;
    this.player.setPosition(28, 11);
    this.player.setFacing(1, 0);
    const finish = (): void => {
      this.elevating = false;
      this.ui.go('play');
      this.bus.emit('district:entered', { districtId: 'torre-casa' });
      this.bus.emit('ui:toast', {
        message: t('ui.elevatorVipOpen'),
        kind: 'success',
      });
    };
    if (typeof setTimeout === 'function') setTimeout(finish, 1200);
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
    this.tutorial = createTutorialState(save.flags);
    this.emitVolume();
  }

  private emitVolume(): void {
    this.bus.emit('audio:volume', {
      master: this.masterVolume,
      muted: this.muted,
    });
  }
}
