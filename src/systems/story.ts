import type { StoryBeat } from '../core/types';
import { EventBus } from '../core/event-bus';

export class StorySystem {
  private flags = new Map<string, boolean>();
  private completed = new Set<string>();

  constructor(
    private readonly bus: EventBus,
    private readonly beats: readonly StoryBeat[],
  ) {}

  getFlag(flag: string): boolean {
    return this.flags.get(flag) === true;
  }

  setFlag(flag: string, value = true): void {
    this.flags.set(flag, value);
    this.bus.emit('story:flag-set', { flag, value });
  }

  isBeatComplete(beatId: string): boolean {
    return this.completed.has(beatId);
  }

  availableBeats(districtId: string): StoryBeat[] {
    return this.beats.filter((beat) => this.isAvailable(beat, districtId));
  }

  startBeat(beatId: string): StoryBeat | null {
    const beat = this.beats.find((b) => b.id === beatId);
    if (!beat || this.completed.has(beatId)) return null;
    if (!this.flagsReady(beat)) return null;
    this.bus.emit('story:beat-started', { beatId });
    return beat;
  }

  completeBeat(beatId: string): StoryBeat | null {
    const beat = this.beats.find((b) => b.id === beatId);
    if (!beat) return null;
    this.completed.add(beatId);
    for (const flag of beat.setsFlags) this.setFlag(flag, true);
    this.bus.emit('story:beat-completed', { beatId });
    if (beat.isEnding && beat.endingId) {
      this.bus.emit('story:ended', { endingId: beat.endingId });
    }
    return beat;
  }

  getCompleted(): string[] {
    return [...this.completed];
  }

  exportFlags(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }

  hydrate(flags: Record<string, boolean>, completed: string[]): void {
    this.flags = new Map(Object.entries(flags));
    this.completed = new Set(completed);
  }

  private isAvailable(beat: StoryBeat, districtId: string): boolean {
    if (beat.districtId !== districtId) return false;
    if (this.completed.has(beat.id)) return false;
    return this.flagsReady(beat);
  }

  private flagsReady(beat: StoryBeat): boolean {
    return beat.requiredFlags.every((f) => this.getFlag(f));
  }
}
