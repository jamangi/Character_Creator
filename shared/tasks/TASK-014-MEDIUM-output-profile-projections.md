# TASK-014-MEDIUM-output-profile-projections

- **Status:** DONE
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

- [x] A recipe equipped with bottom and shoes resolves no such draw items for portrait output.
- [x] A recipe equipped with a mouth resolves no mouth draw item for sprite output.
- [x] The same recipe still resolves those assets in full-body output.
- [x] Switching or exporting outputs leaves canonical recipe JSON byte-identical.
- [x] Preview and downloaded PNG/sprite frames match the same resolved scenes.
- [x] No new missing-coverage, suppression, or compatibility errors are introduced.
- [x] `CHANGE-001` and `CHANGE-002` each have independent regression and visual evidence.
- [x] Relevant documentation is updated.

## Validation

Run `pnpm validate`; add resolver draw-list assertions and exact-pixel fixtures for portrait, full-body, and sprite; exercise output switching and export from an edited recipe in the Studio.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-005/`

Publish side-by-side portrait/full-body/sprite renders from one labeled recipe and its unchanged recipe hash. Ask the reviewer to confirm no legs/shoes in portrait, no mouth in sprite, and no unintended change in full-body.

## Handoff notes

Rig profiles declare `hiddenSlots`; fragments may refine multi-slot assets through `contentSlots`. The starter portrait hides bottom/shoes and uses portrait-authored base art without legs; the sprite hides mouth. Resolver, preview, export, coverage, and recipe-identity tests share this policy. The owner accepted Task 014 on 2026-08-26; `CHANGE-001` and `CHANGE-002` are delivered. The later selected-mouth request is independently tracked as `CHANGE-005`/Task 017 and does not alter these accepted projection rules.
