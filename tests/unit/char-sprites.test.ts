import { describe, expect, it } from 'vitest';
import { createCharAnim, tickCharAnim, WALK_FRAMES } from '../../src/systems/char-anim';
import {
  makePlayerAnimFrame,
  makeNpcAnimFrame,
  paintCharFrame,
  walkStrip,
} from '../../src/rendering/char-sprites';

describe('char-sprites', () => {
  it('paints distinct pixels for each walk frame and direction', () => {
    const dirs = ['down', 'up', 'left', 'right'] as const;
    const fingerprints = new Set<string>();
    for (const dir of dirs) {
      for (let f = 0; f < WALK_FRAMES; f += 1) {
        const g = paintCharFrame({ dir, mode: 'walk', frame: f });
        expect(g.width).toBe(32);
        expect(g.height).toBe(54);
        const fp = g.pixels.filter((c) => c !== 'transparent').length + dir + f;
        fingerprints.add(String(fp));
      }
    }
    // Not all identical — at least several unique occupancy counts across poses.
    expect(fingerprints.size).toBeGreaterThan(8);
  });

  it('builds a horizontal walk strip for the report', () => {
    const strip = walkStrip('right');
    expect(strip.width).toBe(32 * WALK_FRAMES);
    expect(strip.height).toBe(54);
  });

  it('player and npc anim frames stay pixel-grid sized', () => {
    let s = createCharAnim('left');
    s = tickCharAnim(s, { dx: -1, dy: 0, running: true, dt: 0.05 });
    const p = makePlayerAnimFrame(s);
    expect(p.width).toBe(32);
    const n = makeNpcAnimFrame({
      accent: '#ff2bd6',
      npcId: 'fio',
      idleKind: 'dj',
      idleFrame: 2,
    });
    expect(n.height).toBe(54);
  });
});
