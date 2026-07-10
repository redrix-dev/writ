# Release-readiness checklist

This checklist separates locally verifiable readiness from actions that change
release state or require another codebase.

## Completed locally

- Root and package READMEs use the same accurate thesis and package-specific
  scope.
- Every public type and function is covered by TSDoc and the API reference.
- Changelog and pre-1.0 breaking-change expectations are documented.
- Contribution, support, and security policies are present.
- Structured issue templates cover bugs, integrations, docs, and recipes.
- ESM-only support is prominent in every published README.
- Unnecessary Node `>=20` consumer constraints were removed from
  browser-compatible packages.
- Emitted declarations compile with TypeScript 5.0.
- React adapter smoke tests pass with React 18 and current React 19.
- CI covers clean install, lint, format, typecheck, compile-time contracts, unit
  tests, package builds, export validation, dry-run package inspection, minimum
  TypeScript, React compatibility, recipe typechecks, and demo build.
- Dry-run package manifests contain declarations, declaration maps, JavaScript,
  source maps, licenses, notices, and READMEs, with no source or test files.

## Explicitly deferred

The following are intentionally not performed by this readiness pass:

- Publishing either package to npm.
- Publishing core before adapters or verifying the published peer dependency.
- Tagging `v0.1.0` or creating GitHub release notes.
- Installing packed tarballs into separate external consumer projects.
- Testing against any non-local application or repository.
- Any deployment or other action that changes public release state.

Before an eventual release, revisit these deferred items with explicit approval
and use the final package versions and release commit.
