# TASK-009-HIGH-release-hardening

- **Status:** BLOCKED
- **Outcome:** Produce a reproducible, secure, performant, documented first release candidate.
- **Depends on:** 007, 008
- **Unblocks:** None
- **Owned paths:** cross-repository release configuration, documentation, CI, benchmarks

## Scope

- Complete test/coverage strategy, browser support matrix, accessibility review, dependency/security checks, and asset-input threat model.
- Set and enforce package size, asset size, decode, first-render, cached-render, and animation-frame budgets.
- Confirm licenses and attribution for code, fonts, images, and bundled assets.
- Write user integration docs, asset-author guide, schema/version policy, and migration/deprecation policy.
- Create reproducible build and release-candidate checklist.

## Acceptance criteria

- [ ] All automated suites and required visual baselines pass from a clean checkout.
- [ ] No unresolved critical/high security, licensing, accessibility, or data-loss issue remains.
- [ ] Performance budgets pass on documented representative hardware/browser profiles.
- [ ] Release artifacts contain only intended files and have integrity metadata.
- [ ] A new integrator and a new asset author can complete documented happy paths without repository knowledge.

## Validation

Clean-room build, package-content inspection, dependency/license audit, benchmark suite, supported-browser end-to-end suite, accessibility review, and release dry run.
