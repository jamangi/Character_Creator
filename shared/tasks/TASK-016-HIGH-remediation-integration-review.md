# TASK-016-HIGH-remediation-integration-review

- **Status:** BLOCKED
- **Outcome:** Reconcile the repository and obtain final human acceptance for the corrected Task 005–007 release candidate.
- **Tracks:** DEFECT-001 through DEFECT-007; CHANGE-001 through CHANGE-004
- **Depends on:** 011, 012, 013, 014, 015
- **Unblocks:** 008, 009
- **Owned paths:** cross-repository documentation/status reconciliation, `site/`, `shared/DEFECTS.md`, `shared/CHANGE_REQUESTS.md`, Task 005–007 handoff/status records

## Required reading

- `shared/README.md`
- `shared/DEFECTS.md`
- `shared/CHANGE_REQUESTS.md`
- `site/README.md`
- Tasks 005–007 and 010–015

## Context

The remediation tasks intentionally keep their implementation reads narrow. Once their technical and focused visual checks pass, this task pays the broader integration cost once: regenerate all derived artifacts, scan executable contracts against documentation, and present one coherent release-candidate review.

## Scope

- Run a repository-wide scan for stale animation selectors, output-profile claims, history behavior, expression mappings, task statuses, and generated counts.
- Regenerate Studio and Task 005–007 artifacts from authoritative sources.
- Run all automated validation, internal-link checks, accessibility checks, and deployment verification.
- Reconcile every defect/change-request status and every parent task acceptance checkbox.
- Present a compact review sequence that keeps Studio output, animation, and expression acceptance independent.
- Mark Tasks 005, 006, and 007 `DONE` only for checkpoints explicitly accepted by the owner.

## Non-goals

- Implementing fixes that belong to Tasks 011–015.
- Conflating deployment success with human approval.
- Reopening accepted Task 004 unless a regression affects it.

## Acceptance criteria

- [ ] `pnpm validate` and the production validator pass on authoritative generated content.
- [ ] Generated artifacts are reproducible and every internal Pages link resolves.
- [ ] Studio accessibility and representative keyboard/mobile workflows pass.
- [ ] Every registered defect/request is `CLOSED`/`DELIVERED` or explicitly deferred with owner approval.
- [ ] Task 005 output/history checkpoints receive an independent human result.
- [ ] Task 006 retained animation checkpoint receives an independent human result.
- [ ] Task 007 expression and remaining pack checkpoints receive an independent human result.
- [ ] Root/shared architecture, task table, task handoffs, Pages registry, and public copy agree.

## Validation

Run the complete build/test/validator/artifact pipeline from a clean checkout, scan links and generated selector matrices, publish Pages, then inspect the deployed main route and Task 005–007 paths.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`, `site/validation/task-006/`, and `site/validation/task-007/`

The reviewer may accept or reject each checkpoint independently. Final acceptance is recorded in the parent task, the applicable defect/request row, and the Pages registry.

## Handoff notes

Record final commit/deployment provenance, automated results, each human decision, remaining deferred scope, and whether Tasks 008–009 are unblocked.
