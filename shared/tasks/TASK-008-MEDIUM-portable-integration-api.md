# TASK-008-MEDIUM-portable-integration-api

- **Status:** BLOCKED
- **Outcome:** Demonstrate that a plain JavaScript project can import only the needed packages and embed the creator or renderer safely.
- **Depends on:** 003, 005, 006
- **Unblocks:** 009
- **Owned paths:** public package entry points, `examples/vanilla-js/`, API documentation

## Scope

- Stabilize small public entry points for catalog loading, recipe import/export, resolution, rendering, and optional creator UI mounting.
- Produce ESM builds, declarations where applicable, and a vanilla JS example with no repository-internal imports.
- Document asset URL/base-path handling, worker/CSP implications, cleanup, error handling, and version compatibility.
- Prove tree-shaking or split entry points so renderer-only consumers do not ship the Studio.

## Acceptance criteria

- [ ] The example installs/builds from published-style package artifacts.
- [ ] A host can render a saved recipe without mounting the editor.
- [ ] A host can mount/unmount the editor without leaked listeners or canvases.
- [ ] No absolute developer paths or hidden workspace assumptions exist.
- [ ] Public API and compatibility policy are documented.

## Validation

Clean-package smoke test, browser integration test, bundle inspection, CSP-safe run, and import/export interoperability test.
