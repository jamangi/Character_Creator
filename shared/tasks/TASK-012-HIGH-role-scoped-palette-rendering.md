# TASK-012-HIGH-role-scoped-palette-rendering

- **Status:** IN PROGRESS
- **Outcome:** Every palette control recolors only its declared semantic role across preview and exported outputs.
- **Tracks:** DEFECT-007
- **Depends on:** 002, 003
- **Unblocks:** 013, 016 and completion review for 005
- **Owned paths:** resolved palette payload/contract as required, `packages/renderer-canvas/`, Studio palette rendering in `apps/studio/`, palette fixtures/tests, `site/validation/task-005/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`
- `shared/ASSET_CONTRACT.md`
- `shared/DEFECTS.md` (`DEFECT-007`)
- `shared/defects/DEFECT-007-palette-role-global-tint/README.md`
- `shared/tasks/TASK-005-HIGH-creator-studio.md`

## Context

The resolver already exposes palette values on resolved draw items, but the Canvas renderer ignores them. The Studio compensates with a single `activeTint` composited over the completed character, so editing `mouth.base` or `skin.shadow` recolors unrelated hair, garments, anatomy, and accessories. The fix belongs in the reusable render path, not as another Studio-only effect.

This task has authority to refine palette/mask contract fields if one image needs multiple independently recolorable roles. Any such contract change must update schema, TypeScript, fixtures, validator, and shared documentation together.

## Scope

- Apply recipe palette roles per resolved fragment or explicit role mask in the Canvas renderer.
- Preserve alpha, linework, highlights, and intentionally fixed colors under the declared palette mode.
- Remove the Studio's whole-canvas `activeTint` path and render solely from recipe plus resolved scene.
- Ensure Studio preview, portrait/full-body PNG export, sprite frames, generated artifacts, and direct renderer consumers share identical behavior.
- Add independent isolation checks for skin, skin shadow, mouth, hair, primary/secondary garment, eyes, markings, accent, and crystal roles where visible.
- Define clear behavior for a palette role not used by the current equipped draw list; it must not affect unrelated pixels.

## Non-goals

- Designing a new color-picker UI.
- Implementing Undo/Redo transaction boundaries; Task 013 owns history after this render path is correct.
- Changing the character recipe format unless an executable palette-mask contract makes it unavoidable.

## Acceptance criteria

- [x] `DEFECT-007` has a failing regression before the fix and passes afterward.
- [x] Changing `mouth.base` changes mouth pixels only; unrelated regions remain unchanged.
- [x] Changing `skin.base` and `skin.shadow` affects only their declared skin regions and remains independently controllable.
- [x] Hair, garment, accent, eye, marking, and crystal roles do not cross-affect one another.
- [x] A role absent from the current character is a deterministic no-op, not a global tint.
- [x] Preview and exported images are pixel-equivalent for the same resolved request.
- [x] Direct renderer use outside the Studio receives the same palette behavior.
- [x] Relevant schema, validator, fixtures, and documentation are updated if the palette contract changes.

## Validation

Run `pnpm validate`; add small synthetic role-isolation fixtures, exact-pixel/tolerance tests for each palette mode, and Studio browser checks using at least `mouth.base`, `skin.base`, `skin.shadow`, `hair.base`, and both garment roles. Regenerate representative Pages proofs deterministically.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`

Publish a labeled baseline and one-role-at-a-time comparison grid. Ask the reviewer to verify that only the named region changes, line/highlight quality survives, skin is independently controllable, and the exported PNG matches the preview.

## Handoff notes

The resolver now carries role, authored source color, requested value, and mode per draw item. The Canvas renderer uses exact authored sRGB role colors as deterministic per-fragment masks, preserving alpha and all non-role pixels; the Studio global tint path was removed. Synthetic mode/isolation tests and ten labeled role comparisons pass. Owner review on 2026-08-26 requested finer body/clothing and accessory role identities (`CHANGE-007` and `CHANGE-008`). `DEFECT-007` and Task 012 therefore remain in progress through Tasks 019–020; Task 013 waits for that stable vocabulary.
