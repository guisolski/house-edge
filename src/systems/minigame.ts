/** Skill encounters that replace pure RNG for story gates. */

export type SkillKind = 'timing' | 'choice' | 'puzzle' | 'chase' | 'hack' | 'duel';

export type SkillPhase = {
  kind: Exclude<SkillKind, 'duel'>;
  prompt: string;
  /** Correct option index / stop window center (0–1) / sequence key. */
  target: number;
  /** Timing green-zone half-width (0–0.5). Wider = easier. */
  window?: number;
  options?: string[];
  /** Chase/hack sequence length. */
  steps?: number;
};

export type SkillDef = {
  kind: SkillKind;
  title: string;
  blurb: string;
  phases: SkillPhase[];
};

export type SkillAttempt = {
  phaseIndex: number;
  /** Player stop position 0–1, chosen option index, or matched step count. */
  value: number;
};

export type SkillProgress = {
  def: SkillDef;
  phaseIndex: number;
  /** Successful phases so far. */
  cleared: number;
  done: boolean;
  won: boolean;
};

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
  return { def, phaseIndex: 0, cleared: 0, done: false, won: false };
}

/** Apply one player attempt; advances phases until win/lose. */
export function attemptSkill(
  progress: SkillProgress,
  attempt: SkillAttempt,
): SkillProgress {
  if (progress.done) return progress;
  const phase = progress.def.phases[progress.phaseIndex];
  if (!phase) return { ...progress, done: true, won: false };
  const ok = judgePhase(phase, attempt.value);
  if (!ok) return { ...progress, done: true, won: false };
  const cleared = progress.cleared + 1;
  const next = progress.phaseIndex + 1;
  if (next >= progress.def.phases.length) {
    return { ...progress, phaseIndex: next, cleared, done: true, won: true };
  }
  return { ...progress, phaseIndex: next, cleared, done: false, won: false };
}

/** Harness / e2e: produce a winning attempt for the current phase. */
export function perfectAttempt(progress: SkillProgress): SkillAttempt {
  const phase = progress.def.phases[progress.phaseIndex];
  return { phaseIndex: progress.phaseIndex, value: phase?.target ?? 0 };
}

export function judgePhase(phase: SkillPhase, value: number): boolean {
  if (phase.kind === 'timing') {
    const half = phase.window ?? 0.12;
    return Math.abs(value - phase.target) <= half;
  }
  if (phase.kind === 'chase' || phase.kind === 'hack') {
    return value >= (phase.steps ?? 3);
  }
  // choice / puzzle: exact option index
  return Math.round(value) === phase.target;
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
      return 'Tap the path before the mark slips away.';
    case 'hack':
      return 'Match the terminal sequence.';
    case 'duel':
      return 'Multi-phase showdown — timing, read, and hack.';
    default:
      return 'Skill check.';
  }
}

