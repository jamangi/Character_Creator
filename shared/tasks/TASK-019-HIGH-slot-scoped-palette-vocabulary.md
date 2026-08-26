# TASK-019-HIGH-slot-scoped-palette-vocabulary

- **Status:** DONE
- **Outcome:** Body skin, hair, top, bottom, outfit, outerwear, shoes, left arm, and right arm each have an independent palette control.
- **Tracks:** CHANGE-007 and final acceptance of DEFECT-007/TASK-012
- **Depends on:** 018; extends the implemented Task 012 renderer foundation
- **Unblocks:** 020, 013, 016 and completion review for 005
- **Owned paths:** rig/pack palette vocabulary, starter manifests and recipes, resolver/renderer fixtures, Studio palette controls, migration/normalization documentation, `site/validation/task-019/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`
- `shared/ASSET_CONTRACT.md`
- `shared/CHANGE_REQUESTS.md` (`CHANGE-007`)
- `shared/DEFECTS.md` (`DEFECT-007`)
- `shared/tasks/TASK-012-HIGH-role-scoped-palette-rendering.md`
- `shared/tasks/TASK-018-HIGH-bilateral-arm-modules.md`

## Context

Task 012 removed the whole-character tint defect, but owner review found that the starter palette vocabulary remains too coarse: `garment.primary` and `garment.secondary` intentionally bind several unrelated equipped categories. Correct renderer isolation is necessary but insufficient when the declared roles themselves group pants, jackets, shoes, and other independent choices.

## Scope

- Replace coarse starter garment/body-module bindings with stable roles for skin, hair, top, bottom, outfit, outerwear, shoes, left arm, and right arm.
- Keep one-piece outfits as one color target even though their fragments project into top and bottom content slots.
- Preserve exact per-role mask behavior, linework, alpha, preview/export parity, and absent-role no-op behavior from Task 012.
- Update starter recipes and migration/normalization behavior so existing recipes remain deterministic and visually reasonable.
- Publish a single-character isolation grid that proves every listed category can differ simultaneously.

## Non-goals

- Per-accessory colors; Task 020 owns accessory identity.
- Multi-color materials within one equipped item.
- Undo/Redo boundaries; Task 013 follows the final palette vocabulary.

## Acceptance criteria

- [x] Every listed non-accessory category has one independent, clearly labeled control.
- [x] Changing a category color changes only that category's authored pixels.
- [x] Black bottoms and green outerwear can coexist with independently colored shoes and top.
- [x] Left- and right-arm module colors are independent when both are equipped.
- [x] Empty category roles are deterministic visual no-ops.
- [x] Existing recipe migration/normalization behavior is documented and tested.
- [x] Task 012 isolation guarantees continue to pass.

## Validation

Run `pnpm validate`, migration and exact-pixel role isolation tests, deterministic artifact generation twice, and Studio preview/export checks with all target roles assigned visibly different colors.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-019/`

Publish a labeled simultaneous-color proof and one-role-at-a-time diffs. Acceptance closes the remaining Task 012 palette review only if role isolation and the expanded vocabulary both pass.

## Handoff notes

The final roles are `skin.base`, `hair.base`, `garment.top`, `garment.bottom`, `garment.outfit`, `garment.outerwear`, `garment.shoes`, `body.arm.left`, and `body.arm.right`. Normalization retains legacy keys while projecting missing new roles from `garment.primary`, `garment.secondary`, `crystal.base`, `accent.base`, and `skin.base`; explicit new values always win. Technical isolation and migration checks pass. The owner accepted Task 019 on 2026-08-26, delivering `CHANGE-007` and completing the remaining Task 012/`DEFECT-007` palette checkpoint.
