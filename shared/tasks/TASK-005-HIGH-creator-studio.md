# TASK-005-HIGH-creator-studio

- **Status:** DONE
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
- [x] Palette controls update only their named semantic role in preview and export.
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
- Human review accepted discovery, building, conflict safety, recipe round-trip, keyboard behavior, and responsive layout on 2026-08-26.
- Role isolation, the expanded semantic palette vocabulary, and palette/hero history are complete under Tasks 012, 019–020, and 013. `DEFECT-005`, `DEFECT-006`, and `DEFECT-007` are closed. Portrait/sprite presentation changes were accepted as `CHANGE-001` and `CHANGE-002` under Task 014.
- Owner review accepted selected-mouth dominance (`CHANGE-005`/Task 017), bilateral arm modules (`CHANGE-006`), category-scoped palettes (`CHANGE-007`), and accessory-scoped palettes (`CHANGE-008`) under Tasks 018–020.
- The owner accepted the reconciled Creator Studio and grouped release candidate on 2026-08-26. All Creator Studio acceptance criteria are complete.
