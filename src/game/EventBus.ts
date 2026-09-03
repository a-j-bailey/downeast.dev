/**
 * Tiny EventBus for React ↔ game. Does not import Phaser so Workers/SSR
 * can evaluate this module.
 */
type Handler = (...args: unknown[]) => void;

class HarborEventBus {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, fn: Handler): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(fn);
  }

  off(event: string, fn: Handler): void {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.handlers.get(event);
    if (!set) {
      return;
    }
    for (const fn of set) {
      fn(...args);
    }
  }
}

export const EventBus = new HarborEventBus();
