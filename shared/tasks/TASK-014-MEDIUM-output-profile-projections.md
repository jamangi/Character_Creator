# TASK-014-MEDIUM-output-profile-projections

- **Status:** READY
- **Outcome:** Portrait output omits bottoms/shoes and sprite output omits mouths without changing the character recipe.
- **Tracks:** CHANGE-001, CHANGE-002
- **Depends on:** 002, 003
- **Unblocks:** 016 and completion review for 005
- **Owned paths:** output-profile selection policy in schema/core as required, Canvas regression fixtures, Studio preview/export integration, `site/validation/task-005/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`
- `shared/ASSET_CONTRACT.md`
- `shared/CHANGE_REQUESTS.md` (`CHANGE-001`, `CHANGE-002`)
- `shared/tasks/TASK-005-HIGH-creator-studio.md`

## Context

The owner accepted two presentation-only changes: lower-body clothing should not appear in portraits, and mouths should not appear in sprites. The equipped assets must remain in the portable recipe so switching output profiles or exporting JSON loses no intent.

The profile visibility decision belongs before the resolved draw list reaches the renderer. Do not hard-code starter asset IDs or make the Canvas backend infer semantic slots from filenames.

## Scope

- Define a deterministic, semantic output-profile visibility rule for the two accepted requests.
- Exclude bottom/shoe contributions from portrait draw lists and mouth contributions from sprite draw lists.
- Keep full-body output and all recipes unchanged.
- Ensure preview and PNG/frame export use the same policy.
- Update affected coverage handling so intentional profile exclusion does not cause a false missing-coverage diagnostic.

## Non-goals

- Cropping the portrait canvas as a substitute for correct draw-list selection.
- Unequipping assets, rewriting recipes, or changing recipe serialization.
- Redesigning facial proportions or other sprite features.

## Acceptance criteria

- [ ] A recipe equipped with bottom and shoes resolves no such draw items for portrait output.
- [ ] A recipe equipped with a mouth resolves no mouth draw item for sprite output.
- [ ] The same recipe still resolves those assets in full-body output.
- [ ] Switching or exporting outputs leaves canonical recipe JSON byte-identical.
- [ ] Preview and downloaded PNG/sprite frames match the same resolved scenes.
- [ ] No new missing-coverage, suppression, or compatibility errors are introduced.
- [ ] `CHANGE-001` and `CHANGE-002` each have independent regression and visual evidence.
- [ ] Relevant documentation is updated.

## Validation

Run `pnpm validate`; add resolver draw-list assertions and exact-pixel fixtures for portrait, full-body, and sprite; exercise output switching and export from an edited recipe in the Studio.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-005/`

Publish side-by-side portrait/full-body/sprite renders from one labeled recipe and its unchanged recipe hash. Ask the reviewer to confirm no legs/shoes in portrait, no mouth in sprite, and no unintended change in full-body.

## Handoff notes

Record the chosen semantic rule, any contract fields added, affected golden images, request closures, and human result. Do not mark Task 005 complete until Tasks 012, 013, and 016 also pass.
