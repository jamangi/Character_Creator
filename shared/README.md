# Shared project guidance

Everything in this directory is normative for implementation tasks unless a later accepted architecture decision explicitly replaces it.

## Readings

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — package boundaries, composition pipeline, invariants, and staged delivery.
- [`ASSET_CONTRACT.md`](ASSET_CONTRACT.md) — the draft manifest, fragment, coverage, compatibility, and validation contract.
- [`STARTER_ASSET_PACK.md`](STARTER_ASSET_PACK.md) — the smallest useful art package and its aesthetic test matrix.
- [`DEFECTS.md`](DEFECTS.md) — independently closable observed failures, architecture impact, evidence, and fix ownership.
- [`CHANGE_REQUESTS.md`](CHANGE_REQUESTS.md) — accepted or pending changes to product behavior and scope.
- [`defects/`](defects/README.md) — preserved reviewer evidence keyed by defect ID.
- [`tasks/README.md`](tasks/README.md) — task ordering and coordination.

## Shared invariants

1. The same normalized `CharacterRecipe` must drive portrait, full-body, and sprite outputs.
2. Resolution is pure and deterministic: the same recipe, catalog, rig, and engine versions produce the same resolved scene.
3. Asset manifests are untrusted input. They are schema-validated and cannot execute JavaScript.
4. Missing required coverage, unknown anchors, incompatible rigs, dependency cycles, and ambiguous exclusive-slot ownership fail with structured diagnostics.
5. Optional decorative fragments may be absent; required anatomy and required output views may not silently disappear.
6. A renderer receives a resolved draw list. It does not decide equip conflicts or mutate a recipe.
7. Import is migrated, validated, normalized, and only then rendered.
8. Runtime packages never depend on the editor UI.
9. Pixel-art and illustration packs do not share a rig family unless their dimensions, anchors, and sampling rules truly match.
10. Tests must include adversarial asset combinations, not only curated hero characters.
11. Tasks requiring visual or interactive acceptance publish labeled, stable artifacts through the GitHub Pages hub described in `site/README.md`.
12. Review feedback is recorded before implementation: defects and change requests retain separate IDs, tests, and human checkpoints even when they share a builder task.

## Decision hierarchy

When documents disagree, use this order:

1. An explicit owner decision recorded in `root/APPROVALS.md`
2. Accepted schema and TypeScript source once implemented
3. `shared/ASSET_CONTRACT.md`
4. `shared/ARCHITECTURE.md`
5. Individual task notes

Draft documentation should be updated when executable contracts become authoritative.
