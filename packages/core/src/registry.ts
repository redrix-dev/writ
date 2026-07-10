/**
 * Composition-root registry — one named slot for one wired instance.
 *
 * A composition root is built once, at startup, in one place. The registry lets
 * the rest of the app reach that instance without prop-drilling it or importing
 * the construction site directly (no ambient imports of the live object).
 *
 * Registration is **strict by default**, for the same reason the entity
 * lifecycle is: a *second* `register` almost always means a bug — a stray second
 * composition root silently hijacking every `require()`, which is exactly the
 * ambient-authority problem Nexus exists to prevent. So a double `register`
 * throws; the explicit way to swap instances (tests, HMR) is `reset()` first —
 * and the error says so.
 *
 * `createRegistry` returns an independent slot each call; registries never share
 * state.
 *
 * @example
 * // composition-root module
 * export const appRoot = createRegistry<AppRoot>("AppRoot");
 * // at startup, once:
 * appRoot.register(buildRoot());
 * // anywhere else:
 * const root = appRoot.require();
 */
export interface Registry<T> {
  /** Register the instance. Throws if one is already registered. */
  register(instance: T): void;
  /** Return the registered instance, or throw if none is registered. */
  require(): T;
  /** Return the registered instance, or `null` if none is registered. */
  get(): T | null;
  /** Clear the slot. The explicit precondition for re-registering. */
  reset(): void;
}

export function createRegistry<T>(name: string): Registry<T> {
  // Boxed so that registering a falsy/nullish instance is still "registered".
  let slot: { value: T } | null = null;

  return {
    register(instance) {
      if (slot !== null) {
        throw new Error(
          `${name}: already registered. Call reset() before registering a different instance.`,
        );
      }
      slot = { value: instance };
    },
    require() {
      if (slot === null) {
        throw new Error(
          `${name}: not registered. Call register(...) at your composition root before use.`,
        );
      }
      return slot.value;
    },
    get() {
      return slot === null ? null : slot.value;
    },
    reset() {
      slot = null;
    },
  };
}
