# TASK-020-HIGH-accessory-scoped-palettes

- **Status:** BLOCKED
- **Outcome:** Simultaneously equipped accessories can be recolored independently without color assignments shifting when another accessory is equipped or removed.
- **Tracks:** CHANGE-008
- **Depends on:** 019
- **Unblocks:** 013, 016 and completion review for 005
- **Owned paths:** accessory palette identity contract, starter manifests/recipes, resolver/renderer fixtures, Studio palette labels and ordering, migration documentation, `site/validation/task-020/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`
- `shared/ASSET_CONTRACT.md`
- `shared/CHANGE_REQUESTS.md` (`CHANGE-008`)
- `shared/tasks/TASK-019-HIGH-slot-scoped-palette-vocabulary.md`

## Context

All starter accessories currently use `accent.base`, so a hat, earrings, glasses, handheld item, and back item must share one color. The owner suggested numbered accents. The implementation should preserve that independently colorable behavior while avoiding order-dependent numbering that would move colors between items after equip or removal.

## Scope

- Define stable accessory palette addresses based on semantic accessory slots, with clear deterministic Studio labels.
- Allow every simultaneously equipped accessory slot to retain an independent color.
- Keep an unequipped accessory role visible or retained as a harmless no-op; equipping another item must not remap existing colors.
- Migrate starter recipes from `accent.base` with documented compatible defaults.
- Publish contrasting multi-accessory proofs and equip/remove stability evidence.

## Non-goals

- Multiple independent materials within one accessory.
- Order-dependent roles whose meaning changes when the equipped list is reordered.
- History transactions; Task 013 follows this vocabulary.

## Acceptance criteria

- [ ] A hat and earrings can display different colors simultaneously, as can other non-conflicting accessory slots.
- [ ] Equipping/removing one accessory does not transfer its color to another accessory.
- [ ] An unused accessory color is a deterministic visual no-op.
- [ ] Palette labels identify the controlled accessory slot clearly.
- [ ] Preview, export, import, and direct renderer output agree.
- [ ] Migration and exact-pixel isolation regressions pass.
- [ ] Relevant documentation is updated.

## Validation

Run `pnpm validate`, accessory equip-order and absent-role tests, exact-pixel preview/export comparisons, deterministic artifact generation twice, and browser checks with at least a hat plus earrings using contrasting colors.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-020/`

Publish a labeled multi-accessory character plus before/after equip/remove comparisons. Acceptance requires independent color, stable identity, and clear-label approval.

## Handoff notes

Record the chosen stable role vocabulary and why it avoids equip-order-dependent color reassignment.
