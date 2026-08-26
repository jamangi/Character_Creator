# DEFECT-007 — palette roles apply as a global tint

## Observation

During Task 005 human review, changing `skin.shadow` or `mouth.base` changed the hue of the whole rendered character. The labeled control therefore does not match its effect, and independent control of `skin.base` cannot be trusted.

Repository inspection confirms the architectural mismatch: the resolver attaches role values to each draw item, but the Canvas renderer does not apply that palette payload. The Studio instead stores the latest input as `activeTint` and composites that one color over the completed canvas. This bypasses role boundaries and can also diverge from recipe history.

## Preserved evidence

- [`palette-controls.png`](palette-controls.png) — the role-labeled control set.
- [`baseline-character.png`](baseline-character.png) — representative character before the reported role edits.
- [`skin-shadow-global-tint.png`](skin-shadow-global-tint.png) — changing `skin.shadow` recolors unrelated garments, hair, and skin regions.
- [`mouth-base-global-tint.png`](mouth-base-global-tint.png) — changing `mouth.base` recolors the whole character instead of only the mouth.

## Expected result

- A palette role affects only fragments or explicit mask pixels declaring that role.
- Unrelated output pixels remain byte-identical where antialiasing/compositing does not require a documented tolerance.
- Role application occurs in the reusable render path, so Studio preview, PNG export, sprite frames, and non-Studio consumers agree.
- The portable recipe remains the only source of palette choices; the Studio does not retain an independent whole-canvas tint.
- Linework, highlights, alpha, and intentionally unrecolored pixels remain intact.

## Ownership

Tracked in [`../../DEFECTS.md`](../../DEFECTS.md) and implemented by [`../../tasks/TASK-012-HIGH-role-scoped-palette-rendering.md`](../../tasks/TASK-012-HIGH-role-scoped-palette-rendering.md). Task 013 validates history only after the visual palette path is correct.
