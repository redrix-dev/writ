# Contributing

## Local setup

Requirements: Git and a current Node.js release with npm.

```bash
npm ci
npm run ci
```

Useful focused commands:

```bash
npm run typecheck
npm run test
npm run lint
npm run format:check
npm run build
npm run check:exports
npm run check:pack
npm run check:types:min
npm run demo
npm run demo:build
npm run benchmark:contract
```

## Repository structure

- `packages/core` — framework-agnostic, zero-runtime-dependency core.
- `packages/react` — optional React adapter.
- `apps/demo` — evidence lab using one shared scenario across implementations.
- `apps/state-library-recipes` — typechecked native and projectname-shaped
  recipes.
- `docs` — package contract, adoption guidance, and design history.

## Change expectations

- Keep writers behind owners and expose readers plus narrow commands.
- State lifecycle and error semantics explicitly; do not weaken strict behavior
  solely to make a fixture pass.
- Add compile-time tests for type-surface changes and runtime tests for
  behavior.
- Update the root and affected package README when positioning or support
  changes.
- Add or update a changelog entry for consumer-visible changes.
- Keep examples honest about what native state libraries already provide.

## Example requirements

Examples must typecheck in the workspace, use readonly public types where
appropriate, show disposal for dynamic scopes, and explain added ceremony. A
third-party substrate recipe should preserve its native reactive model rather
than forcing it through an invented generic adapter.

## Pull requests

Keep changes focused, explain the contract affected, and include the validation
commands run. Do not include release publishing, tags, or generated credentials.
