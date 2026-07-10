/**
 * Persistence port — the one seam for optional durability.
 *
 * Nexus core never imports a platform storage module. A host that wants an
 * owner's state to survive a reload injects an implementation of this port;
 * a host that doesn't, injects nothing. The port is a plain synchronous
 * string key/value store — the smallest thing every backing store (memory,
 * `localStorage`, MMKV, a Tauri plugin) can satisfy.
 */
export interface Persistence {
  /** Return the stored string for `key`, or `null` if absent. */
  getString(key: string): string | null;
  /** Store `value` under `key`, overwriting any previous value. */
  set(key: string, value: string): void;
  /** Remove `key`. A no-op if it was not present. */
  remove(key: string): void;
}

/**
 * An in-memory {@link Persistence} backed by a `Map`. State survives for the
 * lifetime of the process but not across reloads. The default for tests and
 * any host without a real disk adapter.
 */
export function createMemoryPersistence(): Persistence {
  const store = new Map<string, string>();
  return {
    getString: (key) => store.get(key) ?? null,
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
  };
}
