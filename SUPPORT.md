# Support policy

## Maintained in 0.1

- `@redrixx/nexus`: cells, entity stores, strict/lenient existence lifecycle,
  synchronous persistence port, memory persistence, and strict registry.
- `@redrixx/nexus-react`: React 18 and 19 hooks over the public reader contract.
- ESM consumers using modern bundlers or Node ESM.
- TypeScript 5.0 and newer declaration consumption.

Bug fixes, documentation corrections, and security clarifications are accepted
for this surface. Pre-1.0 minor releases may still make documented breaking
changes.

## Not maintained in 0.1

- CommonJS `require` entry points.
- Solid, Vue, or Svelte adapters.
- SSR or React Server Components guarantees.
- Async persistence, server synchronization, conflict resolution, or offline
  queues.
- Middleware, plugins, transactions, batching, DevTools, or an inspector API.
- Hostile-code isolation or deep runtime immutability.
- Third-party substrate adapters beyond typechecked recipes.

Use GitHub issues for reproducible bugs and documentation gaps. Integration
questions should include the intended workload, ownership topology, substrate,
and lifecycle requirements.
