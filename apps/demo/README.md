# writ evidence lab

The demo runs one deterministic domain scenario across three implementation
views:

1. **Ambient / historical** — the failure shape distilled from Haven's real
   ~2,097-line god hook: module state, cross-store reach-ins, and exported
   writes.
2. **Disciplined native store** — a fair alternative with private mutation and
   named actions.
3. **writ-shaped** — owners retain writers while consumers receive observation
   and narrow commands.

Every view receives the same multi-community event stream and renders the same
channel UI. The stream includes dynamically opened and closed channel scopes,
presence, messages, blocked-user visibility policy, optimistic sends,
persistence, reconnect replay, and deterministic disposal.

The evidence panels expose:

- Event sources, owner boundary, store instances, observers, and command paths.
- Event source, target scope, requested operation, owner, lifecycle transition,
  accepted/rejected/ignored result, and notified subscribers.
- Active, persisted, in-memory, and disposed scoped stores.
- Duplicate spawn, missing update, repeated destroy, reader-write, and
  deliberate writer-leak probes.
- The actual public surface for each implementation view.
- What writ did not solve.

Render counts are deliberately not the headline. The demo focuses on mutation
surface, ownership topology, dynamic scope, lifecycle, and invalid transitions.

## Run

```bash
npm install
npm run demo
# or: npm run demo:build && npm --workspace @redrixx/writ-demo run preview
```

Vite resolves the local writ packages from source, so package builds are not
required during demo development.
