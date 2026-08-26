# TASK-004-HIGH-asset-validator

- **Status:** DONE
- **Outcome:** Give asset creators a fast CLI/library that validates packs and generates useful visual review artifacts.
- **Depends on:** 001, 002
- **Unblocks:** 006, 007
- **Owned paths:** `packages/asset-validator/`, validator fixtures and docs, `site/validation/task-004/`, `site/validation/index.json`

## Scope

- Implement all seven validation levels in `shared/ASSET_CONTRACT.md` where automatable.
- Produce human-readable and machine-readable reports with stable diagnostic codes.
- Check dimensions, alpha/color expectations, safe paths, hashes, budgets, selector completeness, fallbacks, fit tags, anchors, seams, ground contacts, coverage, and distribution metadata.
- Generate labeled thumbnails, per-asset sheets, hero-recipe sheets, and pairwise/adversarial combination sheets.
- Document an artist loop with templates and actionable remediation messages.

## Acceptance criteria

- [x] A single command validates the starter pack and emits a report directory.
- [x] Invalid fixtures fail for the intended reason without cascades hiding the root cause.
- [x] Contact sheets identify recipe, profile, view/clip/frame, asset versions, and engine version.
- [x] CI can use a no-GUI mode and a nonzero exit status.
- [x] Reports distinguish errors, warnings, and review-required findings.
- [x] Representative contact sheets and a sanitized validation report are published to Pages.

## Validation

Run against all contract fixtures plus deliberately corrupt images and manifests. Review sheets at native scale and on a high-DPI display.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-004/`

Publish representative passing and failing reports plus labeled contact sheets. Ask the reviewer whether the report language is understandable, whether defects are easy to locate, and whether the sheets support efficient art review.

## Handoff notes

- Implemented a framework-independent seven-level validator, PNG inspection, stable JSON/HTML reports, native contact sheets, and a CLI with no-GUI/nonzero-exit support in `packages/asset-validator/`.
- Added one failing fixture for every validator diagnostic and a clean full-starter-pack regression across every hero request.
- Published passing/failing reports and a representative sheet at `site/validation/task-004/`.
- Human validation accepted the report language, failure localization, and review-sheet presentation on 2026-08-26. The task is complete.
