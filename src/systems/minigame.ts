/** Skill encounters that replace pure RNG for story gates. */

import { SKILL_PHASE_TABLE } from '../content/skill-phases';

export type SkillKind =
  | 'timing'
  | 'choice'
  | 'puzzle'
  | 'chase'
  | 'hack'
  | 'duel'
  | 'lockpick'
  | 'evade'
  | 'negotiate';

/** Simon-style keys — arrows (movement) + colors (terminals). */
export const SEQ_KEYS = ['↑', '→', '↓', '←', 'R', 'G', 'B', 'Y'] as const;
export type SeqKey = (typeof SEQ_KEYS)[number];

/** Pin height levels for lockpick (0 = sunk, 2 = raised). */
export const LOCK_PIN_LEVELS = 3;

export type SkillPhase = {
  kind: Exclude<SkillKind, 'duel'>;
  prompt: string;
  /** Correct option index / stop window center (0–1) / encoded lockpick / unused. */
  target: number;
  /** Timing green-zone half-width (0–0.5). Wider = easier. */
  window?: number;
  /** Timing needle revolutions per second (higher = harder). */
  needleSpeed?: number;
  options?: string[];
  /**
   * In-world clue. For choice/puzzle must be *indirect* (no answer tokens).
   * For lockpick may be a decoy — never spell every pin height.
   */
  clue?: string;
  /** Chase/hack/evade length fallback when sequence omitted. */
  steps?: number;
  /** Simon sequence the player must reproduce (one key at a time). */
  sequence?: SeqKey[];
  /** Lockpick target pin heights (0–2 each). */
  pins?: number[];
  /** Pin index hidden until first toggle (tension). */
  hiddenPin?: number;
  /** Lockpick / negotiate / sequence countdown in ms. */
  timerMs?: number;
  /** Wrong submits before the pick snaps (lockpick). */
  pickDurability?: number;
  /** Sequence: wrong taps before the encounter fails (tension). */
  maxMisses?: number;
};

/** Encode pin heights as a single base-3 integer for skill attempts. */
export function encodePins(pins: readonly number[]): number {
  let n = 0;
  let mul = 1;
  for (const p of pins) {
    n +=
      (Math.max(0, Math.min(LOCK_PIN_LEVELS - 1, Math.round(p))) % LOCK_PIN_LEVELS) * mul;
    mul *= LOCK_PIN_LEVELS;
  }
  return n;
}

export function decodePins(value: number, count: number): number[] {
  const out: number[] = [];
  let n = Math.max(0, Math.round(value));
  for (let i = 0; i < count; i += 1) {
    out.push(n % LOCK_PIN_LEVELS);
    n = Math.floor(n / LOCK_PIN_LEVELS);
  }
  return out;
}

export function phasePins(phase: SkillPhase): number[] {
  if (phase.pins?.length) return [...phase.pins];
  const n = phase.steps ?? 3;
  return Array.from({ length: n }, (_, i) => (i + 1) % LOCK_PIN_LEVELS);
}

export type SkillDef = {
  kind: SkillKind;
  title: string;
  blurb: string;
  phases: SkillPhase[];
};

export type SkillAttempt = {
  phaseIndex: number;
  /** Player stop 0–1, chosen option index, or sequence key index into SEQ_KEYS. */
  value: number;
};

export type SkillProgress = {
  def: SkillDef;
  phaseIndex: number;
  /** Successful phases so far. */
  cleared: number;
  /** Correct sequence taps within the current chase/hack/evade phase. */
  seqIndex: number;
  /** Phase misses in this encounter (retry same phase; never ends the duel). */
  misses: number;
  /** True when the latest attempt missed the current phase. */
  justMissed: boolean;
  done: boolean;
  won: boolean;
  /** Lockpick: remaining durability (undefined = unlimited). */
  pickLeft?: number;
};

/** Inclusive green-zone bounds matching the drawn meter (target ± window). */
export type TimingZone = { lo: number; hi: number; target: number; half: number };

export function timingZone(phase: SkillPhase): TimingZone {
  const half = phase.window ?? 0.12;
  const target = phase.target;
  return {
    target,
    half,
    lo: Math.max(0, target - half),
    hi: Math.min(1, target + half),
  };
}

export function judgeTimingStop(pos: number, zone: TimingZone): boolean {
  return pos >= zone.lo && pos <= zone.hi;
}

/** Build a skill encounter definition for a bet id / kind. */
export function skillForBet(betId: string, kind: SkillKind | undefined): SkillDef | null {
  if (!kind) return null;
  if (kind === 'duel') return duelSkill(betId);
  const phase = singlePhase(betId, kind);
  return {
    kind,
    title: phase.prompt,
    blurb: skillBlurb(kind),
    phases: [phase],
  };
}

