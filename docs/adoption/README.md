# Adopting writ

Adoption does not require replacing the state system that already provides
storage, reactivity, selectors, or tooling. writ supplies a shared
reader/writer, ownership, and entity-lifecycle vocabulary that can be applied to
the chosen substrate. The built-in cell is the zero-dependency option when no
additional state library is needed.

writ is most useful when shared state already has several mutation sources,
dynamic scopes, or unclear lifetime. Adopt it one ownership boundary at a time;
do not migrate every store simply for consistency.

## Guides

- [From an ambient module store](./from-ambient-store.md)
- [From one global Zustand store to scoped factories](./from-global-zustand.md)
- [Where does this mutation belong?](./where-does-this-mutation-belong.md)
- [Community → channel → message registry](./dynamic-registry.md)
- [Testing strict lifecycle and ordering](./testing.md)
- [Terminology](./terminology.md)
- [Should this feature use writ?](./decision-tree.md)

Start with the decision tree. If writ earns its ceremony, choose the migration
guide closest to the current shape and keep the first boundary deliberately
small.
