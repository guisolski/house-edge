/** Lightweight FPS / frame-time sampler for overlay + playtest budgets. */

export type FpsSample = {
  fps: number;
  frameMs: number;
  avgFps: number;
  avgFrameMs: number;
};

export class FpsMeter {
  private frames = 0;
  private last = 0;
  private fps = 60;
  private frameMs = 16.7;
  private readonly window: number[] = [];
  private readonly maxSamples = 120;

  tick(now: number): FpsSample {
    if (!this.last) this.last = now;
    const dt = now - this.last;
    this.last = now;
    this.frameMs = dt || 16.7;
    this.frames += 1;
    this.window.push(1000 / this.frameMs);
    if (this.window.length > this.maxSamples) this.window.shift();
    if (this.frames >= 10) {
      this.fps = Math.round(1000 / this.frameMs);
      this.frames = 0;
    }
    const avgFps =
      this.window.reduce((a, b) => a + b, 0) / Math.max(1, this.window.length);
    return {
      fps: this.fps,
      frameMs: this.frameMs,
      avgFps,
      avgFrameMs: 1000 / avgFps,
    };
  }

  reset(): void {
    this.frames = 0;
    this.last = 0;
    this.window.length = 0;
  }
}
