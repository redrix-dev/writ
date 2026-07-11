# Writ

**One ownership and lifecycle model across state systems.**

Highly subscribed state becomes difficult when realtime events, optimistic
actions, persistence, policy, and UI code can all affect the same entities. writ
gives that state an explicit owner, separates writer and reader capabilities,
and makes entity existence changes deliberate.

writ is a small, adoptable contract for shared application state. It gives teams
a consistent way to express ownership, observation, and entity lifecycle while
continuing to use the state tools they already know.

## Why this exists

This project grew out of repeatedly debugging shared state whose ownership had
become implicit. Realtime events, optimistic actions, persistence, policy, and
UI code could all affect the same stores, while generic updates made entity
creation, replacement, and removal difficult to distinguish.

writ is the pattern I now prefer for avoiding those footguns: owners retain
writers, consumers receive readers and narrow commands, and entity lifecycle
uses explicit verbs. It is not an attempt to replace modern state libraries or
prescribe a universal architecture. It makes lessons learned through experience
concrete, reusable, and easier to follow in the next system.

Representative workloads include realtime messaging, presence, permissions,
roles, multiplayer state, collaborative editors, device telemetry, voice
sessions, long-lived desktop clients, and offline or reconnected systems.

State libraries provide storage, reactivity, selectors, update propagation, and
mature tooling. writ does not duplicate those benefits. It supplies a shared API
shape for who owns a store, who receives a writer or reader, when a scoped store
exists, and whether an entity is created, updated, upserted, or destroyed. The
same vocabulary can sit over Zustand, Redux, Solid, a hand-rolled store, or the
included zero-dependency cell.

- **Separate capabilities.** writ creates one writer capability and a separate
  reader capability. Consumers holding only the reader cannot write through that
  handle because readers expose no writ mutation method.
- **Asserted entity existence.** `spawn` and `destroy` are strict by default, so
  duplicate creation and missing destruction are reported instead of becoming
  incidental map edits. This is an existence lifecycle, not a model of every
  valid domain transition.
- **Strict service registry.** `createRegistry` publishes an intentionally wired
  reader-and-command surface without exposing raw writers. Each registry is one
  strict named slot; an application may deliberately have multiple composition
  roots or registries.
- **Substrate-agnostic adoption.** Keep the state system that fits the workload
  while giving owners and consumers the same recognizable surfaces across
  features.

The `@redrixx/writ` core has zero runtime dependencies and is
framework-agnostic. Official UI support currently consists of the React adapter
that ships in this repository; adapters and examples may have dependencies.

## Where writ fits

writ is designed for shared state that benefits from a visible ownership
boundary. Common examples include:

- Several independent event sources converge on the same state.
- State instances are created dynamically by tenant, community, channel,
  document, session, or device.
- Many components observe state but should not receive its mutation capability.
- Duplicate creation, missing updates, and repeated destruction indicate bugs.
- Contributors routinely need to determine who is allowed to change something.
- Store lifetime and subscription cleanup matter.

These patterns often appear in realtime messaging, collaborative editing,
multiplayer sessions, device telemetry, and long-lived offline or reconnected
clients. They can also emerge gradually in an otherwise straightforward
application as features and event sources multiply.

For state with a single, obvious owner—such as a local input or a small form—the
same ownership ideas can remain implicit. writ can be introduced where a clear
reader/writer split or explicit lifecycle adds value, without requiring an
application-wide migration.

## How writ works with other tools

writ focuses on ownership and lifecycle. Zustand, Redux, Jotai, Solid stores,
RxJS, and other substrates continue to provide storage, reactivity, selectors,
performance characteristics, and ecosystem tooling. Query and cache libraries
can continue to manage server state, and state-machine or actor runtimes can
continue to model richer transitions.

Adoption standardizes the API presented to owners and consumers; it does not
require moving state into a second store. The boundary is a capability and API
boundary rather than a security sandbox.

## Authority means…

- **Owner:** the domain object or module responsible for a store's policy and
  lifetime. It normally retains the writer capability.
- **Writer capability:** the object with writ mutation methods such as `set`,
  `spawn`, `update`, and `destroy`. Anyone holding it can use that authority.
- **Reader:** a separate object with observation methods such as `get` and
  `subscribe`, but no writ mutation method.
- **Command:** a narrow domain operation such as `sendMessage` or `blockUser`
  that an owner deliberately publishes instead of its raw writer.
