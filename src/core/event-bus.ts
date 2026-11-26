import type { GameEventName, GameEvents } from './events';

export type EventHandler<E extends GameEventName> = (payload: GameEvents[E]) => void;

/** Central typed event bus. Systems talk only through events. */
export class EventBus {
  private readonly handlers = new Map<GameEventName, Set<EventHandler<GameEventName>>>();

  on<E extends GameEventName>(event: E, handler: EventHandler<E>): () => void {
    const set = this.ensureSet(event);
    set.add(handler as EventHandler<GameEventName>);
    return () => this.off(event, handler);
  }

  off<E extends GameEventName>(event: E, handler: EventHandler<E>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<GameEventName>);
  }

  emit<E extends GameEventName>(event: E, payload: GameEvents[E]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      (handler as EventHandler<E>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  listenerCount(event: GameEventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /** Sum of handlers across all events (leak audits / soak tests). */
  totalListeners(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }

  private ensureSet(event: GameEventName): Set<EventHandler<GameEventName>> {
    const existing = this.handlers.get(event);
    if (existing) return existing;
    const created = new Set<EventHandler<GameEventName>>();
    this.handlers.set(event, created);
    return created;
  }
}

export const gameBus = new EventBus();
