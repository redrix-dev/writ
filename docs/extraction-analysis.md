# Nexus Extraction — Review & Analysis (v0.1)

_Source reviewed: `redrix-dev/haven` @ `87f657f`. Scaffold reviewed:
`redrix-dev/nexus` @ `124bbb5`._

## TL;DR — the uncomfortable finding

**There is no existing "runtime" sitting in Haven waiting to be lifted out.**
What Haven has is a **pattern** — one that is real, load-bearing, and genuinely
embodies the "authority over state" thesis — but today it is expressed as:

- a **convention** (per-domain `XxxNexus` classes),
- a **thin base class** (`apps/mobile/src/data/Nexus.ts`, ~156 lines,
  Zustand-coupled),
- a **type** that fakes the one-writer boundary (`ReadableStore` = a store
  handle with `setState` removed), and
- **ESLint rules** that stop UI code from reaching past the boundary.

So the extraction is **not** "copy the runtime, delete Haven imports." It is
**"crystallize the pattern into a small runtime that makes one-writer /
lifecycle / composition-root first-class primitives"** — the thing Haven only
enforces by discipline + lint. That reframing changes deliverable #1 from a port
into a small design job (which is good news: it means the core can be genuinely
small and clean, not a de-Haven-ing of legacy code).

The single highest-leverage improvement over Haven: replace "read-only _type_ +
private setState + eslint" with a **capability split** — creating an entity
store hands back a **writer** (the owner keeps it) and a **reader** (handed to
everyone else). Readers then have _no method_ to write. Authority becomes
structural instead of lint-enforced. That IS the product.

---

## 1. Public surface of "Nexus" as it exists in Haven

Haven runs the pattern on two platforms with two reactive substrates:

| Concern                    | Mobile (React Native)                                               | Desktop/Web (Solid)                                                              |
| -------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Reactive substrate         | vanilla `zustand`                                                   | Solid `createStore`                                                              |
| Entity base class          | `Nexus<T,R>` (`apps/mobile/src/data/Nexus.ts`)                      | none — each nexus holds a `createStore` directly                                 |
| Composition root           | `HavenReactCore`                                                    | `HavenSolidCore` (`packages/solid-client/src/core/HavenSolidCore.ts`, 490 lines) |
| Root construction          | `createReactHavenCore(opts)`                                        | `createSolidHavenCore(opts)`                                                     |
| Root registry (singleton)  | `havenCoreRegistry` (`require`/`reset`)                             | `havenSolidRef.ts` (`register`/`require`/`reset`/`get`)                          |
| Read boundary (one-writer) | `ReadableStore<S>` type + private `setState`                        | store proxy read-only by convention; writes via named methods                    |
| React read adapter         | `useStoreSelector` → `useStoreWithEqualityFn` (zustand/traditional) | components read projections directly (Solid)                                     |

### The recurring shape of one nexus (this is the "unit")

Every domain nexus, on both platforms, is the same five things in one file:

1. **Owns one store** (entity map + domain indexes), created in its constructor.
2. **Exposes reactive projections** (read side) — memoized selectors over
   `this.state`.
3. **Exposes named writes + lifecycle**
   (`load`/`ensureLoaded`/`upsertX`/`removeX`/ `clear`/`rehydrate`) — the _only_
   mutation path.
4. **Keeps `setState` private** — nothing outside the class can mutate.
5. **Calls pure `@shared` functions** for the actual thinking
   (projection/merge/filter).

Reference implementations to mirror:
`packages/solid-client/src/data/channels/channelSolidNexus.ts` (Solid template)
and `apps/mobile/src/data/channels/ChannelNexus.ts` (React template).

### The reusable primitives (what's actually generic)

Stripped of domain, these are the pieces worth extracting:

- **Entity map + CRUD** — `Record<id, NexusEntry<T>>` where
  `NexusEntry = { data, partial, cachedAt }`; ops `getOrCreate` / `getOrPartial`
  / `update` / `delete` / `has` / `getSnapshot` (`Nexus.ts`,
  `core/cache/entityTypes.ts`).
