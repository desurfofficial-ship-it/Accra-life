/**
 * node-storage-stub — minimal localStorage + event-target stubs for
 * headless tsx tests.
 *
 * Imported FIRST in test scripts (ESM evaluates imports in order) so
 * systems that touch localStorage at construct time (Wallet, NeedsSystem,
 * EconomyManager) or bind window/document listeners (InputManager) find a
 * DOM-ish environment in plain node.
 */

const store = new Map<string, string>();

(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length(): number {
    return store.size;
  },
  clear(): void {
    store.clear();
  },
  getItem(key: string): string | null {
    return store.get(key) ?? null;
  },
  key(index: number): string | null {
    return [...store.keys()][index] ?? null;
  },
  removeItem(key: string): void {
    store.delete(key);
  },
  setItem(key: string, value: string): void {
    store.set(key, String(value));
  }
} as Storage;

// InputManager binds window/document listeners in its constructor.
const noopListener = (): void => undefined;
const fakeTarget = {
  addEventListener: noopListener,
  removeEventListener: noopListener,
  dispatchEvent: (): boolean => true
};
(globalThis as unknown as { window: unknown }).window = {
  ...fakeTarget,
  setTimeout,
  clearTimeout
};
(globalThis as unknown as { document: unknown }).document = fakeTarget;

