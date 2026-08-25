# TASK-002-HIGH-composition-vertical-slice

- **Status:** BLOCKED
- **Outcome:** Deterministically render one representative character to portrait, full-body, and minimal sprite outputs.
- **Depends on:** 001
- **Unblocks:** 004, 005, 006
- **Owned paths:** `packages/core/`, `packages/renderer-canvas/`, minimal visual fixtures

## Scope

- Implement catalog indexing, recipe normalization, requirement/conflict evaluation, body-region suppression, selector/fallback resolution, coverage checks, and stable draw ordering.
- Implement a Canvas 2D renderer that consumes only a resolved draw list.
- Create a deliberately small proof set: base body, two-plane hair, standard garment, tailed outer garment, and one body-region replacement.
- Render transparent portrait/full-body PNGs and a minimal directional sprite frame set.
- Return structured diagnostics and render provenance.

## Acceptance criteria

- [ ] Input ordering does not change output ordering or pixels.
- [ ] Multi-plane hair and coat fragments occlude correctly.
- [ ] The replacing module suppresses only declared base regions; missing coverage fails.
- [ ] The same recipe drives every output profile.
- [ ] Core tests run without DOM/browser globals.
- [ ] Golden images and a human-reviewed contact sheet cover the proof cases.

## Validation

Unit-test resolution independently of rendering. Pixel-diff deterministic renders with a documented tolerance and inspect the contact sheet at native scale.

## Non-goals

Full catalog UI, all animation clips, remote assets, WebGL, or production art volume.
