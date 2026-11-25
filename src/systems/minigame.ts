/** Skill encounters that replace pure RNG for story gates. */

export type SkillKind = 'timing' | 'choice' | 'puzzle' | 'chase' | 'hack' | 'duel';

/** Simon-style keys — arrows (movement) + colors (terminals). */
export const SEQ_KEYS = ['↑', '→', '↓', '←', 'R', 'G', 'B', 'Y'] as const;
export type SeqKey = (typeof SEQ_KEYS)[number];

export type SkillPhase = {
  kind: Exclude<SkillKind, 'duel'>;
  prompt: string;
  /** Correct option index / stop window center (0–1) / unused for sequence. */
  target: number;
  /** Timing green-zone half-width (0–0.5). Wider = easier. */
  window?: number;
  /** Timing needle revolutions per second (higher = harder). */
  needleSpeed?: number;
  options?: string[];
  /** Readable in-world clue that points at the correct choice. */
  clue?: string;
  /** Chase/hack length fallback when sequence omitted. */
  steps?: number;
  /** Simon sequence the player must reproduce (one key at a time). */
  sequence?: SeqKey[];
};

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
  /** Correct sequence taps within the current chase/hack phase. */
  seqIndex: number;
  /** Phase misses in this encounter (retry same phase; never ends the duel). */
  misses: number;
  /** True when the latest attempt missed the current phase. */
  justMissed: boolean;
  done: boolean;
  won: boolean;
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
  return {
    def,
    phaseIndex: 0,
    cleared: 0,
    seqIndex: 0,
    misses: 0,
    justMissed: false,
    done: false,
    won: false,
  };
}

