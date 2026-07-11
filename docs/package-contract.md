# Package contract

This document states what `@redrixx/writ` guarantees in v0.1, what it reports,
and where the boundary ends.

The contract standardizes ownership, reader/writer surfaces, subscriptions, and
entity lifecycle. A host may use the built-in zero-dependency cell or preserve
the storage, reactivity, selectors, tooling, and performance behavior of another
state substrate. The typechecked recipes demonstrate that layered model; they do
not duplicate the substrate's responsibilities.

## Capability surface

- `createCell` creates one `Writer` capability and one separate `Reader`.
- `createEntityStore` creates one `EntityStore` capability and one separate
  `EntityReader`.
- Readers expose observation only. They do not contain `set`, `setState`, raw
  store mutation, entity lifecycle, persistence, or reset methods.
- Sharing a writer shares authority. writ does not identify one human or module
  owner at runtime.
- Values returned by readers are not deep-frozen. Use readonly public types and
  immutable updates when mutable references would weaken the boundary.

These claims are enforced by compile-time key assertions and runtime object
surface tests.

## Entity lifecycle

Strict operations are synchronous and asserted:

- `spawn(id, value)` throws when `id` is present and leaves state unchanged.
- `update(id, patch)` throws when `id` is absent and leaves state unchanged.
- `destroy(id)` throws when `id` is absent and leaves state unchanged.

Failed strict operations do not notify subscribers or attempt persistence.

Named lenient operations are deliberate alternatives:

- `upsert` performs full spawn-or-replace.
- `destroyIfPresent` returns whether an entity was removed.

`clear()` is an administrative reset and storage-maintenance operation. It
empties the collection in one notification and removes persisted state. It does
not represent or emit one asserted death transition per entity. Use `destroy`
when individual domain deaths matter.

## Persistence and errors

- Supplying persistence without a key throws during construction.
- Serialization or persistence write failures are warned and swallowed after the
  in-memory commit. writ does not roll memory back when durable storage is
  unavailable.
- Missing persisted data is a no-op.
- Invalid persisted data is warned, removed from persistence, and does not
  replace current memory state.
- Persistence is synchronous. Slow serialization or storage blocks the caller.
- Strict lifecycle errors include the relevant named escape hatch.

## Subscription contract

`Reader` provides a synchronous `get()` snapshot and `subscribe(listener)` that
returns an idempotent cleanup function. A committed change notifies current
subscribers synchronously. Cleanup prevents future notification.

The same behavior suite runs against the built-in cell and entity projection.
Typechecked recipes show the ownership shape over third-party substrates, but
the core does not yet publish a generic adapter interface or claim formal
compatibility guarantees for those libraries.

## Scoped owners and disposal

writ does not currently ship a generic keyed-owner registry. The typechecked
recipes demonstrate and test the intended composition pattern: lazily construct
one owner per key, return the same instance while active, unsubscribe and clear
on close, delete the instance, and create a fresh owner if the key returns.

Tests cover this lifecycle for the built-in store and the writ-shaped Zustand
recipe, including 500 repeated scope creation/destruction cycles with no live
realtime subscriptions left behind.

## Expected operating range

These limits describe the batteries-included entity store, not the ownership and
lifecycle model when layered over another substrate. Built-in entity writes copy
the collection and are `O(n)`. Configured write-through persistence also
serializes the full collection synchronously on every write. The intended v0.1
built-in workload is scoped owner collections in the hundreds to low thousands,
where writes are meaningful domain events rather than a per-frame stream.
Collections around 10,000 entities or sustained high-frequency writes should be
measured in the target runtime; another substrate may be more appropriate while
retaining the same writ ownership shape.

Run the local measurement with:

```bash
npm run benchmark:contract
```

The benchmark reports 100 in-memory updates and 20 write-through persisted
updates at 100, 1,000, and 10,000 entities. Results are machine-specific and are
evidence for operating-range decisions, not a throughput claim.

Indicative local result on 2026-07-10 (Windows, Node.js; warm process):

| Entities | 100 in-memory updates | 20 persisted updates |
| -------: | --------------------: | -------------------: |
|      100 |               3.40 ms |              0.75 ms |
|    1,000 |               4.41 ms |              3.52 ms |
|   10,000 |              77.16 ms |             47.99 ms |

The shape matters more than these absolute numbers: copy-on-write and full
serialization become visibly expensive at 10,000 entities. Repeat the command on
the target device and storage adapter before choosing an operating limit.
