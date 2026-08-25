# TASK-005-HIGH-creator-studio

- **Status:** BLOCKED
- **Outcome:** Deliver a reference browser Studio for creating, previewing, diagnosing, importing, and exporting characters.
- **Depends on:** 002, 003
- **Unblocks:** 008, 009
- **Owned paths:** `packages/creator-ui/`, `apps/studio/`

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

## Validation

Component/unit tests, end-to-end creator flows, accessibility scan, keyboard-only review, and visual checks at narrow/wide viewport sizes.
