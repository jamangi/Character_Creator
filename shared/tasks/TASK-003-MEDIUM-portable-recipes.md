# TASK-003-MEDIUM-portable-recipes

- **Status:** DONE
- **Outcome:** Export, import, validate, normalize, and migrate compact character recipes deterministically.
- **Depends on:** 001
- **Unblocks:** 005, 008
- **Owned paths:** recipe modules in `packages/core/`, migrations, recipe fixtures

## Scope

- Define canonical JSON serialization and stable ordering.
- Preserve asset IDs/versions, rig family, palette roles, parameters, seed/variants, and optional user metadata.
- Add migration registry, deprecated-ID aliases, and missing-asset diagnostics.
- Establish size and nesting limits and reject prototype-pollution keys or unsafe external references.
- Support strict import plus an explicitly requested best-effort preview mode that never silently changes the saved source.

## Acceptance criteria

- [x] Export → import → export is byte-stable after normalization.
- [x] Old fixtures migrate deterministically with a migration report.
- [x] Missing/incompatible assets are reported without a crash.
- [x] Malformed or hostile JSON is bounded and rejected.
- [x] Recipes contain no image bytes, machine-specific paths, or executable content.

## Validation

Round-trip, migration, fuzz/size-limit, unknown-version, missing-asset, and security regression tests.

## Human validation

- **Required:** No
- **Pages path:** Not applicable

Acceptance is determined by deterministic fixtures and diagnostics. Import/export UI is reviewed with Task 005.

## Handoff notes

- Added canonical serialization, bounded JSON parsing, migration and alias registries, strict import, and source-preserving best-effort preview APIs in `packages/core/src/recipes.ts`.
- Added legacy, missing-asset, and hostile recipe fixtures plus round-trip, migration, size/depth, unknown-version, and prototype-pollution regressions.
- `pnpm validate` covers 45 tests after this task. Human validation is not required.