export function startSkill(def: SkillDef): SkillProgress {
  const phase0 = def.phases[0];
  return {
    def,
    phaseIndex: 0,
    cleared: 0,
    seqIndex: 0,
    misses: 0,
    justMissed: false,
    done: false,
    won: false,
    pickLeft: phase0?.pickDurability,
  };
}

/** True when the active phase owns arrow/WASD/A-B input (Cancel = Esc only). */
export function isSequencePhase(phase: SkillPhase | undefined): boolean {
  return phase?.kind === 'chase' || phase?.kind === 'hack' || phase?.kind === 'evade';
}

/** Apply one player attempt; phase misses retry the same phase (no full reset). */
export function attemptSkill(
  progress: SkillProgress,
  attempt: SkillAttempt,
): SkillProgress {
  if (progress.done) return progress;
  const phase = progress.def.phases[progress.phaseIndex];
  if (!phase) return { ...progress, done: true, won: false, justMissed: false };
  if (isSequencePhase(phase)) {
    return attemptSequence(progress, phase, attempt.value);
  }
  const ok = judgePhase(phase, attempt.value);
  if (!ok) {
    const missed = phaseMiss(progress);
    if (phase.kind === 'lockpick' && missed.pickLeft !== undefined) {
      const left = Math.max(0, (missed.pickLeft ?? 1) - 1);
      if (left <= 0) {
        return { ...missed, pickLeft: 0, done: true, won: false, justMissed: true };
      }
      return { ...missed, pickLeft: left };
    }
    return missed;
  }
  return advancePhase(progress);
}

function phaseMiss(progress: SkillProgress): SkillProgress {
  return {
    ...progress,
    seqIndex: 0,
    misses: progress.misses + 1,
    justMissed: true,
    done: false,
    won: false,
  };
}

/**
 * After a miss, optionally widen/slow the current timing phase.
 * Playtest #25: late-game stays tight — widen only after 2+ misses on the phase.
 */
export function assistAfterMiss(progress: SkillProgress): SkillProgress {
  const phases = progress.def.phases.map((p, i) => {
    if (i !== progress.phaseIndex || p.kind !== 'timing') return p;
    if (progress.misses < 2) return p;
    return {
      ...p,
      window: Math.min(0.22, (p.window ?? 0.12) + 0.03),
      needleSpeed: Math.max(0.5, (p.needleSpeed ?? 0.8) * 0.88),
    };
  });
  return {
    ...progress,
    justMissed: false,
    def: { ...progress.def, phases },
  };
}

function attemptSequence(
  progress: SkillProgress,
  phase: SkillPhase,
  value: number,
): SkillProgress {
  const seq = phaseSequence(phase);
  const expected = SEQ_KEYS.indexOf(seq[progress.seqIndex]!);
  if (Math.round(value) !== expected) {
    const missed = phaseMiss(progress);
    const cap = phase.maxMisses;
    if (cap !== undefined && missed.misses >= cap) {
      return { ...missed, done: true, won: false };
    }
    return missed;
  }
  const nextSeq = progress.seqIndex + 1;
  if (nextSeq < seq.length) {
    return { ...progress, seqIndex: nextSeq, justMissed: false };
  }
  return advancePhase({ ...progress, seqIndex: 0, justMissed: false });
}

function advancePhase(progress: SkillProgress): SkillProgress {
  const cleared = progress.cleared + 1;
  const next = progress.phaseIndex + 1;
  const nextPhase = progress.def.phases[next];
  if (next >= progress.def.phases.length) {
    return {
      ...progress,
      phaseIndex: next,
      cleared,
      seqIndex: 0,
      justMissed: false,
      done: true,
      won: true,
    };
  }
  return {
    ...progress,
    phaseIndex: next,
    cleared,
    seqIndex: 0,
    justMissed: false,
    done: false,
    won: false,
    pickLeft: nextPhase?.pickDurability ?? progress.pickLeft,
  };
}

/** Harness / e2e: produce a winning attempt for the current phase step. */
export function perfectAttempt(progress: SkillProgress): SkillAttempt {
  const phase = progress.def.phases[progress.phaseIndex];
  if (!phase) return { phaseIndex: progress.phaseIndex, value: 0 };
  if (isSequencePhase(phase)) {
    const seq = phaseSequence(phase);
    const key = seq[progress.seqIndex] ?? seq[0]!;
    return { phaseIndex: progress.phaseIndex, value: SEQ_KEYS.indexOf(key) };
  }
  if (phase.kind === 'lockpick') {
    return { phaseIndex: progress.phaseIndex, value: encodePins(phasePins(phase)) };
  }
  return { phaseIndex: progress.phaseIndex, value: phase.target };
}

