# @redrixx/nexus

**State libraries manage storage. Nexus manages authority.**

Redux, Zustand, and Jotai answer _"where does state live and how do components
subscribe?"_ — they are storage plus subscription. Nexus answers a different
question: _"who has **authority** to mutate this state?"_

- **One writer, many readers.** Every piece of state has exactly one owner allowed
  to mutate it. Enforcement is _structural_, not convention: creating state hands
  back a **writer** (the owner keeps it) whose `reader` — the handle everyone else
  gets — has no method to write. You can't reach around the owner because there's
  nothing to reach.
- **Entity lifecycle.** Entities have explicit birth and death (spawn/destroy),
  owned by lifecycle owners.
- **Composition root.** Ownership is wired in one place. No ambient imports.

Zero dependencies. Plain TypeScript. Small enough to read in a sitting.

```ts
import { createCell } from "@redrixx/nexus";

const count = createCell(0);

// The owner keeps the writer and is the only one who can mutate:
count.set((n) => n + 1);

// Everyone else receives only the reader — get + subscribe, no write path:
export const counter = count.reader;
counter.get();               // 1
counter.subscribe(() => { /* re-read on change */ });
```

### React

`@redrixx/nexus-react` is a thin binding — components subscribe as _readers_.
There is no way to mutate a store from a hook; writes live on the owner, wired
at your composition root.

```tsx
import { createEntityStore } from "@redrixx/nexus";
import { useEntities, useEntity } from "@redrixx/nexus-react";

// owner (composition root)
const users = createEntityStore<User>();

// readers (components)
function Roster() {
  const users = useEntities(userReader);      // re-renders when the set changes
  return <>{[...users.values()].map((u) => u.name)}</>;
}

function Status({ id }: { id: string }) {
  const user = useEntity(userReader, id);      // selective: only this entity
  return <span>{user?.status}</span>;
}
```

## Status

**Pre-release (v0.1, in progress).** The core primitive (one-writer cell) and the
persistence port are in place. The entity store, the React adapter, and a
before/after demo are next. APIs may change until v0.1.0.

See [`SCOPE.md`](./SCOPE.md) for the decision log and roadmap, and
[`docs/extraction-analysis.md`](./docs/extraction-analysis.md) for the design
rationale.

## Not yet supported

A full non-goals section ships with v0.1. For now, explicitly out of scope:
Solid/other framework adapters, a devtools/entity-graph inspector, a
persistence/sync story beyond the injectable port, SSR, and a plugin system.

## License

[Apache-2.0](./LICENSE)