/** Apply one player attempt; phase misses retry the same phase (no full reset). */
export function attemptSkill(
  progress: SkillProgress,
  attempt: SkillAttempt,
): SkillProgress {
  if (progress.done) return progress;
  const phase = progress.def.phases[progress.phaseIndex];
  if (!phase) return { ...progress, done: true, won: false, justMissed: false };
  if (phase.kind === 'chase' || phase.kind === 'hack') {
    return attemptSequence(progress, phase, attempt.value);
  }
  const ok = judgePhase(phase, attempt.value);
  if (!ok) return phaseMiss(progress);
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

/** After a miss, widen/slow the current timing phase so retries stay fair. */
export function assistAfterMiss(progress: SkillProgress): SkillProgress {
  const phases = progress.def.phases.map((p, i) => {
    if (i !== progress.phaseIndex || p.kind !== 'timing') return p;
    return {
      ...p,
      window: Math.min(0.3, (p.window ?? 0.12) + 0.04),
      needleSpeed: Math.max(0.4, (p.needleSpeed ?? 0.8) * 0.82),
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
  if (Math.round(value) !== expected) return phaseMiss(progress);
  const nextSeq = progress.seqIndex + 1;
  if (nextSeq < seq.length) {
    return { ...progress, seqIndex: nextSeq, justMissed: false };
  }
  return advancePhase({ ...progress, seqIndex: 0, justMissed: false });
}

function advancePhase(progress: SkillProgress): SkillProgress {
  const cleared = progress.cleared + 1;
  const next = progress.phaseIndex + 1;
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
  };
}

/** Harness / e2e: produce a winning attempt for the current phase step. */
export function perfectAttempt(progress: SkillProgress): SkillAttempt {
  const phase = progress.def.phases[progress.phaseIndex];
  if (!phase) return { phaseIndex: progress.phaseIndex, value: 0 };
  if (phase.kind === 'chase' || phase.kind === 'hack') {
    const seq = phaseSequence(phase);
    const key = seq[progress.seqIndex] ?? seq[0]!;
    return { phaseIndex: progress.phaseIndex, value: SEQ_KEYS.indexOf(key) };
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
  if (phase.kind === 'chase' || phase.kind === 'hack') {
    // Full-sequence match is handled in attemptSkill; this is for single-shot tests.
    const seq = phaseSequence(phase);
    return Math.round(value) === SEQ_KEYS.indexOf(seq[0]!);
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

/** Every choice/puzzle phase must expose a clue that names the correct option. */
export function choiceClueCoversAnswer(phase: SkillPhase): boolean {
  if (phase.kind !== 'choice' && phase.kind !== 'puzzle') return true;
  const opts = phase.options ?? [];
  const answer = opts[phase.target];
  if (!answer || !phase.clue) return false;
  const tokens = answer
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  const clue = phase.clue.toLowerCase();
  return tokens.some((t) => clue.includes(t));
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
  const table: Record<string, SkillPhase> = {
    'agua-gelada': {
      kind: 'timing',
      prompt: 'Catch the ice pour — stop on cold.',
      target: 0.55,
      window: 0.22,
      needleSpeed: 0.55,
    },
    'antena-sinal': {
      kind: 'hack',
      prompt: 'Splice the pirate jack — match the beep sequence.',
      target: 0,
      steps: 3,
      sequence: ['R', 'G', 'B'],
    },
    'laje-lottery': {
      kind: 'choice',
      prompt: 'Which draw ball is unmarked?',
      target: 1,
      options: ['Corp red 7', 'Hill chalk 3', 'Gold VIP 0'],
      clue: 'Seu Zé chalked a 3 on the hill ball — corp red and gold VIP are stamped.',
    },
    'fio-corrida': {
      kind: 'chase',
      prompt: 'Chase Fio across the lajes — match his tile path.',
      target: 0,
      steps: 4,
      sequence: ['↑', '→', '↑', '←'],
    },
    'corrida-moto': {
      kind: 'chase',
      prompt: 'Wire the moto lane — clear the gate sequence.',
      target: 0,
      steps: 4,
      sequence: ['→', '→', '↓', '→'],
    },
    'pastel-surpresa': {
      kind: 'puzzle',
      prompt: 'Which pastel crate is wired?',
      target: 2,
      options: ['Left steam', 'Middle quiet', 'Right buzz'],
      clue: 'Kiko whispered the right crate buzzes — left steams, middle stays quiet.',
    },
    'feira-garrafa': {
      kind: 'choice',
      prompt: 'Which bottle still has street proof?',
      target: 0,
      options: ['Green glass', 'Corp clear', 'Neon pink'],
      clue: 'Catador only keeps green glass with the street stamp; clear and pink are Casa blanks.',
    },
    'samba-odds': {
      kind: 'timing',
      prompt: 'Hit the samba downbeat.',
      target: 0.48,
      window: 0.14,
      needleSpeed: 0.85,
    },
    'forro-crowd': {
      kind: 'timing',
      prompt: 'Step on the forró accent.',
      target: 0.62,
      window: 0.14,
      needleSpeed: 0.9,
    },
    'feira-radio': {
      kind: 'hack',
      prompt: 'Tune the pirate dial — match 3 clicks.',
      target: 0,
      steps: 3,
      sequence: ['←', '→', '↑'],
    },
    'feira-tipster': {
      kind: 'puzzle',
      prompt: 'Which mango crate hums?',
      target: 1,
      options: ['Sun crate', 'Hum crate', 'Empty crate'],
      clue: 'Barraca Tia says the middle hum crate is the one that sings — sun and empty are decoys.',
    },
    'prova-vazamento': {
      kind: 'choice',
      prompt: 'Which leak drops the house first?',
      target: 2,
      options: ['Influencer clip', 'ATM glitch', 'Pit ledger'],
      clue: 'Luna’s pendrive labels the pit ledger as the kill shot — clips and ATM noise are smokescreens.',
    },
    'twist-vazamento': {
      kind: 'hack',
      prompt: 'Twist the feed — match the packet sequence.',
      target: 0,
      steps: 3,
      sequence: ['B', 'Y', 'R'],
    },
    'pixo-challenge': {
      kind: 'timing',
      prompt: 'Spray on the beat.',
      target: 0.5,
      window: 0.15,
      needleSpeed: 0.8,
    },
    'influencer-duelo': {
      kind: 'choice',
      prompt: 'Call the fake engagement.',
      target: 0,
      options: ['Bought likes', 'Real hill tags', 'Casa promo'],
      clue: 'The influencer’s feed spikes overnight — bought likes, not real hill tags or a Casa promo.',
    },
    'avenida-atm': {
      kind: 'hack',
      prompt: 'Glitch the ATM rounding — match 4 digits.',
      target: 0,
      steps: 4,
      sequence: ['↑', '↓', '←', '→'],
    },
    'avenida-stealth': {
      kind: 'chase',
      prompt: 'Slip past lobby cams — match the blind spots.',
      target: 0,
      steps: 5,
      sequence: ['←', '↑', '→', '↑', '→'],
    },
    'audiencia-publica': {
      kind: 'choice',
      prompt: 'Which testimony sticks?',
      target: 1,
      options: ['Corp PR', 'Hill ledger', 'Empty threat'],
      clue: 'Dr. Margin says only the hill ledger survives cross-exam — corp PR and empty threats fold.',
    },
    'morro-return-nair': {
      kind: 'timing',
      prompt: 'Toast with the hill — stop on warm.',
      target: 0.5,
      window: 0.16,
      needleSpeed: 0.7,
    },
    'morro-return-fio': {
      kind: 'hack',
      prompt: 'Ghost the private splice — match 3 tones.',
      target: 0,
      steps: 3,
      sequence: ['G', 'B', 'G'],
    },
    'torre-foyer': {
      kind: 'choice',
      prompt: 'Bluff the badge reader.',
      target: 2,
      options: ['Tourist pass', 'Staff QR', 'Scandal leak'],
      clue: 'Foyer Guard flinches at a scandal leak — tourist passes and staff QR ping the alarm.',
    },
    'torre-pit': {
      kind: 'puzzle',
      prompt: 'Spot the real deck.',
      target: 0,
      options: ['Dog-eared', 'Gold foil', 'Shrink-wrap'],
      clue: 'Pit Dealer’s thumb worries the dog-eared deck; gold foil and shrink-wrap are show props.',
    },
    'torre-elevator': {
      kind: 'timing',
      prompt: 'Call the express car — stop on green.',
      target: 0.52,
      window: 0.16,
      needleSpeed: 0.75,
    },
    'torre-vip': {
      kind: 'timing',
      prompt: 'Skim the rake on the sweep.',
      target: 0.45,
      window: 0.11,
      needleSpeed: 1.05,
    },
    'side-morro-copper': {
      kind: 'puzzle',
      prompt: 'Weigh the spare copper — which bag is light?',
      target: 1,
      options: ['Heavy rust', 'Light bright', 'Wet coil'],
      clue: 'Catador points at the light bright bag — heavy rust and wet coil tip the scale.',
    },
    'courier-tip': {
      kind: 'chase',
      prompt: 'Shadow the courier — match 4 alleys.',
      target: 0,
      steps: 4,
      sequence: ['→', '↓', '→', '↑'],
    },
    'dancer-tip': {
      kind: 'timing',
      prompt: 'Catch the dancer’s cue.',
      target: 0.58,
      window: 0.15,
      needleSpeed: 0.95,
    },
  };
  return (
    table[betId] ?? {
      kind,
      prompt: skillBlurb(kind),
      target: kind === 'timing' ? 0.5 : kind === 'choice' || kind === 'puzzle' ? 0 : 0,
      window: 0.14,
      needleSpeed: 0.8,
      steps: 3,
      sequence:
        kind === 'chase' || kind === 'hack' ? arrows(3, ['↑', '→', '↓']) : undefined,
      options:
        kind === 'choice' || kind === 'puzzle'
          ? ['Option A', 'Option B', 'Option C']
          : undefined,
      clue:
        kind === 'choice' || kind === 'puzzle'
          ? 'Default clue names Option A as the safe pick.'
          : undefined,
    }
  );
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
        prompt: 'Phase 1 — stop the house needle.',
        target: 0.5,
        window: 0.1,
        needleSpeed: 1.15,
      },
      {
        kind: 'choice',
        prompt: 'Phase 2 — call Augusto’s bluff.',
        target: 1,
        options: ['All-in smile', 'Ledger shake', 'Crowd roar'],
        clue: 'Augusto’s cuff trembles — the ledger shake tells; the smile and roar are theater.',
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
