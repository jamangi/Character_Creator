# TASK-002-HIGH-composition-vertical-slice

- **Status:** IN PROGRESS
- **Outcome:** Deterministically render one representative character to portrait, full-body, and minimal sprite outputs.
- **Depends on:** 001
- **Unblocks:** 004, 005, 006
- **Owned paths:** `packages/core/`, `packages/renderer-canvas/`, minimal visual fixtures, `site/validation/task-002/`, `site/validation/index.json`

## Scope

- Implement catalog indexing, recipe normalization, requirement/conflict evaluation, body-region suppression, selector/fallback resolution, coverage checks, and stable draw ordering.
- Implement a Canvas 2D renderer that consumes only a resolved draw list.
- Create a deliberately small proof set: base body, two-plane hair, standard garment, tailed outer garment, and one body-region replacement.
- Render transparent portrait/full-body PNGs and a minimal directional sprite frame set.
- Return structured diagnostics and render provenance.

## Acceptance criteria

- [x] Input ordering does not change output ordering or pixels.
- [x] Multi-plane hair and coat fragments occlude correctly.
- [x] The replacing module suppresses only declared base regions; missing coverage fails.
- [x] The same recipe drives every output profile.
- [x] Core tests run without DOM/browser globals.
- [ ] Golden images and a human-reviewed contact sheet cover the proof cases.
- [x] The Pages artifact is labeled with recipe, profile, view/frame, asset versions, commit, and known limitations.

## Validation

Unit-test resolution independently of rendering. Pixel-diff deterministic renders with a documented tolerance and inspect the contact sheet at native scale.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-002/`

Publish side-by-side portrait, full-body, and sprite proofs for the same recipe, plus isolated views of two-plane hair, the tailed coat, and the replacement module. Ask the reviewer to accept or flag layer order, seams, silhouette coherence, and consistency across output profiles.

## Non-goals

Full catalog UI, all animation clips, remote assets, WebGL, or production art volume.

## Handoff notes

- Implemented deterministic catalog indexing, recipe normalization, requirement/conflict checks, rig-declared selector fallback, fragment-tag suppression, coverage validation, stable draw ordering, and reproducible provenance in `packages/core/`.
- Implemented a structural Canvas 2D backend in `packages/renderer-canvas/`; it receives only a resolved draw list and works in Node or a browser-compatible Canvas environment.
- Added a five-asset proof recipe with portrait, full-body, front sprite, and explicit left-facing sprite outputs. Generated fragments remain deliberately geometric and alignment-safe; a generated concept establishes only the visual direction.
- `pnpm validate` passes 41 tests, including exact zero-pixel golden comparisons and reversed-input pixel determinism. `pnpm visuals` regenerates all Task 002 visual fixtures and review artifacts.
- Published the review artifact at `site/validation/task-002/`. Technical validation is complete; task status remains `IN PROGRESS` until human review accepts layer order, seams, silhouette coherence, and cross-profile consistency.