function singlePhase(betId: string, kind: Exclude<SkillKind, 'duel'>): SkillPhase {
  const table: Record<string, SkillPhase> = {
    'agua-gelada': {
      kind: 'timing',
      prompt: 'Catch the ice pour — stop on cold.',
      target: 0.55,
      window: 0.22,
    },
    'antena-sinal': {
      kind: 'hack',
      prompt: 'Splice the pirate jack — match 3 beeps.',
      target: 3,
      steps: 3,
    },
    'laje-lottery': {
      kind: 'choice',
      prompt: 'Which draw ball is unmarked?',
      target: 1,
      options: ['Corp red 7', 'Hill chalk 3', 'Gold VIP 0'],
    },
    'fio-corrida': {
      kind: 'chase',
      prompt: 'Chase Fio across the lajes — hit 4 tiles.',
      target: 4,
      steps: 4,
    },
    'corrida-moto': {
      kind: 'chase',
      prompt: 'Wire the moto lane — clear 4 gates.',
      target: 4,
      steps: 4,
    },
    'pastel-surpresa': {
      kind: 'puzzle',
      prompt: 'Which pastel crate is wired?',
      target: 2,
      options: ['Left steam', 'Middle quiet', 'Right buzz'],
    },
    'feira-garrafa': {
      kind: 'choice',
      prompt: 'Which bottle still has street proof?',
      target: 0,
      options: ['Green glass', 'Corp clear', 'Neon pink'],
    },
    'samba-odds': {
      kind: 'timing',
      prompt: 'Hit the samba downbeat.',
      target: 0.48,
      window: 0.14,
    },
    'forro-crowd': {
      kind: 'timing',
      prompt: 'Step on the forró accent.',
      target: 0.62,
      window: 0.14,
    },
    'feira-radio': {
      kind: 'hack',
      prompt: 'Tune the pirate dial — 3 clicks.',
      target: 3,
      steps: 3,
    },
    'feira-tipster': {
      kind: 'puzzle',
      prompt: 'Which mango crate hums?',
      target: 1,
      options: ['Sun crate', 'Hum crate', 'Empty crate'],
    },
    'prova-vazamento': {
      kind: 'choice',
      prompt: 'Which leak drops the house first?',
      target: 2,
      options: ['Influencer clip', 'ATM glitch', 'Pit ledger'],
    },
    'twist-vazamento': {
      kind: 'hack',
      prompt: 'Twist the feed — 3 packets.',
      target: 3,
      steps: 3,
    },
    'pixo-challenge': {
      kind: 'timing',
      prompt: 'Spray on the beat.',
      target: 0.5,
      window: 0.15,
    },
    'influencer-duelo': {
      kind: 'choice',
      prompt: 'Call the fake engagement.',
      target: 0,
      options: ['Bought likes', 'Real hill tags', 'Casa promo'],
    },
    'avenida-atm': {
      kind: 'hack',
      prompt: 'Glitch the ATM rounding — 4 digits.',
      target: 4,
      steps: 4,
    },
    'avenida-stealth': {
      kind: 'chase',
      prompt: 'Slip past lobby cams — 5 steps.',
      target: 5,
      steps: 5,
    },
    'audiencia-publica': {
      kind: 'choice',
      prompt: 'Which testimony sticks?',
      target: 1,
      options: ['Corp PR', 'Hill ledger', 'Empty threat'],
    },
    'morro-return-nair': {
      kind: 'timing',
      prompt: 'Toast with the hill — stop on warm.',
      target: 0.5,
      window: 0.16,
    },
    'morro-return-fio': {
      kind: 'hack',
      prompt: 'Ghost the private splice — 3 tones.',
      target: 3,
      steps: 3,
    },
    'torre-foyer': {
      kind: 'choice',
      prompt: 'Bluff the badge reader.',
      target: 2,
      options: ['Tourist pass', 'Staff QR', 'Scandal leak'],
    },
    'torre-pit': {
      kind: 'puzzle',
      prompt: 'Spot the real deck.',
      target: 0,
      options: ['Dog-eared', 'Gold foil', 'Shrink-wrap'],
    },
    'torre-elevator': {
      kind: 'timing',
      prompt: 'Call the express car — stop on green.',
      target: 0.52,
      window: 0.16,
    },
    'torre-vip': {
      kind: 'timing',
      prompt: 'Skim the rake on the sweep.',
      target: 0.45,
      window: 0.13,
    },
    'side-morro-copper': {
      kind: 'puzzle',
      prompt: 'Weigh the spare copper — which bag is light?',
      target: 1,
      options: ['Heavy rust', 'Light bright', 'Wet coil'],
    },
    'courier-tip': {
      kind: 'chase',
      prompt: 'Shadow the courier — 4 alleys.',
      target: 4,
      steps: 4,
    },
    'dancer-tip': {
      kind: 'timing',
      prompt: 'Catch the dancer’s cue.',
      target: 0.58,
      window: 0.15,
    },
  };
  return (
    table[betId] ?? {
      kind,
      prompt: skillBlurb(kind),
      target: kind === 'timing' ? 0.5 : kind === 'choice' || kind === 'puzzle' ? 0 : 3,
      window: 0.14,
      steps: 3,
      options:
        kind === 'choice' || kind === 'puzzle'
          ? ['Option A', 'Option B', 'Option C']
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
        window: 0.12,
      },
      {
        kind: 'choice',
        prompt: 'Phase 2 — call Augusto’s bluff.',
        target: 1,
        options: ['All-in smile', 'Ledger shake', 'Crowd roar'],
      },
      {
        kind: 'hack',
        prompt: 'Phase 3 — crack the tower feed.',
        target: 4,
        steps: 4,
      },
    ],
  };
}
