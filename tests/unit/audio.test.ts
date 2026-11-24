import { describe, expect, it, vi } from 'vitest';
import { createAudioEngine } from '../../src/audio/synth';

function mockAudioContext(): AudioContext {
  const gain = {
    gain: { value: 1, exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const osc = {
    type: 'sine',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  return {
    currentTime: 0,
    destination: {},
    createGain: () => gain,
    createOscillator: () => osc,
    close: vi.fn(async () => undefined),
  } as unknown as AudioContext;
}

describe('createAudioEngine', () => {
  it('plays sfx, toggles volume, and loops music', () => {
    vi.useFakeTimers();
    const ctx = mockAudioContext();
    const audio = createAudioEngine(ctx);
    audio.playSfx('win');
    audio.playSfx('lose');
    audio.playSfx('move');
    audio.playSfx('interact');
    audio.playSfx('bet');
    audio.playSfx('ui');
    audio.playSfx('unknown');
    audio.setVolume(0.4, false);
    audio.setVolume(0.5, true);
    audio.startMusic();
    audio.startMusic();
    vi.advanceTimersByTime(900);
    audio.stopMusic();
    audio.dispose();
    expect(ctx.close).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
