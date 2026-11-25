/** Per-bet skill phase definitions (split out for lint limits). */

import type { SkillPhase } from '../systems/minigame';

export const SKILL_PHASE_TABLE: Record<string, SkillPhase> = {
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
    timerMs: 14_000,
    maxMisses: 2,
  },
  'laje-lottery': {
    kind: 'choice',
    prompt: 'Which draw ball is unmarked?',
    target: 1,
    options: ['Corp red 7', 'Hill chalk 3', 'Gold VIP 0'],
    // Answer is Hill chalk 3 — never name chalk/hill/unmarked/community sack.
    clue: 'Luna trusts the ball that still smells like rooftop rain, not tower polish or VIP lacquer.',
  },
  'fio-corrida': {
    kind: 'chase',
    prompt: 'Chase Fio across the lajes — match his tile path.',
    target: 0,
    steps: 4,
    // Must match the on-screen pad (↑ → ↓ ←).
    sequence: ['↑', '→', '↓', '←'],
    timerMs: 16_000,
    maxMisses: 2,
  },
  'corrida-moto': {
    kind: 'chase',
    prompt: 'Dash the moto lane — clear the gate sequence.',
    target: 0,
    steps: 4,
    sequence: ['→', '→', '↓', '→'],
    timerMs: 15_000,
    maxMisses: 2,
  },
  'pastel-surpresa': {
    kind: 'puzzle',
    prompt: 'Which pastel crate is wired?',
    target: 2,
    options: ['Left steam', 'Middle quiet', 'Right buzz'],
    // Answer is Right buzz — clue via vibration/oil, no "buzz"/"right" synonym dump.
    clue: 'Kiko trusts the tray that oils his fingertips — quiet middle stacks and left steam are tourist bait.',
  },
  'feira-garrafa': {
    kind: 'choice',
    prompt: 'Which bottle still has street proof?',
    target: 0,
    options: ['Green glass', 'Corp clear', 'Neon pink'],
    // Answer Green glass — never name green/glass/corp/pink/alley stamp.
    clue: 'Catador kept one cork before the shelf got a boutique makeover — the honest haul still smells like rain, not perfume.',
  },
  'samba-odds': {
    kind: 'timing',
    prompt: 'Hit the samba downbeat.',
    target: 0.38,
    window: 0.14,
    needleSpeed: 0.82,
  },
  'forro-crowd': {
    kind: 'timing',
    prompt: 'Step on the forró accent.',
    target: 0.68,
    window: 0.13,
    needleSpeed: 0.88,
  },
  'feira-radio': {
    kind: 'hack',
    prompt: 'Tune the pirate dial — match 3 clicks.',
    target: 0,
    steps: 3,
    sequence: ['←', '→', '↑'],
    timerMs: 12_000,
    maxMisses: 2,
  },
  'feira-tipster': {
    kind: 'puzzle',
    prompt: 'Which mango crate hums?',
    target: 1,
    options: ['Sun crate', 'Hum crate', 'Empty crate'],
    // Answer Hum crate — never say hum; buzzes vs hot/hollow lids.
    clue: 'Barraca Tia rests a palm on each lid — only the wired one answers with a shiver; sun-baked and hollow stay mute.',
  },
  'prova-vazamento': {
    kind: 'choice',
    prompt: 'Which leak drops the house first?',
    target: 2,
    options: ['Influencer clip', 'ATM glitch', 'Pit ledger'],
    // Answer Pit ledger — never say pit/ledger/arithmetic/kill shot.
    clue: 'Luna wants paper the cameras never framed — vanity reels and machine noise are smokescreens.',
  },
  'twist-vazamento': {
    kind: 'hack',
    prompt: 'Twist the feed — match the packet sequence.',
    target: 0,
    steps: 3,
    sequence: ['B', 'Y', 'R'],
    timerMs: 12_000,
    maxMisses: 2,
  },
  'pixo-challenge': {
    kind: 'timing',
    prompt: 'Spray on the beat.',
    target: 0.42,
    window: 0.13,
    needleSpeed: 0.88,
  },
  'influencer-duelo': {
    kind: 'choice',
    prompt: 'Call the fake engagement.',
    target: 0,
    // Options avoid spelling the leak; clue never names “bought” / “likes”.
    options: ['Inflated metrics', 'Organic alley tags', 'Sponsored corp drop'],
    clue: 'The follower curve jumped overnight while the alley walls stayed cold — and the neon palette isn’t Casa chrome.',
  },
  'avenida-atm': {
    kind: 'hack',
    prompt: 'Glitch the ATM rounding — match 4 digits.',
    target: 0,
    steps: 4,
    sequence: ['↑', '↓', '←', '→'],
    timerMs: 16_000,
    maxMisses: 2,
  },
  'avenida-stealth': {
    kind: 'chase',
    prompt: 'Slip past lobby cams — match the blind spots.',
    target: 0,
    steps: 5,
    sequence: ['←', '↑', '→', '↑', '→'],
    // Playtest #28: 250ms taps were dropping — longer timer + one extra miss.
    timerMs: 28_000,
    maxMisses: 4,
  },
  // Fallback only — live Neon Snap uses in-world stealth, not this sequence.
  'avenida-drone': {
    kind: 'evade',
    prompt: 'Evade the militia drone cones — slip the blind path.',
    target: 0,
    steps: 6,
    sequence: ['↑', '←', '↑', '→', '↓', '→'],
    clue: 'Cones sweep the asphalt center — hug the glass shadow, then cut when the light blinks.',
    timerMs: 20_000,
    maxMisses: 2,
  },
  'audiencia-publica': {
    kind: 'choice',
    prompt: 'Which testimony sticks?',
    target: 1,
    options: ['Corp PR', 'Hill ledger', 'Empty threat'],
    // Playtest #30: no hill/ledger/community/PR giveaway tokens.
    clue: 'Dr. Margin weighs what the quebrada already signed — glossy spin and empty threats slide off.',
  },
  'morro-return-nair': {
    kind: 'timing',
    prompt: 'Toast with the hill — stop on warm.',
    target: 0.58,
    window: 0.14,
    needleSpeed: 0.72,
  },
  'morro-return-fio': {
    kind: 'hack',
    prompt: 'Ghost the private splice — match 3 tones.',
    target: 0,
    steps: 3,
    sequence: ['G', 'B', 'G'],
    timerMs: 12_000,
    maxMisses: 2,
  },
  'torre-foyer': {
    kind: 'choice',
    prompt: 'Bluff the badge reader.',
    target: 2,
    options: ['Tourist pass', 'Staff QR', 'Scandal leak'],
    // Playtest #30: no “gossip / every screen” giveaway.
    clue: 'Foyer Guard stamps plastic without looking — he only freezes when the rumor already owns the room.',
  },
  'torre-pit': {
    kind: 'puzzle',
    prompt: 'Spot the real deck.',
    target: 0,
    options: ['Dog-eared', 'Gold foil', 'Shrink-wrap'],
    // Playtest #30: softer hint — still 2–3 tries, no cuff/soft-corner giveaway.
    clue: 'Dealer’s house pack looks tired; foil and plastic are for the tourist rail.',
  },
  'torre-elevator': {
    kind: 'timing',
    prompt: 'Call the express car — stop on green.',
    target: 0.52,
    // Playtest #25: late-game tighter — assist only after 2+ misses.
    window: 0.1,
    needleSpeed: 0.95,
  },
  'torre-vip': {
    kind: 'timing',
    prompt: 'Skim the rake on the sweep.',
    target: 0.72,
    window: 0.08,
    needleSpeed: 1.25,
  },
  'torre-negotiate': {
    kind: 'negotiate',
    prompt: 'VIP Host offers three exits — pick before the smile hardens.',
    // Any offer wins — consistent with dialogue “Deal’s sealed” on hush/mirror/smile.
    target: 0,
    options: ['Take the hush chip', 'Demand the pit mirror', 'Walk out smiling'],
    // Any exit wins — avoid naming hush/chip/take (answer tokens).
    clue: 'Name any door before the smile freezes — the house stamps every exit you pick the same way.',
    timerMs: 12_000,
  },
  'side-morro-copper': {
    kind: 'puzzle',
    prompt: 'Weigh the spare copper — which bag is light?',
    target: 1,
    options: ['Heavy rust', 'Light bright', 'Wet coil'],
    // Answer Light bright — never say light/bright/heavy/wet/floats.
    clue: 'Catador trusts the sack that does not drag his wrist — oxide crust and damp wire both pull harder than they look.',
  },
  'courier-tip': {
    kind: 'chase',
    prompt: 'Shadow the courier — match 4 alleys.',
    target: 0,
    steps: 4,
    // Four distinct arrows so the pad shows 4 buttons (not 3 unique).
    sequence: ['→', '↓', '←', '↑'],
    timerMs: 14_000,
    maxMisses: 2,
  },
  'dancer-tip': {
    kind: 'timing',
    // Playtest #26: was ~7 tries — ease toward mid-game, leave boss hardest.
    prompt: 'Catch the dancer’s cue.',
    target: 0.42,
    window: 0.16,
    needleSpeed: 0.78,
  },
  'feira-lockbox': {
    kind: 'lockpick',
    prompt: 'Pick the Casa lockbox under the forró stage.',
    target: 0,
    // Pins: mid / raised / sunk — left=shoulder mid, center=riser high, right=soft sunk.
    pins: [1, 2, 0],
    hiddenPin: 1,
    timerMs: 32_000,
    pickDurability: 4,
    // Playtest #30: clearer without naming heights — ~2–3 tries (≥3 hook words).
    clue:
      'Maquinista leaves grease on the post he leans on and dust on the seat he ignores. ' +
      'A loud sticker always lies — the honest tumbler fights like damp wood under the stage.',
  },
  'avenida-server': {
    kind: 'lockpick',
    prompt: 'Crack the server-cage tumblers before the sweep.',
    target: 0,
    // Pins: high / flush / mid / high — positional grease hooks, no height labels.
    pins: [2, 0, 1, 2],
    hiddenPin: 2,
    timerMs: 34_000,
    pickDurability: 4,
    // Playtest #30: no left/right/third pin map — grease/hinge/seat/sticker hooks.
    clue:
      'Cage Runner says grease remembers the hinge he trusts and dust marks the seat he skips. ' +
      'Matching posts rhyme; a sticker never does. Feel the bite, don’t count the stamps.',
  },
  'avenida-betrayal': {
    kind: 'choice',
    prompt: 'Who sold the hill’s bytes?',
    target: 1,
    options: ['Blame Luna', 'Blame the mole', 'Blame Margin'],
    // Playtest #30: no “burner / mole” giveaway in the clue.
    clue: 'Someone still answers Casa on a cheap line. The archive is clean; the hearing is theater.',
  },
};