- **Composition root:** a place where owners are constructed, external events
  are routed, and the public reader-and-command surface is assembled. An
  application may have multiple composition roots.

Ambient access is compatible with this model when it exposes the intentional
reader-and-command surface rather than raw writer capabilities.

## Practical boundaries

writ makes disciplined ownership easy and visible; it does not identify one
human or module as the owner at runtime. A writer can still be deliberately
exported, leaked, or passed to multiple callers, and every holder then shares
its authority. This is a capability and API boundary, not protection against
malicious code, `as any`, unsafe casts, reflection, or direct mutation of
values.

writ also does not provide deep runtime immutability. If `get()` returns a
mutable object, array, collection, or nested reference, a consumer can mutate
that value without a writ mutation method. Prefer immutable updates and expose
readonly state types at public reader boundaries.

Domain policy and command design remain application concerns. writ makes
authority and asserted entity existence visible so those decisions have a clear
place to live.

## Three separable pieces

writ-shaped state has three independent layers:

1. **Reactive substrate:** the built-in cell, Zustand, Redux, Solid, or another
   store supplies storage, subscriptions, selectors, and update propagation.
2. **Ownership topology:** a domain owner retains the write capability and
   controls when scoped store instances are created and disposed.
3. **Public surface:** consumers receive readers and narrow domain commands,
   rather than unrestricted store mutation.

The built-in cell is the batteries-included, zero-dependency adoption path. It
provides the contract directly when another substrate is unnecessary; it is not
a requirement to abandon an existing state library or its performance model.

## Install

```bash
npm install @redrixx/writ
# optional React bindings:
npm install @redrixx/writ-react
```

Both packages are **ESM-only**. CommonJS consumers must use dynamic `import()`.
The browser-compatible core has no Node-specific runtime requirement and no
runtime dependencies.

## The 60-second tour

### A writer-and-reader cell

The smallest unit creates one writer capability and its reader.

```ts
import { createCell } from "@redrixx/writ";

const count = createCell(0);

count.set((n) => n + 1); // the owner holds `count` and can write
export const counter = count.reader; // everyone else gets this

counter.get(); // 1
counter.subscribe(() => {
  /* re-read */
});
// counter.set  ← does not exist. Readers expose no writ mutation method.
```

### An entity collection with asserted existence

```ts
import { createEntityStore } from "@redrixx/writ";

const users = createEntityStore<{ name: string; online: boolean }>();

users.spawn("u1", { name: "Cody", online: true }); // birth — throws if already alive
users.update("u1", { online: false }); // patch — throws if absent
users.destroy("u1"); // death — throws if absent
```

Strict is the default, because a lifecycle you can't rely on isn't a lifecycle.
Leniency exists, but only as **named, explicit** opt-ins — never a silent flag:

```ts
users.upsert("u1", { name: "Cody", online: true }); // spawn-or-replace, never throws
users.destroyIfPresent("u1"); // no-throw death → boolean
```

And when strict throws, the error names its own escape hatch:

```
spawn("u1"): entity is already alive. Use upsert() to replace it.
```

### Ownership wired in one place

A composition root is a place where owners are constructed and their public
readers and commands are handed out. `createRegistry` lets the rest of the app
reach one intentionally wired surface without prop-drilling. An application can
have more than one composition root or registry.

```ts
// composition-root.ts
import { createEntityStore, createRegistry } from "@redrixx/writ";

export const app = createRegistry<AppState>("AppState");

export function bootstrap(events: EventSource) {
  const users = createEntityStore<User>();
  const rooms = createEntityStore<Room>();

  // this owner retains these writer capabilities
  events.on("join", (u) => users.upsert(u.id, u));
  events.on("leave", (u) => users.destroyIfPresent(u.id));

  app.register({ users: users.reader, rooms: rooms.reader }); // readers only leave here
}
```

```ts
// anywhere else — no writ mutation method is exposed
import { app } from "./composition-root.js";
const { users } = app.require();
```

## Scoped architecture: one store per channel

Dynamic scopes are where the ownership topology becomes especially useful. In
this example, a community owner lazily creates a channel owner on first access.
Each channel owner retains its writable message store, exposes a reader and a
narrow `sendMessage` command, routes realtime callbacks through itself, and is
explicitly disposed when the channel leaves scope.

