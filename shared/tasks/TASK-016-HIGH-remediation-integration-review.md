# TASK-016-HIGH-remediation-integration-review

- **Status:** DONE
- **Outcome:** Reconcile the repository and obtain final human acceptance for the corrected Task 005–007 release candidate.
- **Tracks:** DEFECT-001 through DEFECT-007; CHANGE-001 through CHANGE-008
- **Depends on:** 012, 013, 017, 018, 019, 020
- **Unblocks:** 008, 009
- **Owned paths:** cross-repository documentation/status reconciliation, `site/`, `shared/DEFECTS.md`, `shared/CHANGE_REQUESTS.md`, Task 005–007 handoff/status records

## Required reading

- `shared/README.md`
- `shared/DEFECTS.md`
- `shared/CHANGE_REQUESTS.md`
- `site/README.md`
- Tasks 005–007 and 010–015

## Context

The remediation tasks intentionally keep their implementation reads narrow. Tasks 011, 014, and 015 were accepted on 2026-08-26; owner follow-up added Tasks 017–020 and kept Task 012 open. Once those technical and focused visual checks plus Task 013 pass, this task pays the broader integration cost once: regenerate all derived artifacts, scan executable contracts against documentation, and present one coherent release-candidate review.

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

- [x] `pnpm validate` and the production validator pass on authoritative generated content.
- [x] Generated artifacts are reproducible and every internal Pages link resolves.
- [x] Studio accessibility and representative keyboard/mobile workflows pass.
- [x] Every registered defect/request is `CLOSED`/`DELIVERED` or explicitly deferred with owner approval.
- [x] Task 005 output/history checkpoints receive an independent human result.
- [x] Task 006 retained animation checkpoint receives an independent human result.
- [x] Task 007 expression and remaining pack checkpoints receive an independent human result.
- [x] Root/shared architecture, task table, task handoffs, Pages registry, and public copy agree.

## Validation

Run the complete build/test/validator/artifact pipeline from a clean checkout, scan links and generated selector matrices, publish Pages, then inspect the deployed main route and Task 005–007 paths.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`, `site/validation/task-006/`, and `site/validation/task-007/`

The reviewer may accept or reject each checkpoint independently. Final acceptance is recorded in the parent task, the applicable defect/request row, and the Pages registry.

## Handoff notes

The authoritative pack, Studio, Task 005–007 artifacts, and Tasks 017–020 evidence were regenerated together. Two repeated full generation runs produced identical aggregate SHA-256 `33c1855e7e30c9d2f412429d54d2aa51dd4b605e7b8160193b4f402f813cbf50`; all internal links across 18 HTML pages resolve. A fresh offline checkout also reproduces every generated artifact with a clean working tree. Automated and local browser checks pass; the grouped review is published at `site/validation/release-candidate/`. The owner accepted Tasks 018–020, 013, 016, 008, and 009 on 2026-08-26, completing the reconciled Tasks 001–020 release candidate. All registered defects are closed and all change requests are delivered.
