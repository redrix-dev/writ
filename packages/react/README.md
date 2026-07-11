# @redrixx/writ-react

React bindings for
[`@redrixx/writ`](https://www.npmjs.com/package/@redrixx/writ). Deliberately
thin: components subscribe as **readers**. The hooks expose no writ mutation
method; mutation normally lives on an owner or narrow command.

writ layers a shared ownership and lifecycle API over React state libraries
rather than replacing them. Those libraries retain storage, reactivity,
selectors, tooling, and performance behavior; writ makes reader/writer surfaces,
scoped store lifetime, and entity lifecycle consistent across them.

The framework-agnostic claim applies to the core package. This package is the
currently shipped official UI adapter and requires React 18 or newer. Its hooks
expose no writ mutation method; they do not deep-freeze returned values.

```bash
npm install @redrixx/writ @redrixx/writ-react
```

This package is **ESM-only**. It supports React 18 and newer and has no CommonJS
`require` entry point.

```tsx
import type { EntityReader } from "@redrixx/writ";
import { useReader, useEntities, useEntity } from "@redrixx/writ-react";

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

[Apache-2.0](https://github.com/redrix-dev/writ/blob/main/LICENSE) © Cody
Magnuson (Redrixx)
