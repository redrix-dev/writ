# Nexus

**State libraries manage storage. Nexus manages authority.**

Redux, Zustand, and Jotai answer one question: _"where does state live, and how
do components subscribe to it?"_ They are storage plus subscription. Nexus
answers a different one: _"who is allowed to change this state?"_

```
State libraries          Nexus
─────────────────        ─────────────────
where state lives        who owns state
how you subscribe        who may mutate
                         when entities are born and die
```

- **One writer, many readers.** Every piece of state has exactly one owner
  allowed to mutate it — and that's enforced _structurally_, not by convention.
  Creating state hands back a **writer** (the owner keeps it) whose `reader` —
  the handle everyone else gets — has no method to write. You can't reach around
  the owner because there's nothing to reach.
- **Explicit entity lifecycle.** Entities have a real birth and death:
  `spawn` and `destroy`, strict by default, so "a thing appeared" and "a thing
  went away" are asserted transitions rather than incidental map edits.
- **One composition root.** Ownership is wired in exactly one place. No ambient
  imports of live state, no module-level singletons scattered across the app.

Zero dependencies. Framework-agnostic. Plain TypeScript, small enough to read in
one sitting.

> Tagline: _State libraries manage storage. Nexus manages authority._

## Install

```bash
npm install @redrixx/nexus
# optional React bindings:
npm install @redrixx/nexus-react
```

## The 60-second tour

### A one-writer cell

The smallest unit: state with exactly one writer.

```ts
import { createCell } from "@redrixx/nexus";

const count = createCell(0);

count.set((n) => n + 1);   // the owner holds `count` and can write
export const counter = count.reader;   // everyone else gets this

counter.get();                          // 1
counter.subscribe(() => { /* re-read */ });
// counter.set  ← does not exist. There is no write path on a reader.
```

### An entity collection with a lifecycle

```ts
import { createEntityStore } from "@redrixx/nexus";

const users = createEntityStore<{ name: string; online: boolean }>();

users.spawn("u1", { name: "Cody", online: true }); // birth — throws if already alive
users.update("u1", { online: false });             // patch — throws if absent
users.destroy("u1");                                // death — throws if absent
```

Strict is the default, because a lifecycle you can't rely on isn't a lifecycle.
Leniency exists, but only as **named, explicit** opt-ins — never a silent flag:

```ts
users.upsert("u1", { name: "Cody", online: true }); // spawn-or-replace, never throws
users.destroyIfPresent("u1");                        // no-throw death → boolean
```

And when strict throws, the error names its own escape hatch:

```
spawn("u1"): entity is already alive. Use upsert() to replace it.
```

### Ownership wired in one place

The composition root is the single file where owners are constructed and their
readers handed out. `createRegistry` lets the rest of the app reach the wired
instance without prop-drilling or importing the live object.

```ts
// composition-root.ts
import { createEntityStore, createRegistry } from "@redrixx/nexus";

export const app = createRegistry<AppState>("AppState");

export function bootstrap(events: EventSource) {
  const users = createEntityStore<User>();
  const rooms = createEntityStore<Room>();

  // one writer: only this wiring mutates the stores
  events.on("join", (u) => users.upsert(u.id, u));
  events.on("leave", (u) => users.destroyIfPresent(u.id));

  app.register({ users: users.reader, rooms: rooms.reader }); // readers only leave here
}
```

```ts
// anywhere else — read-only, cannot mutate
import { app } from "./composition-root.js";
const { users } = app.require();
```

## React

`@redrixx/nexus-react` is a thin binding: components subscribe as _readers_.
There is no write path in a hook — mutation lives on the owner, at your
composition root.

```tsx
import { useEntities, useEntity } from "@redrixx/nexus-react";

function Roster({ users }: { users: EntityReader<User> }) {
  const map = useEntities(users);            // re-renders when the set changes
  return <>{[...map.values()].map((u) => u.name).join(", ")}</>;
}

function Status({ users, id }: { users: EntityReader<User>; id: string }) {
  const user = useEntity(users, id);         // selective: only this entity
  return <span>{user?.online ? "🟢" : "⚪"}</span>;
}
```

Core is fully usable without React; the adapter is ~30 lines over
`useSyncExternalStore`.

## How is this different from a state library?

You can hold a Zustand store, read it anywhere, and write it anywhere — authority
is ambient. Nexus inverts that: a store is created by an owner, and only a
`reader` is shared. The type system and the runtime both refuse writes from
anywhere but the owner. Use a state library to decide _where state lives_; use
Nexus to decide _who is in charge of it_. They are not competitors so much as
answers to different questions — and for apps where "who changed this?" is the
hard bug, authority is the missing primitive.

See the [before/after demo](./apps/demo) — the same chat channel built as a god
hook and as Nexus, side by side.

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

## Packages

| Package | What it is |
| --- | --- |
| [`@redrixx/nexus`](./packages/core) | The runtime. Zero dependencies. |
| [`@redrixx/nexus-react`](./packages/react) | React bindings. |

## License

[Apache-2.0](./LICENSE) © Cody Magnuson (Redrixx)
