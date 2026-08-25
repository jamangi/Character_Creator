# TASK-005-HIGH-creator-studio

- **Status:** BLOCKED
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

- [ ] A user can build all hero recipes without editing JSON.
- [ ] Invalid equips are explained and never corrupt the last valid recipe.
- [ ] Undo/redo and export/import preserve exact choices.
- [ ] Preview switching does not mutate the recipe.
- [ ] Core and renderer remain usable without the Studio.
- [ ] Accessibility checks and representative keyboard workflows pass.
- [ ] The current Studio build is usable from the GitHub Pages main route and links to historical review artifacts remain intact.

## Validation

Component/unit tests, end-to-end creator flows, accessibility scan, keyboard-only review, and visual checks at narrow/wide viewport sizes.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`

Publish the interactive Studio and a concise review script covering discovery, equip conflicts, palette changes, undo/redo, output switching, and recipe round-trip. Ask the reviewer to accept or flag usability, clarity, visual hierarchy, and mobile/desktop behavior.