```ts
import { createEntityStore, type EntityReader } from "@redrixx/writ";

type Message = Readonly<{
  id: string;
  channelId: string;
  body: string;
  pending: boolean;
}>;

type ChannelPublic = Readonly<{
  messages: EntityReader<Message>;
  sendMessage(body: string): void;
}>;

class ChannelOwner {
  readonly #messages = createEntityStore<Message>();
  readonly #unsubscribe: () => void;

  readonly public: ChannelPublic = {
    messages: this.#messages.reader,
    sendMessage: (body) => this.#sendMessage(body),
  };

  constructor(
    readonly id: string,
    realtime: RealtimeClient,
  ) {
    this.#unsubscribe = realtime.onMessage(id, (message) => {
      this.#messages.spawn(message.id, message);
    });
  }

  #sendMessage(body: string) {
    const id = crypto.randomUUID();
    this.#messages.spawn(id, { id, channelId: this.id, body, pending: true });
    // Route transport success/failure back through this owner as domain policy.
  }

  dispose() {
    this.#unsubscribe();
    this.#messages.clear();
  }
}

class CommunityOwner {
  readonly #channels = new Map<string, ChannelOwner>();

  constructor(
    readonly id: string,
    readonly realtime: RealtimeClient,
  ) {}

  channel(id: string): ChannelPublic {
    let owner = this.#channels.get(id);
    if (!owner) {
      owner = new ChannelOwner(id, this.realtime); // lazy scoped store creation
      this.#channels.set(id, owner);
    }
    return owner.public;
  }

  closeChannel(id: string) {
    const owner = this.#channels.get(id);
    if (!owner) return;
    owner.dispose();
    this.#channels.delete(id);
  }
}
```

The reactive substrate inside `ChannelOwner` could instead be a vanilla Zustand
store, Redux store, Solid store, or hand-rolled external store. The writ-shaped
decision is who retains its mutation capability, what consumers receive, and
when that scoped instance is disposed.

## React

`@redrixx/writ-react` is a thin binding: components subscribe as _readers_. The
hooks expose no writ mutation method; mutation normally lives on an owner or a
narrow command wired at a composition root.

```tsx
import { useEntities, useEntity } from "@redrixx/writ-react";

function Roster({ users }: { users: EntityReader<User> }) {
  const map = useEntities(users); // re-renders when the set changes
  return <>{[...map.values()].map((u) => u.name).join(", ")}</>;
}

function Status({ users, id }: { users: EntityReader<User>; id: string }) {
  const user = useEntity(users, id); // selective: only this entity
  return <span>{user?.online ? "🟢" : "⚪"}</span>;
}
```

Core is fully usable without React; the adapter is ~30 lines over
`useSyncExternalStore`.

## How does this work with a state library?

A well-structured Zustand, Redux, Jotai, Solid, or RxJS application can already
define strong module boundaries. writ makes one ownership and lifecycle shape
reusable across those choices: an owner retains the writer while most consumers
receive a reader and narrow commands, and entity operations use the same
explicit verbs. The underlying library still supplies storage, reactivity,
selectors, update propagation, DevTools, and ecosystem integrations.

See the [before/after demo](./apps/demo) — the same chat channel built as a god
hook and as writ, side by side.

For typechecked built-in, hand-rolled, Zustand, Redux Toolkit, and Solid
recipes, including fair native comparisons and dynamically scoped variants, see
[State libraries inside the writ shape](./apps/state-library-recipes).

## Anti-patterns

- **Exporting raw writers from owner modules.** Export readers and narrow domain
  commands; exporting the writer gives every importer its full authority.
- **Registering a root full of unrestricted stores.** A registry should publish
  the intended application surface, not relocate ambient mutation.
- **Turning a root into another god object.** Keep policy and lifetime with
  focused domain owners; use the root to assemble and connect them.
- **Moving local state into shared ownership without a concrete need.** Keep
  state close to its consumers and introduce writ where the ownership boundary
  is useful.
- **Allowing owners to reach into unrelated owners.** Route an explicit command
  or event across the boundary so the responsible owner retains its policy.
- **Defaulting to `upsert` because strict transitions exposed bugs.** Decide
  whether replay or replacement is valid before making a failure lenient.
- **Returning mutable collections through supposedly readonly APIs.** Reader
  handles remove writ mutation methods; readonly types and immutable values are
  still required for a meaningful public boundary.

