# Where does this mutation belong?

Use this guide during implementation and review whenever a contributor needs to
change shared state.

## Ask in order

1. **What domain invariant does the operation express?** Name the operation
   before choosing a store method: `memberJoined`, `messageAcknowledged`, or
   `deviceDisconnected`, not `setData`.
2. **Which owner is responsible for that invariant and state lifetime?** Put the
   mutation there. A UI component, transport callback, or persistence adapter is
   usually a source, not the owner.
3. **Does the caller need authority or only a command?** Most callers need a
   narrow command. Keep raw writers private.
4. **Is this birth, change, death, replacement, or reset?** Use strict lifecycle
   methods for asserted transitions. Use named leniency only when the event
   contract permits it. Treat `clear()` as administration/storage maintenance.
5. **Does this cross an ownership boundary?** Call the other owner’s public
   command or emit a routed domain event. Do not reach into its writer or store.
6. **What happens after disposal or during replay?** State whether the operation
   rejects, ignores, queues, or recreates the scope.

## Placement examples

| Mutation source     | Where it enters    | Where it belongs                                   |
| ------------------- | ------------------ | -------------------------------------------------- |
| Realtime message    | Transport callback | `ChannelOwner.receiveLiveMessage`                  |
| Reconnect duplicate | Replay coordinator | `ChannelOwner.replayMessage`                       |
| Optimistic send     | UI command         | `ChannelOwner.sendMessage`                         |
| Permission change   | Policy event       | `PermissionOwner.applyRoleChange`                  |
| Persistence load    | Bootstrap          | Owning scope’s `rehydrate` method                  |
| Test cleanup        | Test harness       | Owner/registry `dispose` or administrative `clear` |

## Review smells

- A component imports a writer or calls `setState` directly.
- A generic root accumulates unrelated mutation methods.
- One owner reads another owner’s private state to decide a write.
- A strict failure is replaced with `upsert` without documenting replay or
  replacement semantics.
- A supposedly readonly API returns mutable collections or objects.
- A keyed store is removed from a map without unsubscribing its external work.

The useful review question is not “which store contains this value?” It is “who
owns the policy and lifetime of changing it?”
