import { describe, expect, it } from 'vitest';
import {
  clearStorage,
  createDefaultSave,
  loadFromStorage,
  parseSave,
  saveToStorage,
  serializeSave,
} from '../../src/systems/save';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('save', () => {
  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    const save = createDefaultSave();
    save.player.credits = 999;
    saveToStorage(save, storage);
    expect(loadFromStorage(storage)?.player.credits).toBe(999);
    clearStorage(storage);
    expect(loadFromStorage(storage)).toBeNull();
  });

  it('rejects invalid payloads', () => {
    expect(parseSave('not-json')).toBeNull();
    expect(parseSave('{"version":2}')).toBeNull();
    expect(parseSave(serializeSave(createDefaultSave()))?.version).toBe(1);
  });
});
