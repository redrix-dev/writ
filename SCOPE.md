# SCOPE.md — Nexus v0.1

Running log of decisions made and things deferred, so sessions stay resumable.
Full analysis: [`docs/extraction-analysis.md`](./docs/extraction-analysis.md).

## The thesis (do not drift from this)
State libs (Redux/Zustand/Jotai) = storage + subscription. Nexus = **authority**:
one-writer/many-readers, explicit entity lifecycle (spawn/destroy), ownership wired
in one composition root. "State libraries manage storage. Nexus manages authority."

## Key finding (2026-07-10)
Haven has a **pattern**, not a liftable runtime. One-writer is enforced today by a
read-only *type* (`ReadableStore`) + private `setState` + ESLint. The extraction's
job is to make it **structural**: `createEntityStore()` returns a **writer** (owner
keeps) whose `.reader` (handed out) has *no write method*. Authority in code, not lint.

## Decisions made
- **Extraction is a small design job, not a port.** Crystallize the pattern; don't
  drag `HavenSolidCore`/`RealtimeMutationTarget`/backends across.
- **Core ships its own tiny vanilla store** (zero deps); React adapter uses
  `useSyncExternalStore`. _(recommendation — confirm via Fork A)_
- **Drop from the Haven model:** `revision` (vestigial), `NexusEntry.partial` +
  `cachedAt` (Haven fetch concern), Zustand/Solid substrate, storage-key namespacing,
  all realtime/backend/policy code.
- **Keep from Haven:** `NexusPersistence` port + memory/localStorage adapters; the
  registry singleton (`register`/`require`/`reset`/`get`); the one-nexus file shape
  (owns store → projections → named writes → calls pure fns).
- **License is NOT BUSL.** Haven is BUSL-1.1 (source-available); the OSS package is
  MIT or Apache-2.0. _(pick one — open decision #5)_

## Open decisions (BLOCKING — need Cody's call)
1. **Repo structure:** monorepo (`packages/core` + `packages/react`) vs single pkg w/
   `./react` subpath. → rec: monorepo.
2. **Authority granularity:** one-writer-per-**store** (Haven-accurate) vs
   per-**entity** (tagline-literal). → rec: per-store for v0.1, soften tagline or
   roadmap per-entity.
3. **Reactive substrate:** ship-own vanilla store vs BYO-store adapter. → rec: ship-own.
4. **Package name:** npm `nexus` is TAKEN (deprecated GraphQL lib). Need scoped name,
   e.g. `@redrixx/nexus`. → open.
5. **License:** MIT vs Apache-2.0. → open.

## Extraction order (each step independently shippable)
1. Persistence port + memory adapter
2. Vanilla store + capability split (one-writer, structural)
3. Entity store (spawn/update/destroy/clear)
4. Registry (`createRegistry`)
5. React adapter (`useEntities`/`useEntity`/`useSelector`)
6. Before/after demo (chat channel + presence = visible entity birth/death)
7. Standalone README + "Not yet supported" section
8. Publish (scoped name) + public repo + deployed demo

## Scaffold fixes queued (redrix-dev/nexus)
- `package.json`: real name (scoped), `version` → 0.x, replace `main` with `exports`
  map + `types` + `files` + `sideEffects:false` + `engines`; real
  description/keywords/license; test/lint scripts.
- Delete template cruft: empty `src/core/{parser,types,index}.ts`, `hello()` in index.
- Add: `LICENSE`, README, CI (typecheck/test/**publint**/**attw**), vitest, eslint/prettier.
- `.gitignore` typo `&.tsbuidinfo` → `*.tsbuildinfo`.
- `tsconfig`: drop `jsx:"react-jsx"` from core (belongs to react adapter only).
- Verify TS 7 (`tsgo`) `.d.ts` emit before trusting it for publish; else pin TS 5.x.
- `tsconfig.json` base is otherwise modern — keep it.

## NON-goals for v0.1 (do not build)
Solid adapter · devtools/inspector · persistence/sync story · SSR · plugin system.
Per-entity authority (Fork B option b) is also deferred unless decision #2 flips.

## Deferred / v0.2+ ideas
- Per-entity transferable ownership.
- Framework-free event-routing helper (Haven's `routeRealtimeEvent` shape, de-Haven'd).
- `partial`/stale-entity model as an opt-in.
- `createComposition` container (Fork C option b).
