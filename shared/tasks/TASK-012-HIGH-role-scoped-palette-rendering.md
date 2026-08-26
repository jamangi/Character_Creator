# TASK-012-HIGH-role-scoped-palette-rendering

- **Status:** READY
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

- [ ] `DEFECT-007` has a failing regression before the fix and passes afterward.
- [ ] Changing `mouth.base` changes mouth pixels only; unrelated regions remain unchanged.
- [ ] Changing `skin.base` and `skin.shadow` affects only their declared skin regions and remains independently controllable.
- [ ] Hair, garment, accent, eye, marking, and crystal roles do not cross-affect one another.
- [ ] A role absent from the current character is a deterministic no-op, not a global tint.
- [ ] Preview and exported images are pixel-equivalent for the same resolved request.
- [ ] Direct renderer use outside the Studio receives the same palette behavior.
- [ ] Relevant schema, validator, fixtures, and documentation are updated if the palette contract changes.

## Validation

Run `pnpm validate`; add small synthetic role-isolation fixtures, exact-pixel/tolerance tests for each palette mode, and Studio browser checks using at least `mouth.base`, `skin.base`, `skin.shadow`, `hair.base`, and both garment roles. Regenerate representative Pages proofs deterministically.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`

Publish a labeled baseline and one-role-at-a-time comparison grid. Ask the reviewer to verify that only the named region changes, line/highlight quality survives, skin is independently controllable, and the exported PNG matches the preview.

## Handoff notes

Record the palette application/mask strategy, any contract revision, renderer tests, `DEFECT-007` status, and visual result. Do not mark Task 005 complete until Tasks 013, 014, and 016 also pass.
