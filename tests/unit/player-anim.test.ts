import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/event-bus';
import { PlayerSystem } from '../../src/systems/player';

describe('player animation wiring', () => {
  it('walks when setFacing pulses, then returns to idle facing last dir', () => {
    const p = new PlayerSystem(new EventBus());
    p.setRunning(false);
    p.setFacing(1, 0);
    const walked = p.tickAnim(1 / 60);
    expect(walked.mode).toBe('walk');
    expect(walked.dir).toBe('right');
    const idle = p.tickAnim(1 / 60);
    expect(idle.mode).toBe('idle');
    expect(idle.dir).toBe('right');
  });

  it('runs when running flag is set during a step', () => {
    const p = new PlayerSystem(new EventBus());
    p.setRunning(true);
    p.setFacing(0, 1);
    expect(p.tickAnim(1 / 60).mode).toBe('run');
  });

  it('plays talk gesture while standing', () => {
    const p = new PlayerSystem(new EventBus());
    p.triggerTalk();
    expect(p.getAnim().mode).toBe('talk');
    expect(p.getAnim().talkLeft).toBeGreaterThan(0);
  });

  it('ignores zero facing updates', () => {
    const p = new PlayerSystem(new EventBus());
    p.setFacing(0, -1);
    expect(p.getFacing()).toEqual({ dx: 0, dy: -1 });
    p.setFacing(0, 0);
    expect(p.getFacing()).toEqual({ dx: 0, dy: -1 });
  });
});
