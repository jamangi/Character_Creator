# Development tasks

Tasks are ordered by dependency, not by who performs them. Parallel work is safe only where the dependency column permits it.

| Order | Task | Status | Depends on | Primary result |
|---:|---|---|---|---|
| 001 | [Contracts and fixtures](TASK-001-HIGH-contracts-and-fixtures.md) | DONE | — | Executable schema and rig vocabulary |
| 002 | [Composition vertical slice](TASK-002-HIGH-composition-vertical-slice.md) | DONE | 001 | Resolver + Canvas proof across all outputs |
| 003 | [Portable recipes](TASK-003-MEDIUM-portable-recipes.md) | DONE | 001 | Versioned import/export and migration |
| 004 | [Asset validator](TASK-004-HIGH-asset-validator.md) | DONE | 001, 002 | Artist-facing conformance tooling |
| 005 | [Creator Studio](TASK-005-HIGH-creator-studio.md) | DONE | 002, 003 | Reference editing UI |
| 006 | [Animation pipeline](TASK-006-HIGH-animation-pipeline.md) | DONE | 002, 004 | Directional clips and sprite export |
| 007 | [Starter asset pack](TASK-007-HIGH-starter-asset-pack.md) | DONE | 004, 006 | Coherent, stress-testing content pack |
| 008 | [Portable integration API](TASK-008-MEDIUM-portable-integration-api.md) | DONE | 003, 005, 006 | Framework-agnostic consumption example |
| 009 | [Release hardening](TASK-009-HIGH-release-hardening.md) | DONE | 007, 008 | Tested and documented first release |
| 010 | [Animation release scope](TASK-010-HIGH-animation-release-scope.md) | DONE | 001, 002 | Honest starter-rig selector contract |
| 011 | [Animation fragment motion](TASK-011-HIGH-animation-fragment-motion.md) | DONE | 010 | Equipped layers follow retained motion |
| 012 | [Role-scoped palette rendering](TASK-012-HIGH-role-scoped-palette-rendering.md) | DONE | 002, 003 | Semantic palette isolation in reusable rendering |
| 013 | [Studio history transactions](TASK-013-MEDIUM-studio-history-transactions.md) | DONE | 003, 020 | Undoable palette and hero changes |
| 014 | [Output profile projections](TASK-014-MEDIUM-output-profile-projections.md) | DONE | 002, 003 | Portrait/sprite presentation rules |
| 015 | [Expression intent mapping](TASK-015-LOW-expression-intent-mapping.md) | DONE | 004 | Correct expression polarity |
| 016 | [Remediation integration review](TASK-016-HIGH-remediation-integration-review.md) | DONE | 012, 013, 017–020 | Reconciled release candidate and sign-off |
| 017 | [Selected mouth dominance](TASK-017-MEDIUM-selected-mouth-dominance.md) | DONE | 002, 003 | Equipped mouth controls neutral output |
| 018 | [Bilateral arm modules](TASK-018-HIGH-bilateral-arm-modules.md) | DONE | 004, 010, 011 | Independently removable left/right arms |
| 019 | [Slot-scoped palette vocabulary](TASK-019-HIGH-slot-scoped-palette-vocabulary.md) | DONE | 018 | Independent body and clothing colors |
| 020 | [Accessory-scoped palettes](TASK-020-HIGH-accessory-scoped-palettes.md) | DONE | 019 | Stable independent accessory colors |

## Release completion

The owner accepted the complete Tasks 001–020 release candidate on 2026-08-26. APPROVAL-002 selected MIT for source code and retained CC0-1.0 for starter assets. The grouped Pages bundle and focused task routes remain published as historical validation evidence.

## Coordination rules

- Read the shared documents before changing code or contracts.
- Claim owned paths in the task before broad edits. Preserve unrelated changes.
- If an implementation reveals a contract defect, update the executable contract, this documentation, and affected fixtures together.
- Do not silently broaden a rig, slot, or fallback to make one asset pass.
- Every new diagnostic needs a failing fixture; every fixed bug needs a regression test.
- Review findings must be assigned stable IDs in `shared/DEFECTS.md` or `shared/CHANGE_REQUESTS.md`; preserve irreplaceable evidence under `shared/defects/`.
- Generated images, atlases, and contact sheets should not be committed unless the owning task defines them as fixtures or release artifacts.
- Tasks marked `Human validation: Required` must update `site/validation/index.json` and publish their review artifact at the stable path named in the task. Technical success must not be recorded as human acceptance.
- Preserve historical review URLs. When the Studio becomes the main Pages experience, keep earlier validation artifacts reachable.
- Task completion must update this table and the task's handoff notes.