- **One-writer boundary** —
  `ReadableStore<S> = Pick<StoreApi<S>, "getState" | "getInitialState" | "subscribe">`
  (`packages/shared/src/nexus/storeTypes.ts`). This is the whole authority
  mechanism, and it's ~4 lines.
- **Persistence port** — `NexusPersistence { getString/set/remove }`
  (`core/persistence/NexusPersistence.ts`) + in-memory/localStorage adapters.
- **Composition-root registry** — `register` / `require` / `reset` / `get`
  singleton (`havenSolidRef.ts`, ~24 lines).
- **Framework-free event routing** — `routeRealtimeEvent(target, evt)` over a
  `RealtimeMutationTarget` interface. **Haven-specific in content**, but the
  _shape_ (a pure reducer that mutates through a narrow capability interface) is
  the pattern Nexus should teach.

---

## 2. Haven-specific couplings (what must NOT come across)

Ranked by how load-bearing they are:

1. **Zustand & Solid as the substrate.** `Nexus.ts` imports `zustand`; Solid
   nexuses import `solid-js/store`. Core must ship its **own** tiny vanilla
   store (getState / subscribe / private set) so "zero dependencies" is true and
   the React adapter is a `useSyncExternalStore` one-liner.
2. **Every composition root is 100% Haven domain.** `HavenSolidCore` news up
   `communities`, `channels`, `messages`, `voice`, `permissions`, … and
   orchestrates `bootstrapSession` phases, viewer-message-policy sync, Supabase
   realtime. None of this generalizes — it's the _example_ of a composition
   root, not the root itself.
3. **`RealtimeMutationTarget`** is Supabase/Haven event shapes end to end
   (`MessageBundle`, `LiveProfileIdentity`, community/channel/DM/report
   payloads). The _idea_ (route events through a narrow mutation capability) is
   portable; the interface is not.
4. **`NexusEntry.partial` / `cachedAt`** — the partial-hydration + cache-age
   model is a Haven data-fetching concern. Nexus core should treat entities as
   opaque values; partial/stale is a userland concern (or a v0.2 opt-in), not a
   core field.
5. **`revision` counter** — already vestigial in Haven (Solid ignores it; the
   recipe says "do not use it for reactivity"). Do not carry it over.
6. **Storage key convention** `haven:nexus:<type>:<instance>` and
   `NEXUS_STORAGE_KEYS` — Haven namespacing. Core takes a caller-supplied key.
7. **Backends / `sessionBackendRegistry` / `AppHost` / `ViewerMessagePolicy`** —
   entirely Haven. Not in scope.

