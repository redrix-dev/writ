# Public API reference

## `@redrixx/writ`

### `createCell<S>(initial): Writer<S>`

Creates one writer capability and its separate reader. `set` accepts a value or
updater and synchronously notifies current subscribers when `Object.is` reports
a changed value.

### `Reader<S>`

- `get(): S` — returns the current snapshot.
- `subscribe(listener): () => void` — registers a synchronous post-commit
  listener and returns cleanup.

Readers contain no writ mutation method. Values are not deep-frozen.

### `Writer<S>`

- `reader: Reader<S>` — observation capability to publish.
- `set(value | updater): void` — mutation capability retained by an owner.

Sharing a writer shares authority.

### `createEntityStore<T>(options?): EntityStore<T>`

Creates a copy-on-write entity collection with strict existence operations,
named lenient alternatives, optional synchronous persistence, and a separate
`EntityReader`.

### `EntityReader<T>`

Extends `Reader<ReadonlyMap<string, T>>` with:

- `getEntity(id): T | undefined`
- `has(id): boolean`

The map and entity values are not deep-frozen.

### `EntityStore<T>`

- `reader` — observation-only handle.
- `spawn` — strict birth; throws if present.
- `update` — shallow patch; throws if absent.
- `destroy` — strict death; throws if absent.
- `upsert` — full spawn-or-replace.
- `destroyIfPresent` — lenient death returning whether removal occurred.
- `clear` — one administrative reset and persisted-state removal.
- `persist` — synchronous explicit persistence; no-op without a port.
- `rehydrate` — replaces from valid persisted input; no-op without data.

### `EntityStoreOptions<T>`

- `persistence?: Persistence`
- `key?: string` — required when persistence is supplied.
- `serialize?(entities): string`
- `deserialize?(raw): Iterable<[id, entity]>`

### `Persistence`

Synchronous string key/value port with `getString`, `set`, and `remove`.

### `createMemoryPersistence(): Persistence`

Creates process-lifetime in-memory persistence for tests and nondurable hosts.

### `createRegistry<T>(name): Registry<T>`

Creates an independent strict named slot. Registration throws when occupied;
call `reset` explicitly before replacement.

### `Registry<T>`

- `register(instance): void`
- `require(): T` — throws when empty.
- `get(): T | null`
- `reset(): void`

## `@redrixx/writ-react`

### `useReader<S>(reader): S`

Subscribes through `useSyncExternalStore` and returns the current snapshot.

### `useEntities<T>(reader): ReadonlyMap<string, T>`

Subscribes to a complete entity collection.

### `useEntity<T>(reader, id): T | undefined`

Subscribes to one entity snapshot. Changes to other entity references do not
force a changed snapshot for this hook.

The adapter provides no mutation hooks and does not deep-freeze values.
