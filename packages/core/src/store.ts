/**
 * The reactive substrate — and the authority boundary.
 *
 * `createCell` creates one {@link Writer} capability and a separate reader.
 * The `reader` property has `get` and `subscribe`, but no Nexus mutation method.
 * Code holding only that handle cannot write through it. The writer can still
 * be deliberately shared, and mutable values returned by `get` are not deeply
 * frozen; prefer readonly state types and immutable updates at public boundaries.
 *
 * The reader shape (`get` + no-arg `subscribe`) is deliberately the exact pair
 * React's `useSyncExternalStore` wants, so the React adapter is a one-liner.
 */

/** A handle with no Nexus mutation method. Returned values are not deep-frozen. */
export interface Reader<S> {
  /** Current value. Cheap; call it inside a selector/snapshot. */
  get(): S;
  /**
   * Register a listener fired after every committed change. Returns an
   * unsubscribe function. The listener takes no arguments — pair it with
   * {@link Reader.get} (this is the `useSyncExternalStore` contract).
   */
  subscribe(listener: () => void): () => void;
}

/** The writer capability. The owner keeps this; it is never handed to readers. */
export interface Writer<S> {
  /** The read-only handle to give to readers. */
  readonly reader: Reader<S>;
  /** Replace the value, or derive it from the previous value. */
  set(next: S | ((prev: S) => S)): void;
}

const isUpdater = <S>(next: S | ((prev: S) => S)): next is (prev: S) => S =>
  typeof next === "function";

/**
 * Create a one-writer cell.
 *
 * @param initial the starting value
 * @returns a {@link Writer}; give `writer.reader` to consumers, keep `writer.set`
 *
 * @example
 * const count = createCell(0);
 * export const counter = count.reader; // consumers get this
 * count.set((n) => n + 1);             // only the owner can do this
 */
export function createCell<S>(initial: S): Writer<S> {
  let state = initial;
  const listeners = new Set<() => void>();

  const reader: Reader<S> = {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    reader,
    set(next) {
      const value = isUpdater(next) ? next(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      // Snapshot listeners so a listener that (un)subscribes mid-notify
      // doesn't corrupt the iteration.
      for (const listener of [...listeners]) listener();
    },
  };
}
