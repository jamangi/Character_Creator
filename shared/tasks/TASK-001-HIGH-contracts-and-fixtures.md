# TASK-001-HIGH-contracts-and-fixtures

- **Status:** READY
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

- [ ] JSON and TypeScript representations agree through tests.
- [ ] Unknown fields follow an explicit forward-compatibility policy.
- [ ] IDs, semantic versions/ranges, safe relative paths, and hashes have defined formats.
- [ ] Every invalid fixture fails with the intended stable diagnostic code.
- [ ] The starter rig contains no arbitrary per-asset global layer values.
- [ ] Shared contract documentation reflects any field-name refinements.

## Validation

Run type-checking, schema tests, and a fixture table test that asserts both acceptance and exact failure diagnostics.

## Non-goals

Rendering, browser UI, complete artwork, remote pack loading, and arbitrary third-party script execution.
