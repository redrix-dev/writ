# Nexus demo — god hook vs. Nexus

The same chat channel (presence + typing + messages), driven by the same
simulated event stream, rendered by the same UI component — implemented twice.
Toggle between them:

- **God hook** (`src/godhook/`) — one `useChannel` owns everything and hands its
  setters to callers. Authority is ambient; every consumer re-renders on every
  event; join/leave (birth/death) is buried in reducer bookkeeping.
- **Nexus** (`src/nexus/`) — `presence` and `messages` are entity stores wired in
  one composition root (`channel.ts`). The server handler is the only writer;
  components get readers with no write path. Lifecycle is explicit: join →
  `upsert`, leave → `destroyIfPresent`, message → `spawn`.

The only difference between the two is **who has authority over the state**.

## Run

```bash
npm install            # from the repo root
npm run demo           # vite dev server
# or: npm run demo:build && npm --workspace @redrixx/nexus-demo run preview
```

Vite aliases resolve `@redrixx/nexus` and `@redrixx/nexus-react` to their source,
so there is no build step for the packages — edit core and the demo hot-reloads.
