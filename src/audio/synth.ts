/** Procedural SFX/music: synthwave with funk/samba/forró/bossa spice. */

export type AudioEngine = {
  playSfx: (id: string) => void;
  setVolume: (master: number, muted: boolean) => void;
  startMusic: () => void;
  stopMusic: () => void;
  dispose: () => void;
};

type OscKind = OscillatorType;

type AudioState = {
  ctx: AudioContext;
  gain: GainNode;
  master: number;
  muted: boolean;
  musicTimer: ReturnType<typeof setInterval> | null;
};

export function createAudioEngine(ctx: AudioContext = new AudioContext()): AudioEngine {
  const state = initState(ctx);
  return bindEngine(state);
}

function bindEngine(state: AudioState): AudioEngine {
  return {
    playSfx: (id) => void playSfx(state, id),
    setVolume: (m, mu) => setVolume(state, m, mu),
    startMusic: () => startMusic(state),
    stopMusic: () => stopMusic(state),
    dispose: () => disposeAudio(state),
  };
}

function initState(ctx: AudioContext): AudioState {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  applyGain(gain, 0.7, false);
  return { ctx, gain, master: 0.7, muted: false, musicTimer: null };
}

function setVolume(state: AudioState, master: number, muted: boolean): void {
  state.master = master;
  state.muted = muted;
  applyGain(state.gain, master, muted);
}

function startMusic(state: AudioState): void {
  if (state.musicTimer) return;
  state.musicTimer = startLoop(state);
}

function stopMusic(state: AudioState): void {
  if (!state.musicTimer) return;
  clearInterval(state.musicTimer);
  state.musicTimer = null;
}

function disposeAudio(state: AudioState): void {
  stopMusic(state);
  void state.ctx.close();
}

function applyGain(node: GainNode, master: number, muted: boolean): void {
  node.gain.value = muted ? 0 : master;
}

function playSfx(state: AudioState, id: string): void {
  const freq = sfxFreq(id);
  blip(state, freq.hz, freq.dur, freq.type);
}

function sfxFreq(id: string): { hz: number; dur: number; type: OscKind } {
  const table: Record<string, { hz: number; dur: number; type: OscKind }> = {
    win: { hz: 523.25, dur: 0.12, type: 'square' },
    lose: { hz: 110, dur: 0.18, type: 'sawtooth' },
    move: { hz: 220, dur: 0.04, type: 'triangle' },
    interact: { hz: 392, dur: 0.08, type: 'square' },
    bet: { hz: 330, dur: 0.1, type: 'square' },
    ui: { hz: 660, dur: 0.05, type: 'sine' },
  };
  return table[id] ?? table.ui!;
}

function blip(state: AudioState, freq: number, dur: number, type: OscKind): void {
  const osc = state.ctx.createOscillator();
  const g = state.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0.15;
  osc.connect(g);
  g.connect(state.gain);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.001, state.ctx.currentTime + dur);
  osc.stop(state.ctx.currentTime + dur + 0.02);
}

function startLoop(state: AudioState): ReturnType<typeof setInterval> {
  const chord = [196, 233.08, 293.66, 349.23];
  let i = 0;
  blip(state, chord[0]!, 0.2, 'sawtooth');
  return setInterval(() => {
    i = (i + 1) % chord.length;
    blip(state, chord[i]!, 0.2, 'sawtooth');
    if (i % 2 === 0) blip(state, chord[i]! * 2, 0.06, 'triangle');
  }, 420);
}
