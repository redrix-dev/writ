/**
 * Entity store — a one-writer collection of entities with an explicit lifecycle.
 *
 * `createEntityStore` returns an {@link EntityStore}: the caller is the owner and
 * holds the lifecycle methods; `.reader` is the read-only handle for everyone
 * else (same capability split as {@link createCell}).
 *
 * The default lifecycle is **strict** — birth and death are real, asserted
 * transitions:
 *
 * - {@link EntityStore.spawn} throws if the id is already alive.
 * - {@link EntityStore.update} throws if the id is absent.
 * - {@link EntityStore.destroy} throws if the id is absent.
 *
 * Leniency is available, but only as **named, explicit** escape hatches you opt
 * into per call — never as a silent default: {@link EntityStore.upsert} and
 * {@link EntityStore.destroyIfPresent}. Each strict error message names the
 * escape hatch, so the deliberate way out is discoverable at the throw site.
 *
 * The entity map is copy-on-write: every mutation publishes a *new*
 * `ReadonlyMap`, so readers (and `useSyncExternalStore`) reliably see the
 * change. This is O(n) in the collection size per write — fine for the entity
 * counts a lifecycle owner manages; batching for very large maps is a later
 * concern.
 */

import { createCell, type Reader } from "./store.js";
import type { Persistence } from "./persistence.js";
import { warn } from "./warn.js";

/** Read-only handle over an entity collection. Hand this out; it cannot mutate. */
export interface EntityReader<T> extends Reader<ReadonlyMap<string, T>> {
  /** The entity for `id`, or `undefined` if none is alive. */
  getEntity(id: string): T | undefined;
  /** Whether an entity is currently alive for `id`. */
  has(id: string): boolean;
}

/** The owner capability over an entity collection. Never handed to readers. */
export interface EntityStore<T extends object> {
  /** The read-only handle to give to consumers. */
  readonly reader: EntityReader<T>;

  // ── strict lifecycle (the default) ──────────────────────────────
  /** Birth. Throws if `id` is already alive. Returns the spawned entity. */
  spawn(id: string, data: T): T;
  /** Shallow-merge `patch` into an existing entity. Throws if `id` is absent. */
  update(id: string, patch: Partial<T>): T;
  /** Death. Throws if `id` is absent. */
  destroy(id: string): void;

  // ── explicit escape hatches (opt-in leniency, not footguns) ─────
  /** Spawn-or-replace. Never throws. Use when you don't care if it existed. */
  upsert(id: string, data: T): T;
  /** No-throw death. Returns whether an entity was actually removed. */
  destroyIfPresent(id: string): boolean;

  // ── bulk / persistence ──────────────────────────────────────────
  /** Remove every entity and wipe persisted state (if configured). */
  clear(): void;
  /** Persist the current collection. No-op if no persistence is configured. */
  persist(): void;
  /** Replace the collection from persisted state. No-op if none is configured. */
  rehydrate(): void;
}

export interface EntityStoreOptions<T> {
  /** Optional durability port. When set, writes persist through automatically. */
  persistence?: Persistence;
  /** Storage key. Required when `persistence` is set. */
  key?: string;
  /** Custom serializer. Defaults to JSON over the map's entries. */
  serialize?: (entities: ReadonlyMap<string, T>) => string;
  /** Custom deserializer. Defaults to JSON parsing an array of entries. */
  deserialize?: (raw: string) => Iterable<readonly [string, T]>;
}

export function createEntityStore<T extends object>(
  options: EntityStoreOptions<T> = {},
): EntityStore<T> {
  const { persistence, key } = options;
  if (persistence && !key) {
    throw new Error(
      "createEntityStore: `key` is required when `persistence` is provided.",
    );
  }

  const serialize =
    options.serialize ?? ((entities) => JSON.stringify([...entities]));
  const deserialize =
    options.deserialize ??
    ((raw) => JSON.parse(raw) as ReadonlyArray<readonly [string, T]>);

  const cell = createCell<ReadonlyMap<string, T>>(new Map());

  const persist = (): void => {
    if (!persistence || !key) return;
    try {
      persistence.set(key, serialize(cell.reader.get()));
    } catch (err) {
      warn(`[nexus] failed to persist entity store "${key}"`, err);
    }
  };

  /** Apply a mutation over a fresh copy of the map, then commit + persist. */
  const mutate = (fn: (draft: Map<string, T>) => void): void => {
    const next = new Map(cell.reader.get());
    fn(next);
    cell.set(next);
    persist();
  };

  const spawn = (id: string, data: T): T => {
    if (cell.reader.get().has(id)) {
      throw new Error(
        `spawn("${id}"): entity is already alive. Use upsert() to replace it.`,
      );
    }
    mutate((draft) => draft.set(id, data));
    return data;
  };

  const update = (id: string, patch: Partial<T>): T => {
    const existing = cell.reader.get().get(id);
    if (existing === undefined) {
      throw new Error(
        `update("${id}"): no such entity. spawn() it first, or use upsert().`,
      );
    }
    const merged: T = { ...existing, ...patch };
    mutate((draft) => draft.set(id, merged));
    return merged;
  };

  const destroy = (id: string): void => {
    if (!cell.reader.get().has(id)) {
      throw new Error(
        `destroy("${id}"): no such entity. Use destroyIfPresent() to ignore.`,
      );
    }
    mutate((draft) => draft.delete(id));
  };

  const upsert = (id: string, data: T): T => {
    mutate((draft) => draft.set(id, data));
    return data;
  };

  const destroyIfPresent = (id: string): boolean => {
    if (!cell.reader.get().has(id)) return false;
    mutate((draft) => draft.delete(id));
    return true;
  };

  const clear = (): void => {
    cell.set(new Map());
    if (persistence && key) persistence.remove(key);
  };

  const rehydrate = (): void => {
    if (!persistence || !key) return;
    const raw = persistence.getString(key);
    if (raw === null) return;
    try {
      cell.set(new Map(deserialize(raw)));
    } catch (err) {
      warn(`[nexus] failed to rehydrate entity store "${key}"`, err);
      persistence.remove(key);
    }
  };

  const reader: EntityReader<T> = {
    get: () => cell.reader.get(),
    subscribe: (listener) => cell.reader.subscribe(listener),
    getEntity: (id) => cell.reader.get().get(id),
    has: (id) => cell.reader.get().has(id),
  };

  return {
    reader,
    spawn,
    update,
    destroy,
    upsert,
    destroyIfPresent,
    clear,
    persist,
    rehydrate,
  };
}
