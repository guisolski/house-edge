import { describe, expect, it } from 'vitest';
import {
  AVENIDA_DRONE_STEALTH,
  anyDroneSpots,
  pointInCone,
  reachedGoal,
  spotReset,
  startStealth,
  stealthForBet,
  tickStealth,
  winStealth,
} from '../../src/systems/stealth';

describe('drone sight cone detection', () => {
  it('spots a point inside the forward cone', () => {
    expect(
      pointInCone({
        origin: { x: 0, y: 0 },
        facing: 0,
        halfAngle: Math.PI / 4,
        range: 5,
        point: { x: 3, y: 0 },
      }),
    ).toBe(true);
  });

  it('ignores points behind or outside the wedge', () => {
    expect(
      pointInCone({
        origin: { x: 0, y: 0 },
        facing: 0,
        halfAngle: Math.PI / 6,
        range: 5,
        point: { x: -2, y: 0 },
      }),
    ).toBe(false);
    expect(
      pointInCone({
        origin: { x: 0, y: 0 },
        facing: 0,
        halfAngle: Math.PI / 8,
        range: 5,
        point: { x: 2, y: 2 },
      }),
    ).toBe(false);
  });

  it('ignores points beyond range', () => {
    expect(
      pointInCone({
        origin: { x: 0, y: 0 },
        facing: 0,
        halfAngle: Math.PI / 2,
        range: 2,
        point: { x: 4, y: 0 },
      }),
    ).toBe(false);
  });

  it('anyDroneSpots uses live drone facing', () => {
    const p = startStealth(AVENIDA_DRONE_STEALTH);
    const d0 = p.drones[0]!;
    // Place player dead ahead of first drone within range.
    const ahead = {
      x: d0.x + Math.cos(d0.facing) * 2,
      y: d0.y + Math.sin(d0.facing) * 2,
    };
    expect(anyDroneSpots(p, ahead)).toBe(true);
    expect(anyDroneSpots(p, { x: 12, y: 12 })).toBe(false);
  });
});

describe('stealth progress', () => {
  it('maps avenida-drone bet and ticks drones along the path', () => {
    expect(stealthForBet('avenida-drone')?.id).toBe('avenida-drone');
    expect(stealthForBet('other')).toBeNull();
    let p = startStealth(AVENIDA_DRONE_STEALTH);
    const x0 = p.drones[0]!.x;
    p = tickStealth(p, 0.5);
    expect(
      p.drones[0]!.x !== x0 ||
        p.drones[0]!.y !== AVENIDA_DRONE_STEALTH.drones[0]!.path[0]!.y,
    ).toBe(true);
  });

  it('spotReset bumps counter; goal + win clear the run', () => {
    let p = startStealth(AVENIDA_DRONE_STEALTH);
    p = spotReset(p);
    expect(p.spotted).toBe(1);
    expect(reachedGoal(p, AVENIDA_DRONE_STEALTH.goal)).toBe(true);
    p = winStealth(p);
    expect(p.done && p.won).toBe(true);
  });

  it('corridor has 5 drones and a 45–90s target window', () => {
    expect(AVENIDA_DRONE_STEALTH.drones.length).toBe(5);
    expect(AVENIDA_DRONE_STEALTH.targetMs).toBeGreaterThanOrEqual(45_000);
    expect(AVENIDA_DRONE_STEALTH.targetMs).toBeLessThanOrEqual(90_000);
  });

  it('large ticks snap through waypoints and wrap the patrol loop', () => {
    let p = startStealth(AVENIDA_DRONE_STEALTH);
    for (let i = 0; i < 40; i += 1) p = tickStealth(p, 1.0);
    expect(p.drones[0]!.pathIndex).toBeGreaterThanOrEqual(0);
    // Done progress is a no-op for ticks.
    p = winStealth(p);
    const frozen = p.drones[0]!.x;
    p = tickStealth(p, 5);
    expect(p.drones[0]!.x).toBe(frozen);
  });

  it('handles degenerate single-point drone paths', () => {
    const def = {
      ...AVENIDA_DRONE_STEALTH,
      drones: [
        {
          id: 'solo',
          path: [{ x: 20, y: 12 }],
          speed: 1,
          halfAngle: 0.5,
          range: 3,
        },
      ],
    };
    let p = startStealth(def);
    p = tickStealth(p, 1);
    expect(p.drones[0]!.x).toBe(20);
  });
});
