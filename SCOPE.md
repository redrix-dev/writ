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

## Decided (2026-07-10, Cody)
1. **Repo structure:** MONOREPO — `packages/core` (zero deps, zero React) + `packages/react`.
2. **Authority granularity:** PER-STORE owner for v0.1. → tagline must say "every entity
   **collection** has one owner," or per-entity authority goes on the roadmap. (revisit in README pass)
3. **Reactive substrate:** SHIP OUR OWN ~40-line vanilla store; React adapter = `useSyncExternalStore`.
4. **License:** APACHE-2.0 (LICENSE + NOTICE, per-file headers optional). NOT BUSL.

5. **Package name:** `@redrixx/nexus` (scope confirmed free — 0 packages under it). Cody
   to claim the `redrixx` npm account before first publish (free, no domain needed; step 8).

## Build progress
- **Steps 1–2 DONE** (2026-07-10): monorepo scaffold + `packages/core` with the
  persistence port (`Persistence` + `createMemoryPersistence`) and the vanilla store
  + capability split (`createCell` → `Writer` w/ private `set`, `Reader` = get/subscribe).
  One-writer proven structurally in tests (reader has no write method). 16 tests green,
  typecheck clean, build emits `.d.ts`/`.d.ts.map`/`.js`/`.js.map`.
- **TS 7 (`tsgo`) verdict: KEEP.** `typescript@7.0.2` builds + emits declarations cleanly;
  the SCOPE risk is cleared. No need to pin 5.x.
- **Step 3 DONE** (2026-07-10): `createEntityStore` — strict lifecycle by default
  (`spawn` throws if alive; `update`/`destroy` throw if absent), explicit named escape
  hatches (`upsert`, `destroyIfPresent`), each strict error naming its escape hatch.
  Copy-on-write `ReadonlyMap` so readers/`useSyncExternalStore` see every change.
  Optional persistence (write-through auto-persist + `rehydrate`, key required when
  persistence set, corrupt-data recovery). Authority proven structural (reader has no
  lifecycle methods). 33 tests green. **Design principle locked (Cody): "authority with
  configuration" — strict default, escape hatches are explicit, named, non-footgun opt-ins.**
- Added host-agnostic `warn` helper (reaches `console` via `globalThis`, no DOM/Node dep
  in shipped build). `@types/node` is dev-only; `tsconfig.build.json` keeps `types: []`
  so declarations stay host-agnostic (verified: no node refs in dist `.d.ts`).
- **Step 4 DONE** (2026-07-10): `createRegistry(name)` — composition-root singleton.
  `register` is strict (throws on double-register, naming `reset()` as the explicit
  re-register path — same "explicit over silent" principle; catches stray-second-root
  hijack). `require`/`get`/`reset`. Boxed slot so a nullish instance still counts as
  registered. Independent per call. 8 tests.
- **CORE FEATURE-COMPLETE for v0.1** (41 tests): cell (one-writer) · entity store
  (strict lifecycle) · registry (composition root) · persistence port. Zero deps,
  host-agnostic build.
- **NEXT → step 5: React adapter** (`packages/react`, new package). Ship `useReader`,
  `useEntities`, `useEntity` over `useSyncExternalStore`. `useSelector` (derived values)
  deferred — footgun-prone (getSnapshot caching); the demo will say if it's needed.

## Deferred (perf/ergonomics, not v0.1 blockers)
- Copy-on-write is O(n)/write. Fine for lifecycle-owner entity counts; add batched/
  structural-sharing path only if a real workload needs it.
- Write-through auto-persist calls `JSON.stringify` per mutation. Add debounce/microtask
  batching if it shows up as hot. Explicit `persist()` already exists as the manual path.
- `patchIfPresent` (lenient update escape hatch) intentionally omitted — guard with
  `reader.has(id)` for now; add only if the demo proves it common.

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
