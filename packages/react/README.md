# @redrixx/nexus-react

React bindings for
[`@redrixx/nexus`](https://www.npmjs.com/package/@redrixx/nexus). Deliberately
thin: components subscribe as **readers**. The hooks expose no Nexus mutation
method; mutation normally lives on an owner or narrow command.

Nexus complements React state libraries rather than replacing them: those
libraries provide storage and reactivity, while Nexus organizes ownership, write
authority, scoped store lifetime, and entity lifecycle. It is intended for hot
shared state with many observers and external event sources, not forms or local
component state.

The framework-agnostic claim applies to the core package. This package is the
currently shipped official UI adapter and requires React 18 or newer. Its hooks
expose no Nexus mutation method; they do not deep-freeze returned values.

```bash
npm install @redrixx/nexus @redrixx/nexus-react
```

This package is **ESM-only**. It supports React 18 and newer and has no CommonJS
`require` entry point.

```tsx
import type { EntityReader } from "@redrixx/nexus";
import { useReader, useEntities, useEntity } from "@redrixx/nexus-react";

function Roster({ users }: { users: EntityReader<User> }) {
  const map = useEntities(users); // re-renders when the collection changes
  return <>{[...map.values()].map((u) => u.name).join(", ")}</>;
}

function Status({ users, id }: { users: EntityReader<User>; id: string }) {
  const user = useEntity(users, id); // selective: only re-renders for THIS entity
  return <span>{user?.online ? "🟢" : "⚪"}</span>;
}
```

- `useReader(reader)` — subscribe to any reader's value.
- `useEntities(reader)` — the live `ReadonlyMap` of an entity store.
- `useEntity(reader, id)` — a single entity; skips re-render when other entities
  change.

All three are built on `useSyncExternalStore`. Requires React 18+.

## License

[Apache-2.0](https://github.com/redrix-dev/nexus/blob/main/LICENSE) © Cody
Magnuson (Redrixx)
