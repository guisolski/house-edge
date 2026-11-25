/** Objective arrow must not also print the NPC nameplate (playtest #26). */
import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/systems/session';
import { countNpcLabels, npcLabelsUnique } from '../../src/systems/label-policy';

describe('label dedupe policy', () => {
  it('spawn plaza shows exactly one Dona Nair label', () => {
    const s = new GameSession(26);
    s.startNew();
    s.player.setPosition(13, 16);
    const rows = countNpcLabels(s);
    const nair = rows.find((r) => r.name === 'Dona Nair');
    expect(nair?.count).toBe(1);
    expect(npcLabelsUnique(s)).toBe(true);
  });

  it('does not double-count objective NPC names across districts', () => {
    const s = new GameSession(27);
    s.startNew();
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.player.setDistrict('avenida-odds');
    s.player.setPosition(9, 10);
    const mole = countNpcLabels(s).find((r) => r.name === 'Mole Contact');
    expect(mole?.count ?? 0).toBeLessThanOrEqual(1);
  });
});
