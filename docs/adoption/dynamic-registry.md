# Community → channel → message ownership

The complete typechecked implementation is
[`community-channel-registry.ts`](../../apps/state-library-recipes/src/community-channel-registry.ts).

```text
AppOwner
└── CommunityOwner (lazy per community)
    └── ChannelOwner (lazy per channel)
        ├── EntityStore<Message> writer
        ├── realtime subscription
        └── public: EntityReader<Message> + send command
```

## Construction

`AppOwner.community(id)` lazily constructs a `CommunityOwner` and returns its
public surface. `CommunityOwner.channel(id)` does the same for `ChannelOwner`.
Repeated access returns the same surface while the scope is active.

The internal maps are ownership indexes, not public service locators. Consumers
cannot enumerate them or obtain child writers.

## Public surface

```ts
type ChannelSurface = Readonly<{
  messages: EntityReader<Message>;
  send(body: string): Promise<void>;
}>;
```

The channel retains its writable entity store. Components observe messages and
invoke `send`; they do not receive `spawn`, `update`, `destroy`, or raw storage.

## Event routing

Live realtime delivery calls strict `spawn` because a duplicate live message is
evidence of incorrect routing. Reconnect replay has a separate `replay` method
using `upsert`, where replacement is deliberate. The distinction remains visible
at the call site.

## Disposal

- `closeChannel` disposes the channel subscription, clears administrative
  in-memory state, and deletes the child owner.
- `leaveCommunity` disposes every channel before deleting the community owner.
- `AppOwner.dispose` tears down the complete graph.

Tests prove lazy construction, stable active identity, optimistic command
routing, recursive cleanup, empty reader state after disposal, and fresh owner
creation when a community returns.

For production, add cancellation for inflight requests, decide persistence per
scope, and make commands reject after disposal as the example does.
