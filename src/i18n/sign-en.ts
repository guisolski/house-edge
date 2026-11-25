/** World neon sign labels (English). Keys: sign.{slug} */
export const signEn = {
  'sign.vip-salon': 'VIP SALON',
  'sign.high-rollers': 'HIGH ROLLERS',
  'sign.private-table': 'PRIVATE TABLE',
  'sign.elevator-down': 'ELEVATOR ↓',
  'sign.elevator-up': 'ELEVATOR ↑',
  'sign.elevator': 'ELEVATOR',
  'sign.boteco-nair': 'BOTECO NAIR',
  'sign.laje-bet': 'LAJE BET',
  'sign.odds-24h': 'ODDS 24h',
  'sign.stairs': 'STAIRS',
  'sign.ramp': 'RAMP',
  'sign.to-central-fair': '> Central Fair',
  'sign.to-morro-neon': '> Morro Neon',
  'sign.to-odds-avenue': '> Odds Avenue',
  'sign.to-casa-tower': '> Casa Tower',
  'sign.feira': 'FEIRA',
  'sign.casa-suprema': 'CASA SUPREMA',
  'sign.police-line': 'POLICE LINE',
  'sign.no-pass': 'NO PASS',
  'sign.barrier': 'BARRIER',
  'sign.pit-floor': 'PIT FLOOR',
  'sign.exit': 'EXIT',
} satisfies Record<string, string>;

/** Reverse map: English label → catalog key (for draw-time localization). */
export const signLabelToKey: Record<string, string> = Object.fromEntries(
  Object.entries(signEn).map(([k, v]) => [v, k]),
);
