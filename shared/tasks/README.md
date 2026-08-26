# Development tasks

Tasks are ordered by dependency, not by who performs them. Parallel work is safe only where the dependency column permits it.

| Order | Task | Status | Depends on | Primary result |
|---:|---|---|---|---|
| 001 | [Contracts and fixtures](TASK-001-HIGH-contracts-and-fixtures.md) | DONE | — | Executable schema and rig vocabulary |
| 002 | [Composition vertical slice](TASK-002-HIGH-composition-vertical-slice.md) | DONE | 001 | Resolver + Canvas proof across all outputs |
| 003 | [Portable recipes](TASK-003-MEDIUM-portable-recipes.md) | DONE | 001 | Versioned import/export and migration |
| 004 | [Asset validator](TASK-004-HIGH-asset-validator.md) | DONE | 001, 002 | Artist-facing conformance tooling |
| 005 | [Creator Studio](TASK-005-HIGH-creator-studio.md) | IN PROGRESS | 002, 003 | Reference editing UI |
| 006 | [Animation pipeline](TASK-006-HIGH-animation-pipeline.md) | IN PROGRESS | 002, 004 | Directional clips and sprite export |
| 007 | [Starter asset pack](TASK-007-HIGH-starter-asset-pack.md) | IN PROGRESS | 004, 006 | Coherent, stress-testing content pack |
| 008 | [Portable integration API](TASK-008-MEDIUM-portable-integration-api.md) | BLOCKED | 003, 005, 006 | Framework-agnostic consumption example |
| 009 | [Release hardening](TASK-009-HIGH-release-hardening.md) | BLOCKED | 007, 008 | Tested and documented first release |
| 010 | [Animation release scope](TASK-010-HIGH-animation-release-scope.md) | DONE | 001, 002 | Honest starter-rig selector contract |
| 011 | [Animation fragment motion](TASK-011-HIGH-animation-fragment-motion.md) | IN PROGRESS | 010 | Equipped layers follow retained motion |
| 012 | [Role-scoped palette rendering](TASK-012-HIGH-role-scoped-palette-rendering.md) | IN PROGRESS | 002, 003 | Semantic palette isolation in reusable rendering |
| 013 | [Studio history transactions](TASK-013-MEDIUM-studio-history-transactions.md) | BLOCKED | 003, 012 | Undoable palette and hero changes |
| 014 | [Output profile projections](TASK-014-MEDIUM-output-profile-projections.md) | IN PROGRESS | 002, 003 | Portrait/sprite presentation rules |
| 015 | [Expression intent mapping](TASK-015-LOW-expression-intent-mapping.md) | IN PROGRESS | 004 | Correct expression polarity |
| 016 | [Remediation integration review](TASK-016-HIGH-remediation-integration-review.md) | BLOCKED | 011–015 | Reconciled release candidate and sign-off |

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
