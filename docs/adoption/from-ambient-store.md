# Migrate from an ambient module store

An ambient module often exports state and mutation functions from the same
singleton. The migration goal is not merely to rename those exports. It is to
choose an owner, retain mutation there, and publish a smaller surface.

## 1. Identify current writer paths

Search for setters, exported mutation functions, direct map/array mutation,
realtime callbacks, optimistic actions, persistence rehydration, and test reset
helpers. Make a table of operation, caller, target state, and intended policy.

Do not classify a path as legitimate merely because it exists. Duplicate paths
often reveal the ownership problem being migrated.

## 2. Choose an owner

Choose the smallest domain object responsible for the state’s policy and
lifetime—for example `ChannelOwner`, not a universal `AppState`. The owner must
be able to answer when the state starts, which external events affect it, and
when it is disposed.

## 3. Move store creation into the owner

Replace the module singleton with construction inside the owner or a factory.
Dynamic state should be constructed per tenant, community, channel, document,
session, or device rather than keyed inside one immortal global store.

```ts
class ChannelOwner {
  readonly #messages = createEntityStore<Readonly<Message>>();
}
```

## 4. Replace exported mutations with owner commands

Move raw writes behind methods named for domain intent: `sendMessage`,
`receiveMessage`, `acknowledgeMessage`, or `closeChannel`. Commands validate
policy and then use the retained writer.

Avoid recreating the old ambient surface as `owner.setMessages(...)`.

## 5. Export readers

Publish `Reader` or `EntityReader` handles for observation. Publish only the
commands consumers genuinely need. Use readonly state types and immutable
updates because reader values are not deep-frozen.

## 6. Route external events through the owner

Realtime, persistence, background jobs, and reconnect replay should call owner
methods. The owner chooses whether a live event is a strict `spawn`, whether a
replay is an `upsert`, and whether an event for a disposed scope is ignored.

## 7. Make entity birth and death explicit

Use `spawn` and `destroy` when duplicate creation or missing destruction is a
bug. Use `upsert` and `destroyIfPresent` only when replacement or idempotency is
part of the event contract. Let strict failures expose incorrect fixtures and
ordering before weakening them.

## 8. Add disposal and persistence deliberately

The owner must release subscriptions, timers, inflight work, and child owners.
Decide whether state is in-memory or persisted and when rehydration occurs.
Remember that `clear()` is an administrative reset, not a series of domain
deaths.

## Incremental rollout

Keep compatibility adapters at the edge while callers migrate, but do not let
new code import them. Add contract tests for the public reader/command surface,
then delete the ambient write exports once the last caller is moved.
