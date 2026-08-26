# Defect register

This register is the durable source of truth for behavior that contradicts an accepted requirement or produces a visibly incorrect result. Keep each defect independently closable even when several defects share one builder task.

Statuses are `OPEN`, `DECISION PENDING`, `IN PROGRESS`, `READY FOR REVIEW`, and `CLOSED`. Closing a defect requires its stated technical check and, where listed, its visual checkpoint.

| ID | Area | Defect | Architecture layers | Status | Fix task | Validation |
|---|---|---|---|---|---|---|
| DEFECT-001 | Animation | Base legs and shoes animate, but hair, tops, bottoms, outfits, outerwear, and accessories remain on their static pose or fail to share the body's vertical motion. | Rig/selector semantics; core resolution; starter assets; validator; visual artifacts | OPEN | TASK-011 | Automated per-frame scene/image differences plus Task 006 before/after motion sheet |
| DEFECT-002 | Animation | The back request shows a back-facing base while other equipped fragments remain front-facing; asymmetric placement is therefore incorrect. | Advertised rig coverage; fragment selectors; starter assets | OPEN | TASK-010 | Remove back from `starter-humanoid@1` advertised coverage and reject unsupported requests clearly |
| DEFECT-003 | Animation | Left and right requests do not produce a meaningful lateral orientation, including for the base body. | Advertised rig coverage; base and equipped art; mirroring policy | OPEN | TASK-010 | Remove left/right from `starter-humanoid@1` advertised coverage and reject unsupported requests clearly |
| DEFECT-004 | Animation | The `sit` clip is visually indistinguishable from `idle`. | Advertised clip contract; base and equipped motion art | OPEN | TASK-010 | Remove `sit` from `starter-humanoid@1` advertised coverage and reject unsupported requests clearly |
| DEFECT-005 | Studio | A palette edit does not reliably appear reversible because recipe history and rendered state can diverge. | Creator state/history; Studio render state | OPEN | TASK-013 | One swatch gesture creates one undoable transaction; Undo and Redo restore exact JSON and pixels |
| DEFECT-006 | Studio | Selecting a hero template is not demonstrably reversible as one history transaction. | Creator state/history; hero-template UI binding | OPEN | TASK-013 | One hero selection can be undone/redone with exact recipe and preview restoration |
| DEFECT-007 | Palette rendering | Changing any palette role applies the last selected color as a whole-character hue overlay instead of recoloring only fragments/pixels assigned to that role. | Resolver palette payload; Canvas renderer; Studio preview/export | OPEN | TASK-012 | Per-role isolation tests plus labeled skin, mouth, hair, and garment visual proofs |

## Intake and evidence rules

- Give one ID to one observable failure. Do not combine separate causes merely because they were reported in one sentence.
- Store irreplaceable screenshots under `shared/defects/<defect-id>-<slug>/`; link them from a defect note and preserve their original pixels.
- Record product-policy proposals in `CHANGE_REQUESTS.md`, not here. A defect can depend on a change request or approval when removing unsupported behavior is a legitimate resolution.
- A builder task may close several IDs only when they share an implementation boundary; each ID still needs its own acceptance assertion.
- Update this register during implementation, but defer broad architecture/documentation reconciliation to the integration task unless a changed executable contract would otherwise be misleading.
