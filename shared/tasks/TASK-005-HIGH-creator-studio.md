# TASK-005-HIGH-creator-studio

- **Status:** IN PROGRESS
- **Outcome:** Deliver a reference browser Studio for creating, previewing, diagnosing, importing, and exporting characters.
- **Depends on:** 002, 003
- **Unblocks:** 008, 009
- **Owned paths:** `packages/creator-ui/`, `apps/studio/`, the interactive `site/` entry point, `site/validation/task-005/`, `site/validation/index.json`

## Scope

- Catalog browsing/search/filtering, semantic categories, equip/unequip, body profiles, palettes, and compatible-only filtering.
- Portrait, full-body, and sprite preview modes using the public renderer API.
- Undo/redo, deterministic randomization, reset, import/export, and PNG/sprite export entry points.
- Show conflicts, requirements, suppression, missing coverage, and automatic variant selection before/after equip.
- Keyboard navigation, labels, focus behavior, reduced-motion behavior, and responsive layout.
- Keep reusable state/model code outside the app shell where practical.

## Acceptance criteria

- [x] A user can build all hero recipes without editing JSON.
- [x] Invalid equips are explained and never corrupt the last valid recipe.
- [x] Undo/redo and export/import preserve exact choices.
- [x] Preview switching does not mutate the recipe.
- [x] Core and renderer remain usable without the Studio.
- [x] Accessibility checks and representative keyboard workflows pass.
- [x] The current Studio build is usable from the GitHub Pages main route and links to historical review artifacts remain intact.

## Validation

Component/unit tests, end-to-end creator flows, accessibility scan, keyboard-only review, and visual checks at narrow/wide viewport sizes.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`

Publish the interactive Studio and a concise review script covering discovery, equip conflicts, palette changes, undo/redo, output switching, and recipe round-trip. Ask the reviewer to accept or flag usability, clarity, visual hierarchy, and mobile/desktop behavior.

## Handoff notes

- Added `packages/creator-ui/` for DOM-free catalog queries, compatibility-safe equip actions, body profiles, palette state, deterministic randomization, history, preview state, and exact recipe round trips.
- Published the bundled Studio at the main Pages route using the public resolver and Canvas renderer. Native controls, visible focus, semantic labels, reduced-motion behavior, and wide/narrow layouts are covered.
- Published the human review script at `site/validation/task-005/`. Technical acceptance is complete; the task remains `IN PROGRESS` pending human usability review.
