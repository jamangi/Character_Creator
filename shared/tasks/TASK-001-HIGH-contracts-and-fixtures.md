# TASK-001-HIGH-contracts-and-fixtures

- **Status:** DONE
- **Outcome:** Publish executable recipe, rig, asset-pack, asset, fragment, and diagnostic contracts with representative valid and invalid fixtures.
- **Depends on:** None
- **Unblocks:** 002, 003, 004
- **Owned paths:** `packages/schema/`, `fixtures/`, root workspace/tooling configuration, contract documentation

## Required reading

Read all files linked from `shared/README.md`.

## Scope

- Establish the minimal JS/TypeScript workspace and test runner without coupling runtime code to a UI framework.
- Convert `shared/ASSET_CONTRACT.md` into JSON Schemas and public TypeScript types.
- Define one starter rig vocabulary: profiles, canvases, planes, slots, regions, anchors, selector axes, fallbacks, clips, and frame IDs.
- Define structured diagnostics with stable codes and JSON paths.
- Add valid fixtures for multi-plane hair, multi-plane coat, ordinary clothing, body replacement, dependency, conflict, and palette roles.
- Add invalid fixtures for every critical invariant, including traversal/unsafe paths and dependency cycles.
- Provide parsing and normalization entry points; do not implement visual composition.

## Acceptance criteria

- [x] JSON and TypeScript representations agree through tests.
- [x] Unknown fields follow an explicit forward-compatibility policy.
- [x] IDs, semantic versions/ranges, safe relative paths, and hashes have defined formats.
- [x] Every invalid fixture fails with the intended stable diagnostic code.
- [x] The starter rig contains no arbitrary per-asset global layer values.
- [x] Shared contract documentation reflects any field-name refinements.

## Validation

Run type-checking, schema tests, and a fixture table test that asserts both acceptance and exact failure diagnostics.

## Human validation

- **Required:** No
- **Pages path:** Not applicable

Schema behavior is accepted through executable fixtures and review of the versioned contract. A separate Pages artifact would not improve this task's acceptance signal.

## Non-goals

Rendering, browser UI, complete artwork, remote pack loading, and arbitrary third-party script execution.

## Handoff notes

- Added a pnpm/TypeScript workspace using project references, Vitest, and strict ESM package boundaries.
- Published executable schemas and public types in `packages/schema/` with parsing, normalization, catalog, and recipe-selection validation entry points.
- Added one starter humanoid rig, seven representative valid asset fixtures, a pack and recipe fixture, and an invalid fixture table covering schema, security, rig vocabulary, dependency-cycle, duplicate-ID, and exclusive-slot failures.
- `pnpm typecheck` and `pnpm test` pass. Task 001 does not require a Pages artifact.
