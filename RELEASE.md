# Release candidate checklist

## Build and verification

1. Install with the lockfile: `pnpm install --frozen-lockfile`.
2. Run `pnpm validate`.
3. Run `pnpm starter-pack`, `pnpm review-artifacts`, `pnpm integration-example`, and `pnpm release-audit`.
4. Run the starter validator against `packages/starter-pack`.
5. Confirm a second deterministic starter/review generation produces no tracked diff.
6. Review `site/validation/release-candidate/` and every independently approvable task section.

## Supported browsers

The release target is the current and previous stable desktop versions of Chrome, Edge, Firefox, and Safari, plus current mobile Safari and Chrome. Required features are ES2022 modules, Canvas 2D, `fetch`, `URL`, `AbortController`, and native form controls. Reduced motion and keyboard focus are respected; the Studio remains usable down to 320 CSS pixels.

## Known limitations

- The starter rig advertises only front-facing idle, walk, and run sprites.
- The starter art is intentionally geometric reference art, not a final commissioned content library.
- History is session-only and linear; it is not persisted across reloads.
- Asset packs are loaded by the host; this release does not include a marketplace, account, cloud save, or remote asset execution.
- Browser-side JSON Schema parsing currently uses Ajv runtime compilation; strict-CSP hosts should precompile validators or scope the documented `unsafe-eval` exception. Renderer-only hosts do not need it.

## Licensing

Source code is MIT-licensed under `LICENSE`. Starter-pack generated art and recipes remain CC0-1.0. See `LICENSES.md` for the attribution boundary.

## Human acceptance

The owner accepted the grouped visual bundle, standalone integration flow, documentation discoverability, keyboard/accessibility behavior, known limitations, and MIT/CC0 license split on 2026-08-26.
