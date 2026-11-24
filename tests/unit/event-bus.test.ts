import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/event-bus';

describe('EventBus', () => {
  it('delivers typed payloads to subscribers', () => {
    const bus = new EventBus();
    const spy = vi.fn();
    bus.on('ui:toast', spy);
    bus.emit('ui:toast', { message: 'oi', kind: 'info' });
    expect(spy).toHaveBeenCalledWith({ message: 'oi', kind: 'info' });
  });

  it('unsubscribes via off and disposer', () => {
    const bus = new EventBus();
    const spy = vi.fn();
    const dispose = bus.on('game:paused', spy);
    dispose();
    bus.emit('game:paused', { paused: true });
    expect(spy).not.toHaveBeenCalled();
    bus.on('game:paused', spy);
    bus.off('game:paused', spy);
    bus.emit('game:paused', { paused: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('clear removes all listeners', () => {
    const bus = new EventBus();
    bus.on('audio:play-sfx', () => undefined);
    expect(bus.listenerCount('audio:play-sfx')).toBe(1);
    bus.clear();
    expect(bus.listenerCount('audio:play-sfx')).toBe(0);
  });

  it('emit with no listeners is a no-op', () => {
    const bus = new EventBus();
    expect(() => bus.emit('story:ended', { endingId: 'x' })).not.toThrow();
  });
});
