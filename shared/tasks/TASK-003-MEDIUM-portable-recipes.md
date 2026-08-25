# TASK-003-MEDIUM-portable-recipes

- **Status:** BLOCKED
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

- [ ] Export → import → export is byte-stable after normalization.
- [ ] Old fixtures migrate deterministically with a migration report.
- [ ] Missing/incompatible assets are reported without a crash.
- [ ] Malformed or hostile JSON is bounded and rejected.
- [ ] Recipes contain no image bytes, machine-specific paths, or executable content.

## Validation

Round-trip, migration, fuzz/size-limit, unknown-version, missing-asset, and security regression tests.

## Human validation

- **Required:** No
- **Pages path:** Not applicable

Acceptance is determined by deterministic fixtures and diagnostics. Import/export UI is reviewed with Task 005.
