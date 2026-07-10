import { useSyncExternalStore } from "react";
import type { EntityReader, Reader } from "@redrixx/nexus";

/**
 * Subscribe a component to a {@link Reader} and return its current value.
 *
 * This is the whole React binding: a reader is exactly the
 * `subscribe` + `getSnapshot` pair `useSyncExternalStore` wants, so the adapter
 * is a one-liner. The component re-renders when — and only when — the reader's
 * value reference changes (Nexus stores publish a new reference on every commit
 * and the same reference otherwise, so this is stable).
 *
 * @typeParam S - Snapshot type exposed by the reader.
 * @param reader - Observation capability to subscribe to.
 * @returns The current reader snapshot.
 */
export function useReader<S>(reader: Reader<S>): S {
  return useSyncExternalStore(reader.subscribe, reader.get, reader.get);
}

/**
 * Subscribe to an entity collection and return the live `ReadonlyMap`.
 *
 * Derive from it in render (with `useMemo` if the derivation is expensive) —
 * the map reference is stable between mutations, so `useMemo` keyed on it only
 * recomputes when the collection actually changes.
 *
 * @typeParam T - Entity value type.
 * @param reader - Entity collection reader.
 * @returns The current collection snapshot.
 */
export function useEntities<T>(
  reader: EntityReader<T>,
): ReadonlyMap<string, T> {
  return useReader(reader);
}

/**
 * Subscribe to a single entity by id and return it (or `undefined` if not
 * alive). Selective: a mutation to a *different* entity leaves this entity's
 * reference unchanged, so the component bails out of re-rendering.
 *
 * @typeParam T - Entity value type.
 * @param reader - Entity collection reader.
 * @param id - Entity identifier to observe.
 * @returns The entity snapshot, or `undefined` when absent.
 */
export function useEntity<T>(
  reader: EntityReader<T>,
  id: string,
): T | undefined {
  const getEntity = () => reader.getEntity(id);
  return useSyncExternalStore(reader.subscribe, getEntity, getEntity);
}
