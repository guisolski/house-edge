export type DistrictId = 'morro-neon' | 'feira-central' | 'avenida-odds' | 'torre-casa';

export type ResourceId = 'credits' | 'reputation' | 'agua' | 'fichas';

export type BetKind = 'dialogue' | 'purchase' | 'race' | 'draw' | 'job' | 'story';

export type Odds = {
  numerator: number;
  denominator: number;
};

export type BetDefinition = {
  id: string;
  kind: BetKind;
  title: string;
  description: string;
  /** Default stake shown in the UI. */
  stake: number;
  stakeMin?: number;
  stakeMax?: number;
  odds: Odds;
  houseEdge: number;
  /** If omitted, derived from odds + houseEdge at resolve time. */
  winChance?: number;
  requiredFlag?: string;
  unlocksFlag?: string;
  unlocksDistrict?: DistrictId;
  reputationDeltaWin: number;
  reputationDeltaLose: number;
};

export type BetResult = {
  betId: string;
  won: boolean;
  stake: number;
  payout: number;
  net: number;
  roll: number;
};

export type NpcId = string;

export type StoryBeat = {
  id: string;
  title: string;
  districtId: DistrictId;
  requiredFlags: string[];
  setsFlags: string[];
  dialogue: DialogueLine[];
  betId?: string;
  unlocksDistrict?: DistrictId;
  isEnding?: boolean;
  endingId?: string;
};

export type DialogueLine = {
  speaker: string;
  text: string;
};

export type DistrictDef = {
  id: DistrictId;
  name: string;
  blurb: string;
  unlockFlag: string | null;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  color: string;
  accent: string;
};

export type PlayerStats = {
  credits: number;
  reputation: number;
  agua: number;
  fichas: number;
  x: number;
  y: number;
  districtId: DistrictId;
};

export type GameSave = {
  version: 1;
  player: PlayerStats;
  flags: Record<string, boolean>;
  completedBeats: string[];
  unlockedDistricts: DistrictId[];
  muted: boolean;
  masterVolume: number;
};
