import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/event-bus';
import { PlayerSystem } from '../../src/systems/player';

describe('PlayerSystem credits', () => {
  it('tracks credits and reputation with events', () => {
    const bus = new EventBus();
    const credits = vi.fn();
    const rep = vi.fn();
    bus.on('player:credits-changed', credits);
    bus.on('player:reputation-changed', rep);
    const player = new PlayerSystem(bus);
    player.addCredits(50);
    player.addReputation(3);
    expect(player.getStats().credits).toBe(170);
    expect(player.getStats().reputation).toBe(3);
    expect(credits).toHaveBeenCalled();
    expect(rep).toHaveBeenCalled();
  });
});

describe('PlayerSystem movement', () => {
  it('clamps agua/fichas and moves with district events', () => {
    const bus = new EventBus();
    const moved = vi.fn();
    const entered = vi.fn();
    bus.on('player:moved', moved);
    bus.on('district:entered', entered);
    const player = new PlayerSystem(bus);
    player.addAgua(-10);
    player.addFichas(-10);
    expect(player.getStats().agua).toBe(0);
    player.setDistrict('feira-central');
    player.setPosition(3, 4);
    expect(entered).toHaveBeenCalledWith({ districtId: 'feira-central' });
    expect(moved).toHaveBeenCalled();
  });

  it('hydrate replaces stats', () => {
    const player = new PlayerSystem(new EventBus());
    player.hydrate({
      credits: 1,
      reputation: 2,
      agua: 3,
      fichas: 4,
      x: 5,
      y: 6,
      districtId: 'torre-casa',
    });
    expect(player.getStats().districtId).toBe('torre-casa');
  });
});
