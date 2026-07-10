# @redrixx/nexus

**State libraries manage storage. Nexus manages authority.**

Redux, Zustand, and Jotai answer _"where does state live and how do components
subscribe?"_ Nexus answers _"who is allowed to change this state?"_

- **One writer, many readers**, enforced structurally: creating state returns a
  **writer** (the owner keeps it) whose `reader` — handed to everyone else — has
  no method to write.
- **Explicit entity lifecycle**: `spawn` / `destroy`, strict by default.
- **One composition root**: ownership wired in one place, no ambient imports.

Zero dependencies. Framework-agnostic. Small enough to read in one sitting.

```bash
npm install @redrixx/nexus
```

## One-writer cell

```ts
import { createCell } from "@redrixx/nexus";

const count = createCell(0);
count.set((n) => n + 1);        // owner writes
export const counter = count.reader; // everyone else: get() + subscribe(), no set
```

## Entity store — strict lifecycle, explicit escape hatches

```ts
import { createEntityStore } from "@redrixx/nexus";

const users = createEntityStore<{ name: string; online: boolean }>();

users.spawn("u1", { name: "Cody", online: true }); // birth — throws if already alive
users.update("u1", { online: false });             // patch — throws if absent
users.destroy("u1");                               // death — throws if absent

users.upsert("u1", { name: "Cody", online: true }); // spawn-or-replace, never throws
users.destroyIfPresent("u1");                        // no-throw death → boolean
```

Strict throws name their own way out:
`spawn("u1"): entity is already alive. Use upsert() to replace it.`

## Composition root

```ts
import { createEntityStore, createRegistry } from "@redrixx/nexus";

export const app = createRegistry<{ users: EntityReader<User> }>("AppState");

export function bootstrap(events: EventSource) {
  const users = createEntityStore<User>();
  events.on("join", (u) => users.upsert(u.id, u));   // the one writer
  events.on("leave", (u) => users.destroyIfPresent(u.id));
  app.register({ users: users.reader });             // only readers leave here
}
```

## Optional persistence

Inject any synchronous key/value port; core imports no platform storage.

```ts
import { createEntityStore, createMemoryPersistence } from "@redrixx/nexus";

const store = createEntityStore<User>({
  persistence: createMemoryPersistence(), // or localStorage / MMKV / Tauri adapters
  key: "users",
});
store.rehydrate(); // load on boot; writes persist through automatically
```

## React

See [`@redrixx/nexus-react`](https://www.npmjs.com/package/@redrixx/nexus-react)
for `useReader` / `useEntities` / `useEntity`. Core is fully usable without it.

## Not yet supported (v0.1)

Other framework adapters · devtools/inspector · a sync story beyond the
injectable port · SSR · a plugin system · per-entity ownership transfer.

Pre-1.0: `0.x` releases may make breaking changes.

## License

[Apache-2.0](https://github.com/redrix-dev/nexus/blob/main/LICENSE) © Cody Magnuson (Redrixx)
