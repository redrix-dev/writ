# Adopting Nexus

Nexus is most useful when shared state already has several mutation sources,
dynamic scopes, or unclear lifetime. Adopt it one ownership boundary at a time;
do not migrate every store simply for consistency.

## Guides

- [From an ambient module store](./from-ambient-store.md)
- [From one global Zustand store to scoped factories](./from-global-zustand.md)
- [Where does this mutation belong?](./where-does-this-mutation-belong.md)
- [Community → channel → message registry](./dynamic-registry.md)
- [Testing strict lifecycle and ordering](./testing.md)
- [Terminology](./terminology.md)
- [Should this feature use Nexus?](./decision-tree.md)

Start with the decision tree. If Nexus earns its ceremony, choose the migration
guide closest to the current shape and keep the first boundary deliberately
small.
