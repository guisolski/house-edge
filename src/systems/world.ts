import type { DistrictDef, DistrictId } from '../core/types';
import { EventBus } from '../core/event-bus';

export class WorldSystem {
  private unlocked = new Set<DistrictId>();

  constructor(
    private readonly bus: EventBus,
    private readonly districts: readonly DistrictDef[],
  ) {
    for (const d of districts) {
      if (d.unlockFlag === null) this.unlocked.add(d.id);
    }
  }

  list(): DistrictDef[] {
    return [...this.districts];
  }

  get(id: DistrictId): DistrictDef | undefined {
    return this.districts.find((d) => d.id === id);
  }

  isUnlocked(id: DistrictId): boolean {
    return this.unlocked.has(id);
  }

  unlockedList(): DistrictDef[] {
    return this.districts.filter((d) => this.unlocked.has(d.id));
  }

  unlock(id: DistrictId): boolean {
    if (this.unlocked.has(id)) return false;
    if (!this.get(id)) return false;
    this.unlocked.add(id);
    this.bus.emit('district:unlocked', { districtId: id });
    return true;
  }

  syncFromFlags(getFlag: (flag: string) => boolean): void {
    for (const d of this.districts) {
      if (d.unlockFlag === null || getFlag(d.unlockFlag)) {
        this.unlocked.add(d.id);
      }
    }
  }

  exportUnlocked(): DistrictId[] {
    return [...this.unlocked];
  }

  hydrate(ids: DistrictId[]): void {
    this.unlocked = new Set(ids);
  }

  clampPosition(districtId: DistrictId, x: number, y: number): { x: number; y: number } {
    const d = this.get(districtId);
    if (!d) return { x, y };
    return {
      x: Math.min(d.width - 1, Math.max(0, x)),
      y: Math.min(d.height - 1, Math.max(0, y)),
    };
  }
}