## FAQ

### Why not just keep Zustand setters private?

A disciplined Zustand module can provide a strong boundary. writ makes that
shape portable and recognizable across stores and features: readers, writers,
lifecycle verbs, and scoped owners use the same vocabulary even when the
underlying state system changes.

### How is this different from Redux dispatch?

Redux already provides centralized transitions, actions, reducers, middleware,
and excellent tooling. writ does not replace those. The additional question is
who receives `dispatch`, who receives observation only, and who owns and
disposes dynamically scoped Redux store instances.

### How is this related to actors?

Both emphasize ownership and message-like commands. writ does not provide an
actor scheduler, mailbox, supervision tree, isolation, or a complete transition
runtime. It is a small capability and lifecycle layer that can be used inside an
actor-shaped architecture.

### Does writ replace my store?

No. Retain Zustand, Redux, Solid, or another substrate when it fits the
workload. Use the built-in cell when a small zero-dependency implementation is
sufficient. In either case, writ organizes ownership, lifecycle, and the public
reader/writer surface around the chosen substrate.

### Can I use it without React?

Yes. `@redrixx/writ` is framework-agnostic and has zero runtime dependencies.
`@redrixx/writ-react` is the currently shipped optional UI adapter.

### Can writ guarantee one human or module writer?

No. It creates one writer capability and a separate reader capability. The
writer can be exported or shared, and then every holder has authority. writ
makes disciplined ownership visible; it does not identify an owner at runtime.

### Is writ useful without strict entity lifecycle?

Potentially. The reader/writer split and ownership topology can stand alone, and
`createCell` has no entity lifecycle. For entity collections, strict operations
are the default while named lenient operations exist for legitimate replay,
replacement, and idempotency cases.

### What happens during HMR and tests?

Registries reject duplicate registration. Dispose scoped owners and
subscriptions, then call `reset()` before registering a replacement during HMR
or between tests. Prefer fresh owners and registries per test when practical so
state and subscription lifetime remain deterministic.

## Not yet supported (v0.1 non-goals)

Deliberately out of scope for now, to keep the core small and honest:

- **Other framework adapters** (Solid, Vue, Svelte). React only for now.
- **Devtools / entity-graph inspector.** On the roadmap, not in v0.1.
- **A persistence / sync story** beyond the injectable `Persistence` port. No
  built-in server sync, no conflict resolution, no offline queue.
- **SSR / server components.** Not designed or tested for it yet.
- **A plugin system.** No middleware or extension API.
- **Per-entity ownership transfer.** v0.1 authority is one owner per _store_
  (the whole collection of a type), not a transferable owner per entity id.

## Stability

Pre-1.0. The API is small and the shape is settling, but minor (`0.x`) releases
may still make breaking changes. Pin a version if that matters to you.

The [package contract](./docs/package-contract.md) documents capability and
subscription guarantees, strict and lenient lifecycle behavior, `clear()`
semantics, persistence errors, scoped disposal tests, and measured collection
size guidance.

See the [public API reference](./docs/api.md), [changelog](./CHANGELOG.md),
[support policy](./SUPPORT.md), [security policy](./SECURITY.md), and
[contribution guide](./CONTRIBUTING.md). The
[release-readiness checklist](./docs/release-checklist.md) records locally
verified gates and explicitly deferred release actions.

## Adoption guides

Start with [Should this feature use writ?](./docs/adoption/decision-tree.md),
then follow the relevant migration path:

- [From an ambient module store](./docs/adoption/from-ambient-store.md)
- [From a global Zustand store to scoped factories](./docs/adoption/from-global-zustand.md)
- [Where does this mutation belong?](./docs/adoption/where-does-this-mutation-belong.md)
- [Community → channel → message registry](./docs/adoption/dynamic-registry.md)
- [Testing strict lifecycle and event ordering](./docs/adoption/testing.md)
- [Terminology](./docs/adoption/terminology.md)

The [adoption index](./docs/adoption) connects the full set.

## Packages

| Package                                   | What it is                                                 |
| ----------------------------------------- | ---------------------------------------------------------- |
| [`@redrixx/writ`](./packages/core)        | The framework-agnostic runtime. Zero runtime dependencies. |
| [`@redrixx/writ-react`](./packages/react) | React bindings.                                            |

## License

[Apache-2.0](./LICENSE) © Cody Magnuson (Redrixx)
