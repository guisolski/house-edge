import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GameSession } from '../../src/systems/session';
import { dialogueVisibleLines } from '../../src/ui/panels';
import { labelOffsetForSigns } from '../../src/rendering/label-layout';
import {
  attemptSkill,
  choiceClueIndirect,
  encodePins,
  lockpickClueIsDecoy,
  perfectAttempt,
  phasePins,
  skillForBet,
  startSkill,
} from '../../src/systems/minigame';
import { BETS } from '../../src/content/bets';
import {
  districtExits,
  EXIT_COOLDOWN_MS,
  EXIT_DWELL_MS,
} from '../../src/systems/interaction';

describe('v1.16.0 title / dialogue / pads', () => {
  it('package version is semver 1.x', () => {
    const pkg = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as {
      version: string;
    };
    expect(pkg.version).toMatch(/^1\.\d+\.\d+/);
  });

  it('hides epilogue closing line until after the choice', () => {
    const lines = [
      {
        speaker: 'Dona Nair',
        text: 'One last call',
        choices: [{ label: 'A' }, { label: 'B' }],
      },
      { speaker: 'Dona Nair', text: 'Saúde. The credits roll…' },
    ];
    const vis = dialogueVisibleLines(lines);
    expect(vis).toHaveLength(1);
    expect(vis[0]!.text).toMatch(/One last call/);
    expect(vis.some((l) => /Saúde|credits roll/i.test(l.text))).toBe(false);
  });

  it('walk-in travel fires for every exit pad after dwell + facing', () => {
    vi.useFakeTimers();
    const s = new GameSession(7);
    s.startNew();
    for (const id of ['feira-central', 'avenida-odds', 'torre-casa'] as const) {
      s.world.unlock(id);
    }
    for (const exit of districtExits()) {
      s.travelTo(exit.districtId);
      // Clear latch + expire cooldown, then step onto the pad from one tile away.
      const clearX = exit.x > 20 ? exit.x - 10 : exit.x + 10;
      s.player.setPosition(clearX, exit.y);
      s.move(0, 1);
      s.move(0, -1);
      vi.advanceTimersByTime(EXIT_COOLDOWN_MS + 50);
      const approachX = exit.x > 2 ? exit.x - 1 : exit.x + 1;
      s.player.setPosition(approachX, exit.y);
      const before = s.player.getStats().districtId;
      expect(before).toBe(exit.districtId);
      const dx = exit.x > approachX ? 1 : -1;
      // First step arms dwell — still in the same district.
      expect(s.move(dx, 0), exit.id).toBe(true);
      expect(s.player.getStats().districtId, `${exit.id}-armed`).toBe(exit.districtId);
      vi.advanceTimersByTime(EXIT_DWELL_MS + 20);
      // Stay on the pad; next move finishes the armed dwell without stepping off.
      s.player.setPosition(exit.x, exit.y);
      s.player.setFacing(dx, 0);
      s.move(dx, 0);
      expect(s.player.getStats().districtId, exit.id).toBe(exit.toDistrict);
    }
    vi.useRealTimers();
  });

  it('arrival from Casa Tower spawns off the Odds Avenue pad facing inward', () => {
    const s = new GameSession(11);
    s.startNew();
    s.world.unlock('feira-central');
    s.world.unlock('avenida-odds');
    s.world.unlock('torre-casa');
    s.travelTo('torre-casa');
    s.travelTo('avenida-odds');
    const pos = s.player.getStats();
    expect(pos.districtId).toBe('avenida-odds');
    const pad = districtExits().find(
      (e) => e.districtId === 'avenida-odds' && e.toDistrict === 'torre-casa',
    )!;
    // Off-pad spawn (v1.18) — still near the reciprocal door, not mid-street.
    expect(Math.hypot(pos.x - pad.x, pos.y - pad.y)).toBeGreaterThan(2);
    expect(Math.hypot(pos.x - pad.x, pos.y - pad.y)).toBeLessThan(8);
  });

  it('sequence skill owns arrow input while chase/hack/evade is active', () => {
    const s = new GameSession(3);
    s.startNew();
    const def = skillForBet('avenida-drone', 'evade')!;
    const box = s as unknown as {
      skillProgress: ReturnType<typeof startSkill> | null;
      pendingBetId: string | null;
    };
    box.skillProgress = startSkill(def);
    box.pendingBetId = 'avenida-drone';
    expect(s.ui.go('skill')).toBe(true);
    expect(s.isSequenceSkillActive()).toBe(true);
    // Timing skill does not own arrows.
    box.skillProgress = startSkill(skillForBet('agua-gelada', 'timing')!);
    expect(s.isSequenceSkillActive()).toBe(false);
  });
});

