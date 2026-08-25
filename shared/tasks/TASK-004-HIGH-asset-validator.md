# TASK-004-HIGH-asset-validator

- **Status:** BLOCKED
- **Outcome:** Give asset creators a fast CLI/library that validates packs and generates useful visual review artifacts.
- **Depends on:** 001, 002
- **Unblocks:** 006, 007
- **Owned paths:** `packages/asset-validator/`, validator fixtures and docs

## Scope

- Implement all seven validation levels in `shared/ASSET_CONTRACT.md` where automatable.
- Produce human-readable and machine-readable reports with stable diagnostic codes.
- Check dimensions, alpha/color expectations, safe paths, hashes, budgets, selector completeness, fallbacks, fit tags, anchors, seams, ground contacts, coverage, and distribution metadata.
- Generate labeled thumbnails, per-asset sheets, hero-recipe sheets, and pairwise/adversarial combination sheets.
- Document an artist loop with templates and actionable remediation messages.

## Acceptance criteria

- [ ] A single command validates the starter pack and emits a report directory.
- [ ] Invalid fixtures fail for the intended reason without cascades hiding the root cause.
- [ ] Contact sheets identify recipe, profile, view/clip/frame, asset versions, and engine version.
- [ ] CI can use a no-GUI mode and a nonzero exit status.
- [ ] Reports distinguish errors, warnings, and review-required findings.

## Validation

Run against all contract fixtures plus deliberately corrupt images and manifests. Review sheets at native scale and on a high-DPI display.
