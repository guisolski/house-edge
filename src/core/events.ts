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
  'skill:started': { betId: string; kind: string };
  'skill:resolved': { betId: string; won: boolean; phase: number };
  'fx:flash': { kind: 'win' | 'lose' | 'interact' | 'travel' };
  'fx:credits': { delta: number; x?: number; y?: number };
  'world:transition': {
    kind: 'fade' | 'elevator';
    from?: string;
    to?: string;
    /** Elevator floor card copy (direction + destination). */
    label?: string;
  };
  'story:flag-set': { flag: string; value: boolean };
  'story:beat-started': { beatId: string };
  'story:beat-completed': { beatId: string };
  'story:ended': { endingId: string };
  'story:credits': Record<string, never>;
  'district:entered': { districtId: string };
  'district:unlocked': { districtId: string };
  'npc:interacted': { npcId: string };
  'ui:toast': { message: string; kind: 'info' | 'success' | 'danger' };
  'ui:dialogue': { speaker: string; text: string; choices?: string[] };
  'ui:menu': { open: boolean; screen: string };
  'ui:tutorial': { active: boolean };
  'audio:play-sfx': { id: string };
  'audio:volume': { master: number; muted: boolean };
  'input:action': { action: string; pressed: boolean };
};

export type GameEventName = keyof GameEvents;
