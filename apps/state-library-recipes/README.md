# State libraries inside the Nexus shape

These typechecked recipes use one scenario throughout: realtime messages in
dynamically scoped community channels. They are informed by Haven's production
patterns:

- React/mobile keeps vanilla Zustand mutation behind domain classes and lazily
  creates one community message owner per community.
- Solid keeps its native `createStore` proxy, private path-based setter, tracked
  projections, and named domain writes—without a subscribe/notify adapter.
- The session core owns these objects, routes realtime events, and clears them
  deterministically.

Reference implementations inspected in Haven:

- [`apps/mobile/src/data/Nexus.ts`](https://github.com/redrix-dev/haven/blob/main/apps/mobile/src/data/Nexus.ts)—lazy
  base store construction and persistence ownership.
- [`apps/mobile/src/data/channels/ChannelNexus.ts`](https://github.com/redrix-dev/haven/blob/main/apps/mobile/src/data/channels/ChannelNexus.ts)—protected
  vanilla Zustand store and observation-only public handle.
- [`apps/mobile/src/data/messages/registry.ts`](https://github.com/redrix-dev/haven/blob/main/apps/mobile/src/data/messages/registry.ts)—lazy
  per-community instances and explicit clearing.
- [`packages/solid-client/src/data/channels/channelSolidNexus.ts`](https://github.com/redrix-dev/haven/blob/main/packages/solid-client/src/data/channels/channelSolidNexus.ts)—native
  Solid proxy, tracked projections, and private path-based writes.
- [`packages/solid-client/src/data/messages/registry.ts`](https://github.com/redrix-dev/haven/blob/main/packages/solid-client/src/data/messages/registry.ts)—the
  equivalent lazy Solid scope registry.
- [`HavenReactCore`](https://github.com/redrix-dev/haven/blob/main/apps/mobile/src/data/core/HavenReactCore.ts)
  and
  [`HavenSolidCore`](https://github.com/redrix-dev/haven/blob/main/packages/solid-client/src/core/HavenSolidCore.ts)—session
  ownership, event routing, and deterministic cleanup.

The examples preserve what each ecosystem already does well. Nexus-shaped means
making an additional ownership decision: who retains mutation, who observes,
which commands cross the boundary, when scoped instances exist, and how they are
disposed. It does not mean wrapping every library in `@redrixx/nexus`.

## Built-in cell and entity store

[`builtin.ts`](./src/builtin.ts) is the zero-dependency default and reference
implementation. The channel owner retains `EntityStore`; consumers receive its
`EntityReader`, and disposal removes the realtime subscription and state.

| Concern                     | Native approach                | Nexus-shaped approach                                  |
| --------------------------- | ------------------------------ | ------------------------------------------------------ |
| Setup ceremony              | Small built-in store           | Owner class plus reader boundary                       |
| Subscription/reactivity     | `get` + `subscribe`            | Same                                                   |
| Mutation mechanism          | `spawn` / `update` / `destroy` | Retained by owner                                      |
| Mutation authority          | Anyone with the store          | Consumers receive reader only                          |
| Dynamic scoping             | Construct stores directly      | Construct per channel owner                            |
| Entity lifecycle assertions | Strict by default              | Owner chooses strict/lenient operation                 |
| Disposal                    | Application-managed            | Owner unsubscribes and clears                          |
| DevTools/ecosystem support  | Minimal                        | Minimal                                                |
| Best reason to choose it    | Tiny zero-dependency core      | Explicit capabilities without another store dependency |

## Hand-rolled external store

[`external-store.ts`](./src/external-store.ts) shows the minimum `get`,
`subscribe`, and `set` machinery. It makes clear that the capability split is a
small object-shape decision, not magic hidden in a framework.

| Concern                     | Native approach                        | Nexus-shaped approach                             |
| --------------------------- | -------------------------------------- | ------------------------------------------------- |
| Setup ceremony              | Implement listeners and snapshots      | Split writer from exported reader                 |
| Subscription/reactivity     | Manual listener set                    | Same reader contract                              |
| Mutation mechanism          | `set`                                  | Owner retains `set`                               |
| Mutation authority          | Whatever object is exported            | Reader omits `set`                                |
| Dynamic scoping             | Factory calls                          | Owner/factory per scope                           |
| Entity lifecycle assertions | None unless implemented                | Add domain methods or Nexus entity store          |
| Disposal                    | Clear listeners/subscriptions manually | Scope owner coordinates cleanup                   |
| DevTools/ecosystem support  | None                                   | None added                                        |
| Best reason to choose it    | Exact minimal behavior                 | Understand the boundary before adding abstraction |

## Vanilla Zustand, normal conventions

[`zustand-vanilla.ts`](./src/zustand-vanilla.ts) uses `createStore`, colocated
actions, and a selector in ordinary Zustand style. This is a capable native
baseline, not a deliberately weak alternative.

| Concern                     | Native approach                         | Nexus-shaped approach                                  |
| --------------------------- | --------------------------------------- | ------------------------------------------------------ |
| Setup ceremony              | Store factory with colocated actions    | Additional owner/public-surface types                  |
| Subscription/reactivity     | Zustand selectors and subscriptions     | Keep them unchanged                                    |
| Mutation mechanism          | Colocated actions / `set`               | Owner decides which actions become commands            |
| Mutation authority          | Store API and actions reach consumers   | Observation and commands can be separated              |
| Dynamic scoping             | Call store factory per scope            | Owner registry controls factory and lifetime           |
| Entity lifecycle assertions | Domain actions implement policy         | Nexus strict verbs can be adopted where useful         |
| Disposal                    | Application-managed                     | Scoped owner coordinates it                            |
| DevTools/ecosystem support  | Zustand middleware/ecosystem            | Preserved                                              |
| Best reason to choose it    | Familiar, flexible Zustand architecture | Add ownership only when contributor boundaries need it |

## Disciplined Zustand with private setters

[`zustand-native.ts`](./src/zustand-native.ts) demonstrates a fair native
solution: the mutable `StoreApi` is private, the class publishes only
`getState`/`subscribe`, and named methods own writes. This already solves much
of the authority problem through disciplined module design.

| Concern                     | Native approach                       | Nexus-shaped approach                                |
| --------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Setup ceremony              | Class plus private store              | Similar; standardize reader/owner vocabulary         |
| Subscription/reactivity     | Native Zustand                        | Native Zustand                                       |
| Mutation mechanism          | Private `setState` in named methods   | Same                                                 |
| Mutation authority          | Enforced by class/module surface      | Made consistent across domains and substrates        |
| Dynamic scoping             | Construct class instances             | Registry owns keyed instances                        |
| Entity lifecycle assertions | Implement explicitly                  | Optional strict Nexus operations                     |
| Disposal                    | Add domain-specific cleanup           | Treat cleanup as owner lifecycle                     |
| DevTools/ecosystem support  | Preserved                             | Preserved                                            |
| Best reason to choose it    | Strong boundary with no extra runtime | Nexus may be unnecessary if conventions remain clear |

## Nexus-shaped Zustand with lazy scopes

[`zustand-nexus-shaped.ts`](./src/zustand-nexus-shaped.ts) follows Haven's
mobile shape: a store factory rather than a module singleton, one owner/store
per channel, lazy creation, writer retained by the owner, reader plus narrow
command published, realtime routed through the owner, and explicit disposal.

| Concern                     | Native approach              | Nexus-shaped approach                            |
| --------------------------- | ---------------------------- | ------------------------------------------------ |
| Setup ceremony              | One store factory            | Owner, public surface, and keyed registry        |
| Subscription/reactivity     | Native Zustand               | Native Zustand                                   |
| Mutation mechanism          | `setState`                   | Private owner methods                            |
| Mutation authority          | Depends on exported StoreApi | Reader plus selected commands only               |
| Dynamic scoping             | Caller tracks instances      | Community owner lazily tracks channel owners     |
| Entity lifecycle assertions | Domain-specific              | Can use strict commands where absence matters    |
| Disposal                    | Caller-managed               | `closeChannel` unsubscribes, clears, and deletes |
| DevTools/ecosystem support  | Preserved                    | Preserved                                        |
| Best reason to choose it    | Existing Zustand investment  | Predictable ownership for many dynamic instances |

## Redux Toolkit

[`redux.ts`](./src/redux.ts) keeps what Redux already provides: actions,
reducers, immutable updates, middleware compatibility, and DevTools. The added
decision is that each channel owner retains `dispatch`, publishes observation,
routes realtime actions, and owns disposal of its scoped store.

| Concern                     | Native approach                                | Nexus-shaped approach                               |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Setup ceremony              | Slice and configured store                     | Add scoped owner/public reader                      |
| Subscription/reactivity     | Redux subscriptions/selectors                  | Unchanged                                           |
| Mutation mechanism          | Typed actions and `dispatch`                   | Owner retains `dispatch`                            |
| Mutation authority          | Anyone handed dispatch can act                 | Most consumers receive observation only             |
| Dynamic scoping             | Create multiple Redux stores                   | Owner controls one store per scope                  |
| Entity lifecycle assertions | Reducer/domain policy                          | Strict actions/reducers where needed                |
| Disposal                    | Unsubscribe middleware/listeners as configured | Scope owner coordinates cleanup                     |
| DevTools/ecosystem support  | Excellent                                      | Preserved                                           |
| Best reason to choose it    | Central transitions and mature tooling         | Restrict dispatch and clarify scoped-store lifetime |

## Solid

[`solid.ts`](./src/solid.ts) follows Haven's Solid-native shape. The owner holds
the live `createStore` proxy and private path-based setter, exposes tracked
`createMemo` projections and named commands, and never imitates Zustand with a
manual adapter. Solid components consume the accessors reactively.

| Concern                     | Native approach                                | Nexus-shaped approach                                |
| --------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Setup ceremony              | `createStore` plus projections                 | Domain owner and explicit public methods             |
| Subscription/reactivity     | Fine-grained proxy tracking                    | Preserved directly                                   |
| Mutation mechanism          | Path-based `setState`                          | Private to owner/named commands                      |
| Mutation authority          | Depends on where setter is exposed             | Components receive accessors, not setter             |
| Dynamic scoping             | Construct stores in reactive roots             | Owner registry controls keyed instances              |
| Entity lifecycle assertions | Domain methods                                 | Strict methods where existence is asserted           |
| Disposal                    | Solid owner cleanup plus external unsubscribes | Domain owner exposes deterministic disposal          |
| DevTools/ecosystem support  | Solid-native                                   | Preserved; no adapter indirection                    |
| Best reason to choose it    | Fine-grained native reactivity                 | Keep Solid semantics while making authority explicit |

## The ceremony and its return

The Nexus-shaped variants add owner classes, public-surface types, keyed
registries, and explicit disposal. That ceremony is not free. It earns its place
when it reduces the mutation surface, makes ownership consistent, asserts
meaningful lifecycle failures, makes dynamic scoping predictable, simplifies
review, and lowers contributor entropy.

These recipes intentionally do not define a generic substrate interface. The
repeated idea is currently architectural—retain mutation and publish observation
plus commands—while the actual reactive contracts remain meaningfully different.
Formalize an adapter only after multiple integrations converge on the same
behavioral boundary.

The typechecked
[`community-channel-registry.ts`](./src/community-channel-registry.ts) extends
the same pattern into a complete lazy community → channel → message ownership
tree. The accompanying [adoption guide](../../docs/adoption/dynamic-registry.md)
explains construction, routing, public surfaces, and recursive disposal.
