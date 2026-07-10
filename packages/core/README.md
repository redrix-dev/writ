# @redrixx/projectname

**One ownership and lifecycle model across state systems.**

projectname is a small, adoptable ownership and lifecycle contract for hot
shared application state. It targets high-churn state with many observers,
recurring external events, and dynamic entity collections: realtime messaging,
presence, permissions and roles, multiplayer or collaborative state, device
telemetry, voice sessions, long-lived desktop clients, and offline or
reconnected systems.

State libraries provide storage, reactivity, selectors, update propagation, and
mature tooling. projectname does not duplicate those benefits. It adds a shared
reader/writer shape, scoped ownership model, and explicit create, update,
upsert, and destroy vocabulary that can be used across different state
substrates.

- **Separate capabilities**: creating state returns one writer capability and a
  reader with no projectname mutation method. Sharing the writer shares
  authority.
- **Asserted entity existence**: `spawn` / `destroy`, strict by default. This is
  not a complete state-machine model of every domain transition.
- **Strict registries**: publish intentional readers and commands without raw
  writers. Each registry is one named slot, not proof of one application root.

The core has zero runtime dependencies and is framework-agnostic. Its built-in
cell is the batteries-included adoption path when another state substrate is not
needed. Existing state libraries can retain responsibility for their own
storage, reactivity, selectors, tooling, and performance characteristics.

## What projectname is not

projectname does not replace Zustand, Redux, Jotai, Solid stores, or RxJS. It is
not a server-state cache, data-fetching library, forms or local-component-state
solution, complete state-machine runtime, or security boundary, and it is not
intended for every piece of application state.

## Capability limits

projectname does not determine one human or module owner at runtime. Writers can
be exported or passed to multiple callers, in which case every holder can write.
It is an API and type boundary, not hostile-code isolation or protection from
`as any`, unsafe casts, reflection, or mutable references.

Readers expose no projectname mutation method, but projectname does not deeply
freeze values. Objects returned by `get()` can still be mutated when their
references are mutable. Prefer immutable updates and readonly state types at
public reader boundaries.

```bash
npm install @redrixx/projectname
```

This package is **ESM-only**. CommonJS consumers must use dynamic `import()`.
The browser-compatible runtime has no Node-specific runtime requirement.

## One-writer cell

```ts
import { createCell } from "@redrixx/projectname";

const count = createCell(0);
count.set((n) => n + 1); // owner writes
export const counter = count.reader; // everyone else: get() + subscribe(), no set
```

## Entity store — strict lifecycle, explicit escape hatches

```ts
import { createEntityStore } from "@redrixx/projectname";

const users = createEntityStore<{ name: string; online: boolean }>();

users.spawn("u1", { name: "Cody", online: true }); // birth — throws if already alive
users.update("u1", { online: false }); // patch — throws if absent
users.destroy("u1"); // death — throws if absent

users.upsert("u1", { name: "Cody", online: true }); // spawn-or-replace, never throws
users.destroyIfPresent("u1"); // no-throw death → boolean
```

Strict throws name their own way out:
`spawn("u1"): entity is already alive. Use upsert() to replace it.`

## Composition root

```ts
import { createEntityStore, createRegistry } from "@redrixx/projectname";

export const app = createRegistry<{ users: EntityReader<User> }>("AppState");

export function bootstrap(events: EventSource) {
  const users = createEntityStore<User>();
  events.on("join", (u) => users.upsert(u.id, u)); // owner retains the writer
  events.on("leave", (u) => users.destroyIfPresent(u.id));
  app.register({ users: users.reader }); // only readers leave here
}
```

## Optional persistence

Inject any synchronous key/value port; core imports no platform storage.

```ts
import {
  createEntityStore,
  createMemoryPersistence,
} from "@redrixx/projectname";

const store = createEntityStore<User>({
  persistence: createMemoryPersistence(), // or localStorage / MMKV / Tauri adapters
  key: "users",
});
store.rehydrate(); // load on boot; writes persist through automatically
```

## React

See
[`@redrixx/projectname-react`](https://www.npmjs.com/package/@redrixx/projectname-react)
for `useReader` / `useEntities` / `useEntity`. Core is fully usable without it.

## Not yet supported (v0.1)

Other framework adapters · devtools/inspector · a sync story beyond the
injectable port · SSR · a plugin system · per-entity ownership transfer.

Pre-1.0: `0.x` releases may make breaking changes.

## Contract and error behavior

Strict lifecycle failures throw synchronously before commit, notification, or
persistence. Persistence failures are warned after the in-memory commit and do
not roll memory back. Corrupt persisted input is removed without replacing the
current in-memory collection.

`clear()` is one administrative reset that wipes persisted state; it is not a
series of asserted entity deaths. Reader values are not deep-frozen, and sharing
a writer deliberately shares authority.

See the complete
[package contract](https://github.com/redrix-dev/projectname/blob/main/docs/package-contract.md),
including subscription semantics, scoped-owner disposal, and measured
operating-range guidance.

For migration steps, mutation-placement guidance, a complete dynamic registry,
testing practices, terminology, and a feature decision tree, see the
[adoption guides](https://github.com/redrix-dev/projectname/tree/main/docs/adoption).

## License

[Apache-2.0](https://github.com/redrix-dev/projectname/blob/main/LICENSE) © Cody
Magnuson (Redrixx)
