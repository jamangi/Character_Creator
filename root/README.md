# Root task workspace

This directory holds project-level coordination material. It is not a runtime package and must not be imported by application code.

## Responsibilities

- Keep the root [`README.md`](../README.md) accurate and short.
- Record cross-cutting architecture in [`shared/`](../shared/README.md), not inside an implementation task.
- Create executable work items from [`TASK_TEMPLATE.md`](TASK_TEMPLATE.md).
- Put only decisions requiring the project owner's input in [`APPROVALS.md`](APPROVALS.md).
- Triage review feedback into the shared [defect](../shared/DEFECTS.md) and [change-request](../shared/CHANGE_REQUESTS.md) registers before assigning builder work.
- Update task status and dependency information when work lands.

## Task-authoring rules

Every task must have one primary outcome, bounded scope, tracked defect/change IDs where applicable, dependencies, acceptance criteria, validation commands or procedures, and explicit non-goals. A task may refine a draft contract only when that authority is stated in its scope. Otherwise, conflicting interpretations must be raised in `root/APPROVALS.md`.

Task filenames use:

`TASK-<three-digit-order>-<LOW|MEDIUM|HIGH>-<short-kebab-name>.md`

Effort describes reasoning and integration risk, not elapsed time:

- `LOW`: local, mechanical, and low-risk.
- `MEDIUM`: several components or meaningful design judgment.
- `HIGH`: foundational contract, complex rendering, broad integration, or visual quality risk.

## Status convention

Use one of `READY`, `BLOCKED`, `IN PROGRESS`, or `DONE` in the task header. A task is `DONE` only when its acceptance criteria and validations pass and its documentation has been updated.

## Review-intake convention

- A defect is behavior that contradicts an accepted requirement or visibly fails its stated meaning.
- A change request intentionally changes previously accepted behavior or scope.
- Each observable concern gets its own stable ID even when one builder task closes several IDs at a shared implementation boundary.
- Preserve reviewer evidence under `shared/defects/`; do not depend on temporary chat or clipboard paths.
- Put contract/product choices in `APPROVALS.md` before dependent builder tasks begin.
