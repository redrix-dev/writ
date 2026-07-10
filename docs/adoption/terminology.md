# projectname terminology

## Owner

The domain object or module responsible for state policy and lifetime. It
normally retains the writer and disposes external work.

## Writer

A capability containing projectname mutation methods such as `set`, `spawn`,
`update`, and `destroy`. Sharing it shares authority.

## Reader

A separate observation capability with `get` and `subscribe`, plus domain read
helpers such as `getEntity`. It exposes no projectname mutation method. Returned
values are not deep-frozen.

## Command

A narrow domain operation intentionally published by an owner, such as
`sendMessage` or `leaveChannel`. A command conveys less authority than a raw
writer and can enforce policy.

## Entity lifecycle

Asserted existence transitions: birth with `spawn`, change with `update`, and
death with `destroy`. This is not a complete state-machine model.

## Registry

A lookup or publication boundary. `createRegistry` is one strict named slot. A
keyed owner registry is an application composition pattern for lazy scopes; the
core does not currently ship one.

## Scope

The lifetime boundary for an owner and its state, often keyed by tenant,
community, channel, document, session, or device.

## Substrate

The reactive storage mechanism: projectname’s built-in cell, Zustand, Redux,
Solid, or another store. It provides storage and update propagation; ownership
is a separate architectural choice.

## Composition root

A place where owners and external dependencies are constructed, events are
routed, and public readers/commands are assembled. An application may have more
than one composition root.

## Administrative reset

`clear()` removes a whole collection in one commit and wipes configured
persistence. It is storage/lifetime maintenance, not one domain death per
entity.
