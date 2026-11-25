import { describe, expect, it } from 'vitest';
import {
  WALK_FRAMES,
  createCharAnim,
  dirFromDelta,
  frameCount,
  idleBlinkClosed,
  npcIdleFrame,
  npcIdleKindFor,
  tickCharAnim,
  type CharAnimState,
} from '../../src/systems/char-anim';

function advance(
  state: CharAnimState,
  steps: number,
  input: Omit<Parameters<typeof tickCharAnim>[1], 'dt'> & { dt?: number },
): CharAnimState {
  let s = state;
  for (let i = 0; i < steps; i += 1) {
    s = tickCharAnim(s, { dt: input.dt ?? 1 / 60, ...input });
  }
  return s;
}

describe('char-anim state machine', () => {
  it('starts idle facing down', () => {
    const s = createCharAnim();
    expect(s.mode).toBe('idle');
    expect(s.dir).toBe('down');
    expect(s.frame).toBe(0);
  });

  it('maps deltas to 4 directions (horizontal wins ties)', () => {
    expect(dirFromDelta(1, 0, 'down')).toBe('right');
    expect(dirFromDelta(-1, 0, 'down')).toBe('left');
    expect(dirFromDelta(0, 1, 'down')).toBe('down');
    expect(dirFromDelta(0, -1, 'down')).toBe('up');
    expect(dirFromDelta(1, 1, 'down')).toBe('right');
    expect(dirFromDelta(0, 0, 'left')).toBe('left');
  });

  it('enters walk with 6 frames and keeps facing after stop', () => {
    let s = createCharAnim('down');
    s = advance(s, 8, { dx: 1, dy: 0, running: false });
    expect(s.mode).toBe('walk');
    expect(s.dir).toBe('right');
    expect(frameCount(s.mode)).toBe(WALK_FRAMES);
    expect(s.frame).toBeGreaterThanOrEqual(0);
    expect(s.frame).toBeLessThan(WALK_FRAMES);

    s = advance(s, 4, { dx: 0, dy: 0, running: false });
    expect(s.mode).toBe('idle');
    expect(s.dir).toBe('right');
  });

  it('run cycles faster than walk over the same wall time', () => {
    const dt = 1 / 60;
    const steps = 30; // 0.5s
    const walk = advance(createCharAnim(), steps, {
      dx: 0,
      dy: 1,
      running: false,
      dt,
    });
    const run = advance(createCharAnim(), steps, {
      dx: 0,
      dy: 1,
      running: true,
      dt,
    });
    expect(run.mode).toBe('run');
    expect(walk.mode).toBe('walk');
    const wall = steps * dt;
    // Progress through cycles: run finishes more of a cycle (or wraps further).
    const walkProg = wall / 0.42;
    const runProg = wall / 0.28;
    expect(runProg).toBeGreaterThan(walkProg);
    expect(run.phase).toBeCloseTo(runProg % 1, 1);
    expect(walk.phase).toBeCloseTo(walkProg % 1, 1);
  });

  it('talk gesture plays while standing and yields to walk', () => {
    let s = createCharAnim('down');
    s = tickCharAnim(s, { dx: 0, dy: 0, running: false, talk: true, dt: 0 });
    expect(s.mode).toBe('talk');
    expect(s.talkLeft).toBeGreaterThan(0);
    s = advance(s, 10, { dx: 1, dy: 0, running: false });
    expect(s.mode).toBe('walk');
  });

  it('applies step squash/bob while walking', () => {
    const s = advance(createCharAnim(), 20, { dx: -1, dy: 0, running: false });
    expect(s.mode).toBe('walk');
    // Over a walk cycle bob/squash leave 0 at some phases; sample until non-zero.
    let saw = false;
    let cur = s;
    for (let i = 0; i < 40; i += 1) {
      cur = tickCharAnim(cur, { dx: -1, dy: 0, running: false, dt: 1 / 60 });
      if (cur.bobY !== 0 || cur.squashX !== 0) saw = true;
    }
    expect(saw).toBe(true);
  });

  it('idle blink window opens near end of breath cycle', () => {
    let s = createCharAnim();
    // Drive phase into blink band without moving.
    for (let i = 0; i < 200 && !idleBlinkClosed(s); i += 1) {
      s = tickCharAnim(s, { dx: 0, dy: 0, running: false, dt: 1 / 60 });
    }
    expect(idleBlinkClosed(s)).toBe(true);
  });

  it('assigns NPC idle variety by id', () => {
    expect(npcIdleKindFor('seu-ze')).toBe('vendor');
    expect(npcIdleKindFor('fio')).toBe('dj');
    expect(npcIdleKindFor('luna')).toBe('phone');
    expect(npcIdleKindFor('elevator')).toBe('none');
    expect(npcIdleKindFor('elevator-vip')).toBe('none');
    expect(npcIdleKindFor('dona-nair')).toBe('breathe');
    expect(npcIdleKindFor(undefined)).toBe('breathe');
    expect(npcIdleKindFor('kiko-feira')).toBe('vendor');
    expect(npcIdleKindFor('antena-tech')).toBe('dj');
    expect(npcIdleKindFor('mole-contact')).toBe('phone');
    expect(npcIdleFrame('dj', 1)).toBeGreaterThanOrEqual(0);
    expect(npcIdleFrame('vendor', 2)).toBeLessThan(4);
    expect(npcIdleFrame('phone', 3)).toBeLessThan(4);
    expect(npcIdleFrame('none', 9)).toBe(0);
    expect(npcIdleFrame('breathe', 1.6)).toBeGreaterThanOrEqual(0);
  });
});