describe('v1.16.0 lockpick tension + indirect clues', () => {
  it('lockpick has timer, hidden pin, durability, and decoy clue', () => {
    const def = skillForBet('feira-lockbox', 'lockpick')!;
    const phase = def.phases[0]!;
    expect(phase.kind).toBe('lockpick');
    expect(phase.timerMs).toBeGreaterThan(10_000);
    expect(phase.hiddenPin).toBeDefined();
    expect(phase.pickDurability).toBeGreaterThanOrEqual(2);
    expect(lockpickClueIsDecoy(phase)).toBe(true);
    let p = startSkill(def);
    expect(p.pickLeft).toBe(phase.pickDurability);
    // Wrong submit burns durability.
    p = attemptSkill(p, { phaseIndex: 0, value: encodePins([0, 0, 0]) });
    expect(p.justMissed).toBe(true);
    expect(p.pickLeft).toBe((phase.pickDurability ?? 3) - 1);
    expect(p.done).toBe(false);
    // Perfect clears.
    p = attemptSkill(p, perfectAttempt(p));
    expect(p.won).toBe(true);
  });

  it('pick snaps when durability hits zero', () => {
    const def = skillForBet('avenida-server', 'lockpick')!;
    let p = startSkill(def);
    const pins = phasePins(def.phases[0]!);
    const wrong = encodePins(pins.map((x) => (x + 1) % 3));
    while (!p.done) {
      p = attemptSkill(p, { phaseIndex: 0, value: wrong });
      if (p.misses > 10) break;
    }
    expect(p.done).toBe(true);
    expect(p.won).toBe(false);
    expect(p.pickLeft).toBe(0);
  });

  it('every choice/puzzle/negotiate clue is indirect (no answer tokens)', () => {
    const skillBets = BETS.filter(
      (b) =>
        b.skill === 'choice' ||
        b.skill === 'puzzle' ||
        b.skill === 'negotiate' ||
        b.skill === 'duel',
    );
    expect(skillBets.length).toBeGreaterThan(5);
    for (const bet of skillBets) {
      const def = skillForBet(bet.id, bet.skill)!;
      for (const phase of def.phases) {
        if (
          phase.kind !== 'choice' &&
          phase.kind !== 'puzzle' &&
          phase.kind !== 'negotiate'
        ) {
          continue;
        }
        expect(
          choiceClueIndirect(phase),
          `${bet.id} clue="${phase.clue}" answer=${phase.options?.[phase.target]}`,
        ).toBe(true);
      }
    }
  });

  it('evade and negotiate skills exist for new beats', () => {
    const evade = skillForBet('avenida-drone', 'evade')!;
    expect(evade.phases[0]!.kind).toBe('evade');
    let p = startSkill(evade);
    while (!p.done) p = attemptSkill(p, perfectAttempt(p));
    expect(p.won).toBe(true);

    const neg = skillForBet('torre-negotiate', 'negotiate')!;
    expect(neg.phases[0]!.kind).toBe('negotiate');
    expect(neg.phases[0]!.timerMs).toBeGreaterThan(5_000);
    p = startSkill(neg);
    p = attemptSkill(p, perfectAttempt(p));
    expect(p.won).toBe(true);
  });
});

describe('v1.16.0 clue validators', () => {
  it('lockpickClueIsDecoy rejects digit runs and ordered vocab', () => {
    expect(lockpickClueIsDecoy({ kind: 'timing', prompt: 'x', target: 0.5 })).toBe(true);
    expect(
      lockpickClueIsDecoy({ kind: 'lockpick', prompt: 'x', target: 0, pins: [1, 2, 0] }),
    ).toBe(false);
    expect(
      lockpickClueIsDecoy({
        kind: 'lockpick',
        prompt: 'x',
        target: 0,
        pins: [1, 2, 0],
        clue: 'pins 120 exactly',
      }),
    ).toBe(false);
    expect(
      lockpickClueIsDecoy({
        kind: 'lockpick',
        prompt: 'x',
        target: 0,
        pins: [1, 2, 0],
        clue: '1 2 0 spelled out',
      }),
    ).toBe(false);
    expect(
      lockpickClueIsDecoy({
        kind: 'lockpick',
        prompt: 'x',
        target: 0,
        pins: [1, 2, 0],
        clue: 'first mid then high then sunk flush at the end of the plate',
      }),
    ).toBe(false);
  });

  it('choiceClueIndirect covers short clues and stopword-only answers', () => {
    expect(
      choiceClueIndirect({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['the and'],
        clue: 'sixteen-plus chars of street whisper',
      }),
    ).toBe(true);
    expect(
      choiceClueIndirect({
        kind: 'choice',
        prompt: 'x',
        target: 0,
        options: ['Alpha'],
        clue: 'short',
      }),
    ).toBe(false);
  });
});

describe('v1.16.0 label offset near signs', () => {
  it('offsets or hides labels when a sign is underfoot', () => {
    const far = labelOffsetForSigns({
      tileX: 10,
      tileY: 10,
      signs: [{ x: 20, y: 20 }],
    });
    expect(far.hideLabel).toBe(false);
    expect(far.dy).toBe(0);

    const near = labelOffsetForSigns({
      tileX: 5,
      tileY: 13,
      signs: [{ x: 5, y: 13 }],
    });
    expect(near.hideLabel).toBe(true);
    expect(near.dy).toBeLessThan(0);

    const soft = labelOffsetForSigns({
      tileX: 10,
      tileY: 10,
      signs: [{ x: 11, y: 11 }],
    });
    // Within 2.6 tiles of a sign — hide to avoid neon overlap.
    expect(soft.hideLabel).toBe(true);
    expect(soft.dy).toBeLessThan(0);
  });
});