**Haven-shaped assumptions to actively resist** (the acceptance test is "zero
Haven-shaped assumptions"):

- _"A nexus fetches from a backend."_ No — a nexus **owns state**. Fetching is
  one thing an owner might do. Core must not assume a `load()`/backend at all.
- _"One writer == one domain store."_ Haven enforces one-writer at the **store**
  granularity (the ChannelNexus owns _all_ channels; any holder can update any
  channel). The tagline says "every **entity** has exactly one owner." These are
  not the same claim — see Fork B below. Be honest about which one v0.1 ships.
- _"Realtime is part of the model."_ It isn't; it's an input source. Keep it out
  of core.

---

## 3. Proposed minimal framework-agnostic core API (sketch, for reaction)

Design goal: readable in a sitting (~500–800 LOC for core), zero deps, and the
authority model is **structural**.

```ts
// ── the read handle everyone else gets ───────────────────────────
export interface Reader<S> {
  get(): S;
  subscribe(listener: () => void): () => void; // returns unsubscribe
}

// ── an entity collection owned by exactly one writer ─────────────
export interface EntityReader<T> extends Reader<ReadonlyMap<string, T>> {
  getEntity(id: string): T | undefined;
  has(id: string): boolean;
}

export interface EntityOwner<T> {
  readonly reader: EntityReader<T>; // hand THIS out; it cannot write
  spawn(id: string, data: T): T; // birth  (throws if id already alive)
  update(id: string, patch: Partial<T>): void;
  destroy(id: string): void; // death
  clear(): void;
}

// The writer capability is the return value; the reader is a property of it.
// Whoever calls this is the owner. Everyone else only ever sees `.reader`.
export function createEntityStore<T>(opts?: {
  persistence?: Persistence;
  key?: string;
  serialize?: (all: ReadonlyMap<string, T>) => string;
}): EntityOwner<T>;

// ── composition-root registry (Haven's havenSolidRef, generalized) ─
export function createRegistry<T>(name: string): {
  register(instance: T): void;
  require(): T; // throws with a helpful message if unset
  get(): T | null;
  reset(): void;
};

// ── persistence port (Haven's NexusPersistence, unchanged) ────────
export interface Persistence {
  getString(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
export function createMemoryPersistence(): Persistence;
```

React adapter (separate package, deliberately boring):

```ts
export function useEntities<T>(reader: EntityReader<T>): ReadonlyMap<string, T>;
export function useEntity<T>(
  reader: EntityReader<T>,
  id: string,
): T | undefined;
export function useSelector<S, R>(reader: Reader<S>, select: (s: S) => R): R;
// all implemented via useSyncExternalStore over reader.subscribe/reader.get
```

**Why this delivers the thesis and Zustand/Jotai don't:** the write methods live
on the object the owner keeps; the object handed to readers (`.reader`) has no
write method to call. You cannot "reach around" the owner because there is
nothing to reach. Composition root = the one file where `createEntityStore()` is
called and the owners are wired together; `.reader`s are what leave that file.

### Design forks (need your call)

**Fork A — Reactive substrate.**

- (a) **Ship our own ~40-line vanilla store**, React adapter uses
  `useSyncExternalStore`. Makes "zero deps" literally true; core stays readable.
- (b) BYO-store: core wraps anything implementing `{get, subscribe}`.
- **Recommendation: (a).** The store is plumbing; the capability split is the
  product. Owning the store is what keeps the core self-contained and legible.

**Fork B — Authority granularity.**

- (a) **One-writer-per-store** (matches Haven exactly): the owner owns the whole
  collection of a type; simple, ships now.
- (b) **Per-entity ownership** (matches the tagline literally): each entity id
  has a transferable owner. Richer, no Haven precedent, materially more complex.
- **Recommendation: (a) for v0.1**, and soften the tagline to "every entity
  **collection** has exactly one owner," OR keep the tagline but scope
  per-entity authority to the roadmap. Shipping (b) now is the gold-plating trap
  — flagging it.

**Fork C — Does core know about lifecycle owners as a first-class object?**

- (a) `createEntityStore` returns the owner; the "composition root" stays a
  **documented pattern** + the registry helper. Minimal.
- (b) Add a `createComposition(build)` container that formalizes
  wiring/teardown.
- **Recommendation: (a).** Haven's root is a hand-written class; a container
  adds API surface without clear payoff at v0.1. Ship the pattern + registry,
  revisit later.

---

## 4. Proposed extraction order

Each step is independently shippable/testable — fast feedback, no big-bang.

1. **Persistence port + memory adapter.** Smallest, zero-risk, unblocks tests.
   (Direct lift of `NexusPersistence` + `createMemoryPersistence`.)
2. **Vanilla store + capability split** (`Reader` / writer). The heart. Prove
   one-writer structurally with a test that shows readers have no write method.
3. **Entity store** (`createEntityStore`: spawn/update/destroy/clear + entity
   map + optional persistence). Port CRUD semantics from `Nexus.ts`, drop
   `partial`/`cachedAt`/`revision`.
4. **Registry** (`createRegistry`) — lift `havenSolidRef.ts` generalized.
5. **React adapter package** — `useEntities`/`useEntity`/`useSelector` via
   `useSyncExternalStore`. Prove core works with zero adapter first.
6. **Before/after demo** — chat-channel-with-presence slice: god-hook version
   vs. Nexus version, side by side (presence = entities being born/dying, so
   lifecycle is visible). This is also the honesty check on the whole API.
7. **README that stands alone** + "Not yet supported" non-goals section.
8. **Publish** (scoped name — see below) + public repo + deployed demo.

---

## 5. Scaffold review (`redrix-dev/nexus`) vs. modern TS-library standards

The `tsconfig.json` is genuinely modern and good (nodenext, `declaration` +
`declarationMap` + `sourceMap`, `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `isolatedModules`, `verbatimModuleSyntax`,
`types: []`). Keep it. Two nits: `jsx: "react-jsx"` doesn't belong in a zero-dep
core tsconfig (move it to the React adapter's config), and there's no
`noEmit`-vs-emit split yet.

Everything else in the scaffold needs work before it can publish:

**`package.json` — blockers:**

- `"name": "nexus"` **cannot be published** — taken on npm (a deprecated GraphQL
  lib, `nexus@1.3.0`). Needs a scoped name, e.g. `@redrixx/nexus` /
  `@redrixx/nexus-core`, or a distinct unscoped name. **Decision needed.**
- `"version": "1.0.0"` — wrong signal for a pre-release. Start at `0.0.0` (or
  `0.1.0`).
- `"main": "index.js"` — points at a non-existent root JS file; build emits to
  `dist/`. A modern ESM lib needs an **`exports` map** + `types`, not `main`:
  ```jsonc
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "sideEffects": false,
  "engines": { "node": ">=20" }
  ```
- `"license": "ISC"` — and note Haven itself is **BUSL-1.1** (source-available,
  _not_ OSS). For an open-source package pick **MIT** or **Apache-2.0** and add
  a real `LICENSE` file. **Decision needed.** (Do not inherit Haven's BUSL.)
- Empty `description` / `author` / `keywords`.
- No test script (still the `exit 1` placeholder); no lint/format.

**`devDependencies`:**

- `typescript@^7.0.2` — that's the native (`tsgo`) compiler and it _is_
  installed. Not automatically wrong, but **verify declaration (`.d.ts`) emit is
  solid** before relying on it for a published lib; if `.d.ts`/`.d.ts.map`
  output is shaky, pin TS 5.x for the build and revisit. Flagging, not
  condemning.

**Repo structure:**

- Single package, but deliverables are **core + React adapter** with "core
  usable without the adapter." That wants either a **monorepo** (pnpm/npm
  workspaces: `packages/core`, `packages/react`) or a single package with a
  `./react` subpath export. **Recommendation: monorepo** — it makes "core has
  zero React dep" structural and mirrors how you already think (Haven is a
  workspace monorepo). **Decision needed.**
- `src/core/{parser,types,index}.ts` are **empty**, and `parser.ts` is a
  generated-template artifact (there's no parser here). Delete/replace with the
  real module layout (store / entity / registry / persistence).
- `src/index.ts` is a `hello()` placeholder.

**Missing hygiene (standard for a 2026 TS lib):**

- `LICENSE`, real `README`, `CHANGELOG`.
- CI workflow: typecheck + test + **`publint`** + **`@arethetypeswrong/cli`**
  (these two catch broken `exports`/types maps — the #1 way libs ship unusable).
- Test runner (**vitest**), linter/formatter (you already use eslint+prettier in
  Haven).
- `.gitignore` typo: `&.tsbuidinfo` → `*.tsbuildinfo`.
- On publish: `npm publish --provenance` from CI, `--access public` for a scoped
  name.

---

## Open decisions (blocking the build)

1. **Repo structure** — monorepo (core + react packages) vs single package w/
   `./react` subpath.
2. **Authority granularity** — one-writer-per-store (Haven-accurate) vs
   per-entity (tagline-literal).
3. **Reactive substrate** — ship-own vanilla store vs BYO-store adapter.
4. **Package name** — scoped name to use (npm `nexus` is taken).
5. **License** — MIT vs Apache-2.0 (not BUSL).
