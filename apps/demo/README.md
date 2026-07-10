# Nexus demo — god hook vs. Nexus

The same chat channel (presence + typing + messages), driven by the same
simulated event stream, rendered by the same UI component — implemented twice.
Toggle between them:

- **God hook** (`src/godhook/`) — one `useChannel` owns everything. Its three
  pathologies are distilled faithfully from a real **~2097-line `useMessages`
  hook** (see below):
  - **Ambient module state** — messages live in `messageCache.ts`, a module-level
    store any file can read or wipe (the "Clear from outside the hook" button
    does exactly that).
  - **Cross-store authority** — visibility (blocked users) is decided by reaching
    into an unrelated `socialStore`, so "who can hide a message?" is split across
    two places.
  - **No boundary** — presence/typing setters are handed back to callers.
- **Nexus** (`src/nexus/`) — `presence`, `messages`, and the `blocked` set are all
  owned by one composition root (`channel.ts`). The server handler is the only
  writer; components get readers with no write path. Visibility policy is
  co-located with messages and toggled through the root's writer. Lifecycle is
  explicit: join → `upsert`, leave → `destroyIfPresent`, message → `spawn`.

The only difference between the two is **who has authority over the state**.

### Distilled from a real god hook

The god-hook side isn't a strawman. It mirrors the actual pre-Nexus `useMessages`
hook from Haven — ~2097 lines, a 23-dependency effect, four realtime
subscriptions, module-level `crossSessionMessageBundleByChannel` caches mutated
through exported functions, and ~77 reach-ins to `useSocialStore` /
`usePermissionsStore` / `useUserStatusStore`. It already used a state library
(zustand); storage was solved, and authority still wasn't. That's the point:
**state libraries manage storage; Nexus manages authority.**

## Run

```bash
npm install            # from the repo root
npm run demo           # vite dev server
# or: npm run demo:build && npm --workspace @redrixx/nexus-demo run preview
```

Vite aliases resolve `@redrixx/nexus` and `@redrixx/nexus-react` to their source,
so there is no build step for the packages — edit core and the demo hot-reloads.
