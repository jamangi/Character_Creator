# TASK-009-HIGH-release-hardening

- **Status:** IN PROGRESS
- **Outcome:** Produce a reproducible, secure, performant, documented first release candidate.
- **Depends on:** 007, 008
- **Unblocks:** None
- **Owned paths:** cross-repository release configuration, documentation, CI, benchmarks, `site/validation/task-009/`, `site/validation/index.json`

## Scope

- Complete test/coverage strategy, browser support matrix, accessibility review, dependency/security checks, and asset-input threat model.
- Set and enforce package size, asset size, decode, first-render, cached-render, and animation-frame budgets.
- Confirm licenses and attribution for code, fonts, images, and bundled assets.
- Write user integration docs, asset-author guide, schema/version policy, and migration/deprecation policy.
- Create reproducible build and release-candidate checklist.

## Acceptance criteria

- [ ] All automated suites and required visual baselines pass from a clean checkout.
- [ ] No unresolved critical/high security, licensing, accessibility, or data-loss issue remains.
- [x] Performance budgets pass on documented representative hardware/browser profiles.
- [x] Release artifacts contain only intended files and have integrity metadata.
- [x] A new integrator and a new asset author can complete documented happy paths without repository knowledge.
- [x] Pages exposes the release candidate, validation summary, known limitations, and acceptance checklist.

## Validation

Clean-room build, package-content inspection, dependency/license audit, benchmark suite, supported-browser end-to-end suite, accessibility review, and release dry run.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-009/`

Publish the exact release candidate and a consolidated acceptance checklist. Ask the reviewer for final product acceptance covering creator flow, all output formats, starter-pack quality, documentation discoverability, accessibility, and known limitations.

## Handoff notes

The 0.1.0-rc.1 audit records per-file SHA-256 integrity, package/site/starter byte budgets, absence of absolute developer paths, public-only example imports, security guidance, browser support, integration and asset-author happy paths, version policy, and known limitations. `pnpm validate` passes 86 tests, the production validator reports zero errors/warnings with one human visual review, and `pnpm audit --audit-level high` reports no known vulnerabilities. A fresh offline checkout reproduces the build, generated content, review artifacts, link audit, and release audit with a clean working tree; `.gitattributes` fixes generated text to LF so this guarantee is independent of host Git defaults. Owner acceptance remains pending. Source-code licensing is intentionally blocked on APPROVAL-002; starter assets remain CC0-1.0.
