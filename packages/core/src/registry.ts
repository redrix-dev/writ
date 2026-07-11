/**
 * Composition-root registry — one named slot for one wired instance.
 *
 * A registry is one strict named slot commonly wired at a composition root. It
 * lets the rest of the app reach an intentionally published reader-and-command
 * surface without prop-drilling. Applications may define multiple registries
 * and composition roots; callers decide what capabilities the value exposes.
 *
 * Registration is **strict by default**, for the same reason the entity
 * lifecycle is: a *second* `register` almost always means a bug — a stray second
 * composition root silently hijacking every `require()`, which is exactly the
 * ambient-authority problem writ exists to prevent. So a double `register`
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

/**
 * Create an independent strict named registry slot.
 *
 * @typeParam T - The intentionally published reader-and-command surface.
 * @param name - Human-readable name included in registration errors.
 * @returns A new registry that shares no state with other registries.
 * @throws When `register` is called while the slot is occupied, or `require` is
 * called while it is empty.
 */
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
