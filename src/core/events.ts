/** Typed event map for the central game bus. */

export type GameEvents = {
  'game:started': { newGame: boolean };
  'game:paused': { paused: boolean };
  'game:saved': { slot: number };
  'player:moved': { x: number; y: number; districtId: string };
  'player:credits-changed': { credits: number; delta: number };
  'player:reputation-changed': { reputation: number; delta: number };
  'bet:offered': { betId: string; title: string };
  'bet:resolved': {
    betId: string;
    won: boolean;
    payout: number;
    stake: number;
  };
  'story:flag-set': { flag: string; value: boolean };
  'story:beat-started': { beatId: string };
  'story:beat-completed': { beatId: string };
  'story:ended': { endingId: string };
  'district:entered': { districtId: string };
  'district:unlocked': { districtId: string };
  'npc:interacted': { npcId: string };
  'ui:toast': { message: string; kind: 'info' | 'success' | 'danger' };
  'ui:dialogue': { speaker: string; text: string; choices?: string[] };
  'ui:menu': { open: boolean; screen: string };
  'audio:play-sfx': { id: string };
  'audio:volume': { master: number; muted: boolean };
  'input:action': { action: string; pressed: boolean };
};

export type GameEventName = keyof GameEvents;
