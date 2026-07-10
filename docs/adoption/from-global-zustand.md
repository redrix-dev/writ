# Migrate a global Zustand store to scoped store factories

A disciplined global Zustand store may already keep setters private. Keep that
strength. The migration is warranted when instances need independent community,
channel, document, or session lifetimes—not because Zustand itself is deficient.

## Before: one immortal store

```ts
export const messages = createStore<MessageState>((set) => ({
  byChannel: {},
  receive: (channelId, message) => set(/* update nested global state */),
}));
```

This can work, but lifetime, persistence keys, subscriptions, and cleanup for
each channel are now encoded inside one global object.

## 1. Extract a store factory

```ts
const createChannelStore = () =>
  createStore<ChannelState>(() => ({ messages: {} }));
```

Keep normal Zustand selectors, middleware, DevTools, and update conventions.

## 2. Put the writable `StoreApi` behind an owner

The owner retains `setState` and routes realtime callbacks. Its public surface
contains `getState`/`subscribe` or selected hooks plus narrow commands.

```ts
type ChannelReader = Pick<StoreApi<ChannelState>, "getState" | "subscribe">;

class ChannelOwner {
  readonly #store = createChannelStore();
  readonly reader: ChannelReader = {
    getState: this.#store.getState,
    subscribe: this.#store.subscribe,
  };
}
```

If the current class/module already does this well, projectname may add little
beyond shared terminology and lifecycle conventions.

## 3. Add a keyed owner registry

Construct on first access, return the same active owner for the key, and delete
it after disposal. Do not export the registry’s internal map.

```ts
channel(id: string): ChannelPublic {
  return this.#channels.get(id) ?? this.#createChannel(id);
}
```

## 4. Move routing and persistence to the scope

Subscribe to `channel:${id}` inside `ChannelOwner`, use a per-scope persistence
key, and rehydrate that instance. Reconnect replay should call an explicit
replay method rather than the strict live-event path when duplicates are valid.

## 5. Dispose deterministically

`closeChannel(id)` should unsubscribe, cancel inflight work, clear or persist as
decided, and delete the owner. Leaving a community disposes every child channel.

See the typechecked
[projectname-shaped Zustand recipe](../../apps/state-library-recipes/src/zustand-projectname-shaped.ts)
and the [complete nested registry](./dynamic-registry.md).
