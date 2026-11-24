/** UX-1/UX-2: detect active input device with debounce. */

export type InputMode = 'keyboard' | 'touch' | 'gamepad';

export class InputModeTracker {
  private mode: InputMode = 'keyboard';
  private pending: InputMode | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<(mode: InputMode) => void>();

  constructor(
    private readonly debounceMs = 350,
    initial: InputMode = 'keyboard',
  ) {
    this.mode = initial;
  }

  get(): InputMode {
    return this.mode;
  }

  onChange(fn: (mode: InputMode) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  note(mode: InputMode): void {
    if (mode === this.mode) {
      this.clearPending();
      return;
    }
    this.pending = mode;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.commit(), this.debounceMs);
  }

  /** Immediate switch for playtests / first paint. */
  force(mode: InputMode): void {
    this.clearPending();
    if (mode === this.mode) {
      for (const fn of this.listeners) fn(this.mode);
      return;
    }
    this.mode = mode;
    for (const fn of this.listeners) fn(this.mode);
  }

  private commit(): void {
    if (!this.pending || this.pending === this.mode) return;
    this.mode = this.pending;
    this.pending = null;
    for (const fn of this.listeners) fn(this.mode);
  }

  private clearPending(): void {
    this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