export function phaseSequence(phase: SkillPhase): SeqKey[] {
  if (phase.sequence?.length) return phase.sequence;
  const n = phase.steps ?? 3;
  const pool: SeqKey[] = ['↑', '→', '↓', '←'];
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]!);
}

export function judgePhase(phase: SkillPhase, value: number): boolean {
  if (phase.kind === 'timing') {
    return judgeTimingStop(value, timingZone(phase));
  }
  if (isSequencePhase(phase)) {
    // Full-sequence match is handled in attemptSkill; this is for single-shot tests.
    const seq = phaseSequence(phase);
    return Math.round(value) === SEQ_KEYS.indexOf(seq[0]!);
  }
  if (phase.kind === 'lockpick') {
    const pins = phasePins(phase);
    return Math.round(value) === encodePins(pins);
  }
  // Negotiate: any listed offer seals the deal (dialogue already framed the choice).
  if (phase.kind === 'negotiate') {
    const n = phase.options?.length ?? 0;
    const i = Math.round(value);
    return i >= 0 && i < n;
  }
  return Math.round(value) === phase.target;
}

/** All story timing gates (incl. duel phases) for audit/tests. */
export function allTimingPhases(): { betId: string; phase: SkillPhase }[] {
  const ids = [
    'agua-gelada',
    'samba-odds',
    'forro-crowd',
    'pixo-challenge',
    'morro-return-nair',
    'torre-elevator',
    'torre-vip',
    'dancer-tip',
    'duelo-casa',
  ];
  const out: { betId: string; phase: SkillPhase }[] = [];
  for (const id of ids) {
    const kind = id === 'duelo-casa' ? 'duel' : 'timing';
    const def = skillForBet(id, kind as SkillKind);
    if (!def) continue;
    for (const phase of def.phases) {
      if (phase.kind === 'timing') out.push({ betId: id, phase });
    }
  }
  return out;
}

/** Near-synonyms that must not appear when the answer uses the paired word. */
const CLUE_SYNONYMS: Record<string, string[]> = {
  hum: ['hum', 'humming', 'buzz', 'buzzing', 'drone'],
  buzz: ['buzz', 'buzzing', 'hum', 'humming'],
  dog: ['dog', 'dogged', 'ear', 'eared', 'dogear', 'dog-eared'],
  eared: ['ear', 'eared', 'dog', 'dogear'],
  green: ['green', 'verde'],
  glass: ['glass'],
  mole: ['mole', 'rat', 'informant'],
  light: ['light', 'lite', 'feather'],
  quiet: ['quiet', 'silent', 'still'],
  steam: ['steam', 'steamy'],
};

/**
 * Choice/puzzle clues must be deducible but must NOT name the answer directly
 * (unique answer tokens ≥3 letters, plus near-synonyms, must not appear in the clue).
 */
export function choiceClueIndirect(phase: SkillPhase): boolean {
  if (phase.kind !== 'choice' && phase.kind !== 'puzzle' && phase.kind !== 'negotiate') {
    return true;
  }
  const opts = phase.options ?? [];
  const answer = opts[phase.target];
  if (!answer || !phase.clue || phase.clue.length < 16) return false;
  const stop = new Set(['the', 'and', 'for', 'you', 'with', 'from', 'that', 'this']);
  const tokenize = (s: string): string[] =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !stop.has(t));
  const answerTokens = tokenize(answer);
  // Tokens shared by every option (e.g. "crate") are not answer-identifying.
  const shared = new Set(
    answerTokens.filter((t) =>
      opts.every((o, i) => i === phase.target || tokenize(o).includes(t)),
    ),
  );
  const unique = answerTokens.filter((t) => !shared.has(t));
  if (!unique.length && !answerTokens.length) return phase.clue.length >= 16;
  const clue = phase.clue.toLowerCase();
  const banned = new Set<string>();
  for (const t of unique.length ? unique : answerTokens) {
    banned.add(t);
    for (const syn of CLUE_SYNONYMS[t] ?? []) banned.add(syn);
  }
  return [...banned].every(
    (t) => !new RegExp(`\\b${t.replace(/-/g, '[-]?')}\\b`, 'i').test(clue),
  );
}

/**
 * Lockpick clue must hint tumblers via reasoning without listing height labels
 * in order or naming the encoded digit run.
 */
export function lockpickClueDeducible(phase: SkillPhase): boolean {
  if (phase.kind !== 'lockpick') return true;
  if (!phase.clue || phase.clue.length < 24) return false;
  if (!lockpickClueIsDecoy(phase)) return false;
  const clue = phase.clue.toLowerCase();
  const hooks =
    clue.match(
      /\b(left|right|outer|center|middle|shoulder|riser|seat|soft|pair|third|sticker|grease|oil|stage|worn|cage|hinge|floor|post|click|far)\b/g,
    ) ?? [];
  return hooks.length >= 3;
}

