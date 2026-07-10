# @redrixx/nexus-react

React bindings for [`@redrixx/nexus`](https://www.npmjs.com/package/@redrixx/nexus).
Deliberately thin: components subscribe as **readers**. There is no write path in
a hook — mutation lives on the owner, wired at your composition root.

```bash
npm install @redrixx/nexus @redrixx/nexus-react
```

```tsx
import type { EntityReader } from "@redrixx/nexus";
import { useReader, useEntities, useEntity } from "@redrixx/nexus-react";

function Roster({ users }: { users: EntityReader<User> }) {
  const map = useEntities(users);        // re-renders when the collection changes
  return <>{[...map.values()].map((u) => u.name).join(", ")}</>;
}

function Status({ users, id }: { users: EntityReader<User>; id: string }) {
  const user = useEntity(users, id);     // selective: only re-renders for THIS entity
  return <span>{user?.online ? "🟢" : "⚪"}</span>;
}
```

- `useReader(reader)` — subscribe to any reader's value.
- `useEntities(reader)` — the live `ReadonlyMap` of an entity store.
- `useEntity(reader, id)` — a single entity; skips re-render when other entities change.

All three are built on `useSyncExternalStore`. Requires React 18+.

## License

[Apache-2.0](https://github.com/redrix-dev/nexus/blob/main/LICENSE) © Cody Magnuson (Redrixx)
