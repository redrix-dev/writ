# Testing strict lifecycle and event ordering

Strict lifecycle failures are useful test evidence. They expose fixtures that
create the same entity twice, events delivered before their parent scope exists,
cleanup performed more than once, and replay accidentally routed through a live
event path.

## Test transitions, not only final snapshots

```ts
const messages = createEntityStore<Message>();
messages.spawn("m1", message);

expect(() => messages.spawn("m1", message)).toThrow(/already alive/);
expect(messages.reader.getEntity("m1")).toBe(message);
```

Also assert that failed strict operations do not notify subscribers, mutate
memory, or write persistence.

## Keep replay explicit

Use separate fixtures for live delivery and replay:

- Live `message.created` → `spawn`; duplicate means routing/order is wrong.
- Reconnect snapshot → `upsert`; duplicate replacement is expected.
- Live `message.deleted` → `destroy`; missing entity means ordering is wrong.
- Idempotent cleanup → `destroyIfPresent`; absence is expected.

Do not switch the production path to `upsert` merely to make a fixture pass.
Correct the fixture or document why the operation is truly lenient.

## Test scoped lifetime

For every keyed owner registry, verify:

1. No instance or subscription exists before first access.
2. Repeated access returns the active instance.
3. Closing unsubscribes external sources and deletes the instance.
4. Parent disposal recursively disposes children.
5. Access after close creates a fresh instance.
6. Late callbacks after disposal cannot mutate state.

## HMR and test isolation

Prefer fresh registries and owners per test. If a module registry is necessary,
dispose the current graph and call `reset()` between tests or before HMR
replacement. Duplicate registry registration should remain a failure—it catches
leaked test state and accidental second roots.

## Mutable references

Reader handles do not deep-freeze values. Add tests for readonly domain types
and immutable updates at public boundaries when nested mutation would violate
the feature contract.