/** @deprecated Prefer choiceClueIndirect — kept as alias for older imports. */
export function choiceClueCoversAnswer(phase: SkillPhase): boolean {
  return choiceClueIndirect(phase);
}

/** Lockpick clues must not list every pin height digit in order. */
export function lockpickClueIsDecoy(phase: SkillPhase): boolean {
  if (phase.kind !== 'lockpick') return true;
  if (!phase.clue) return false;
  const pins = phasePins(phase);
  const digitRun = pins.join('');
  const spaced = pins.join(' ');
  const clue = phase.clue.toLowerCase();
  if (clue.includes(digitRun) || clue.includes(spaced)) return false;
  // Ban spelling every pin via mid/high/sunk vocabulary in order.
  const words = pins.map((p) => (p === 0 ? 'sink|flush|sunk' : p === 1 ? 'mid' : 'high'));
  const ordered = words.every((w, i) => {
    const re = new RegExp(w, 'i');
    const slice = clue.slice(0, Math.floor(((i + 1) * clue.length) / pins.length) + 12);
    return re.test(slice);
  });
  return !ordered;
}

function skillBlurb(kind: SkillKind): string {
  switch (kind) {
    case 'timing':
      return 'Stop the needle in the green zone.';
    case 'choice':
      return 'Read the odds — pick the honest line.';
    case 'puzzle':
      return 'Find the rigged machine before Casa does.';
    case 'chase':
      return 'Reproduce the path before the mark slips away.';
    case 'hack':
      return 'Match the terminal sequence.';
    case 'lockpick':
      return 'Set tumblers under a timer — pick can snap.';
    case 'evade':
      return 'Slip past drone sight cones on Odds Avenue.';
    case 'negotiate':
      return 'Pick an offer before the timer — consequences stick.';
    case 'duel':
      return 'Multi-phase showdown — timing, read, and hack.';
    default:
      return 'Skill check.';
  }
}

function arrows(n: number, seed: SeqKey[]): SeqKey[] {
  return Array.from({ length: n }, (_, i) => seed[i % seed.length]!);
}

function singlePhase(betId: string, kind: Exclude<SkillKind, 'duel'>): SkillPhase {
  const hit = SKILL_PHASE_TABLE[betId];
  if (hit) return hit;
  return fallbackPhase(kind);
}

function fallbackPhase(kind: Exclude<SkillKind, 'duel'>): SkillPhase {
  const choiceish = kind === 'choice' || kind === 'puzzle' || kind === 'negotiate';
  const seqish = kind === 'chase' || kind === 'hack' || kind === 'evade';
  return {
    kind,
    prompt: skillBlurb(kind),
    target: kind === 'timing' ? 0.5 : 0,
    window: 0.14,
    needleSpeed: 0.8,
    steps: 3,
    sequence: seqish ? arrows(3, ['↑', '→', '↓']) : undefined,
    options: choiceish ? ['Option A', 'Option B', 'Option C'] : undefined,
    clue: choiceish
      ? 'Default clue never names the safe pick — read the street instead.'
      : kind === 'lockpick'
        ? 'Default lock feels sticky; ignore the stamped digits on the side.'
        : undefined,
    pins: kind === 'lockpick' ? [1, 0, 2] : undefined,
    hiddenPin: kind === 'lockpick' ? 0 : undefined,
    timerMs: kind === 'lockpick' ? 25_000 : kind === 'negotiate' ? 10_000 : undefined,
    pickDurability: kind === 'lockpick' ? 3 : undefined,
  };
}

function duelSkill(betId: string): SkillDef {
  void betId;
  return {
    kind: 'duel',
    title: 'Duel vs Augusto Casa',
    blurb: skillBlurb('duel'),
    phases: [
      {
        kind: 'timing',
        // Late-game: tight zone, fast needle — widen only after 2+ misses.
        prompt: 'Phase 1 — stop the house needle.',
        target: 0.5,
        window: 0.07,
        needleSpeed: 1.35,
      },
      {
        kind: 'choice',
        prompt: 'Phase 2 — call Augusto’s bluff.',
        target: 1,
        options: ['All-in smile', 'Ledger shake', 'Crowd roar'],
        clue: 'Watch the cuff — theater fills the room, but the tremor tells.',
      },
      {
        kind: 'hack',
        prompt: 'Phase 3 — crack the tower feed.',
        target: 0,
        steps: 4,
        sequence: ['R', '↑', 'B', '↓'],
      },
    ],
  };
}
