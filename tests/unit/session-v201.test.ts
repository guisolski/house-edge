import { beforeEach, describe, expect, it, vi } from 'vitest';
import { districtNpcs, INTERACT_RANGE } from '../../src/systems/interaction';
import { AVENIDA_DRONE_STEALTH, coneCoverageOverCycle } from '../../src/systems/stealth';
import { buildDistrictMap, isWalkable, tileAt } from '../../src/world/maps';
import { SKILL_PHASE_TABLE } from '../../src/content/skill-phases';
import { GameSession } from '../../src/systems/session';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, String(v));
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

function stubStorage(): void {
  vi.stubGlobal('localStorage', new MemoryStorage());
}

describe('v1.20.1 objective E-prompt preference', () => {
  beforeEach(stubStorage);

  it('objective NPC wins when clustered with a neighbour in range', () => {
    const session = new GameSession(21);
    session.startNew();
    // Intro done → boteco-nair is the objective (Dona Nair).
    expect(session.objective().targetName).toBe('Dona Nair');
    const nair = session.npcs.find((n) => n.id === 'dona-nair')!;
    const antena = session.npcs.find((n) => n.id === 'antena-tech')!;
    // Force a tight cluster: Antena nearer, both inside INTERACT_RANGE.
    nair.x = 14;
    nair.y = 16;
    antena.x = 12;
    antena.y = 16;
    session.player.setPosition(12.4, 16);
    const pos = session.player.getStats();
    expect(Math.hypot(nair.x - pos.x, nair.y - pos.y)).toBeLessThanOrEqual(
      INTERACT_RANGE,
    );
    expect(Math.hypot(antena.x - pos.x, antena.y - pos.y)).toBeLessThan(
      Math.hypot(nair.x - pos.x, nair.y - pos.y),
    );
    expect(session.nearbyNpc()?.id).toBe('dona-nair');
    expect(session.objectiveNpcInRange()?.id).toBe('dona-nair');
  });

  it('interact lock needs release after dialog close', () => {
    const session = new GameSession(22);
    session.startNew();
    session.runStoryBeat('boteco-nair');
    session.noteInteractPressed();
    session.closeModal();
    // Still time-locked briefly.
    expect(session.interact()).toBe(false);
    expect(session.interact(true)).toBe(false);
    // Expire the time lock — held Interact still blocked until release.
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 1000);
    expect(session.interact(true)).toBe(false);
    session.noteInteractRelease();
    // Release clears the gate; programmatic path never required it.
    session.interact(true);
    session.interact();
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('epilogue choice replaces transcript with Saúde-only closing line', () => {
    const session = new GameSession(23);
    session.startNew();
    session.story.setFlag('casa_quebrada', true);
    expect(session.runStoryBeat('epilogue-laje')).toBe(true);
    session.pickDialogueChoice('epi_feed', 'Feed stays warm.');
    const lines = session.getDialogue();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toMatch(/Saúde/);
    expect(session.hasOpenDialogueChoices()).toBe(false);
  });
});

describe('v1.20.1 Neon Snap checkpoint + corridor', () => {
  it('checkpoint tile is never covered by any cone over a patrol cycle', () => {
    const covered = coneCoverageOverCycle(AVENIDA_DRONE_STEALTH);
    const cp = AVENIDA_DRONE_STEALTH.checkpoint;
    expect(covered.has(`${Math.round(cp.x)},${Math.round(cp.y)}`)).toBe(false);
  });

  it('Odds Avenue center lane stays walkable through mid-boulevard', () => {
    const map = buildDistrictMap('avenida-odds');
    for (const x of [8, 9, 10, 11, 20, 30]) {
      expect(isWalkable(map, x, 11), `${x},11`).toBe(true);
      expect(isWalkable(map, x, 12), `${x},12`).toBe(true);
    }
  });

  it('tile lookups floor fractional coords (smooth collision)', () => {
    const map = buildDistrictMap('avenida-odds');
    expect(tileAt(map, 9.7, 11.2)).toBe(tileAt(map, 9, 11));
    expect(isWalkable(map, 9.9, 11.1)).toBe(true);
  });
});

describe('v1.20.1 Fio sequence + torre exit', () => {
  it('Fio chase sequence matches the four-arrow pad', () => {
    const seq = SKILL_PHASE_TABLE['fio-corrida']!.sequence!;
    expect(seq).toEqual(['↑', '→', '↓', '←']);
  });

  it('Casa Tower exit sits south of the elevator path', () => {
    const map = buildDistrictMap('torre-casa');
    expect(tileAt(map, 5, 18)).toBe('exit');
    expect(tileAt(map, 5, 12)).not.toBe('exit');
    const elev = districtNpcs().find((n) => n.id === 'elevator')!;
    expect(Math.hypot(elev.x - 5, elev.y - 18)).toBeGreaterThan(6);
  });

  it('Nair sits forward of the Boteco sign', () => {
    const nair = districtNpcs().find((n) => n.id === 'dona-nair')!;
    expect(nair.y).toBeGreaterThanOrEqual(15);
    expect(nair.x).toBeGreaterThan(10);
  });
});
