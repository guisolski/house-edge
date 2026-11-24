import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/event-bus';
import { StorySystem } from '../../src/systems/story';
import { WorldSystem } from '../../src/systems/world';
import { STORY_BEATS } from '../../src/content/story';
import { DISTRICTS } from '../../src/content/districts';

describe('StorySystem', () => {
  it('gates beats on flags and completes with side effects', () => {
    const bus = new EventBus();
    const ended = vi.fn();
    bus.on('story:ended', ended);
    const story = new StorySystem(bus, STORY_BEATS);
    expect(story.availableBeats('morro-neon')[0]?.id).toBe('intro-laje');
    expect(story.startBeat('boteco-nair')).toBeNull();
    story.completeBeat('intro-laje');
    expect(story.getFlag('conheceu_rita')).toBe(true);
    expect(story.availableBeats('morro-neon').some((b) => b.id === 'boteco-nair')).toBe(
      true,
    );
  });

  it('hydrate restores progress', () => {
    const story = new StorySystem(new EventBus(), STORY_BEATS);
    story.hydrate({ conheceu_rita: true }, ['intro-laje']);
    expect(story.isBeatComplete('intro-laje')).toBe(true);
    expect(story.exportFlags().conheceu_rita).toBe(true);
    expect(story.getCompleted()).toContain('intro-laje');
  });

  it('emits ending when completing final beat', () => {
    const bus = new EventBus();
    const ended = vi.fn();
    bus.on('story:ended', ended);
    const story = new StorySystem(bus, STORY_BEATS);
    story.hydrate(
      { unlocked_torre: true, escandalo_aberto: true, vip_ok: true },
      STORY_BEATS.filter((b) => b.id !== 'torre-final').map((b) => b.id),
    );
    const beat = story.startBeat('torre-final');
    expect(beat).not.toBeNull();
    story.completeBeat('torre-final');
    expect(ended).toHaveBeenCalledWith({ endingId: 'povo-no-controle' });
  });
});

describe('WorldSystem', () => {
  it('unlocks districts and clamps positions', () => {
    const bus = new EventBus();
    const unlocked = vi.fn();
    bus.on('district:unlocked', unlocked);
    const world = new WorldSystem(bus, DISTRICTS);
    expect(world.isUnlocked('morro-neon')).toBe(true);
    expect(world.unlock('feira-central')).toBe(true);
    expect(unlocked).toHaveBeenCalled();
    expect(world.unlock('feira-central')).toBe(false);
    expect(world.clampPosition('morro-neon', -5, 99)).toEqual({ x: 0, y: 29 });
    world.hydrate(['morro-neon']);
    world.syncFromFlags((f) => f === 'unlocked_feira');
    expect(world.isUnlocked('feira-central')).toBe(true);
    expect(world.list().length).toBe(4);
    expect(world.unlockedList().length).toBeGreaterThan(0);
    expect(world.get('morro-neon')?.name).toBe('Morro Neon');
    expect(world.exportUnlocked()).toContain('morro-neon');
  });
});
