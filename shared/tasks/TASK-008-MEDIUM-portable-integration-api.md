# TASK-008-MEDIUM-portable-integration-api

- **Status:** BLOCKED
- **Outcome:** Demonstrate that a plain JavaScript project can import only the needed packages and embed the creator or renderer safely.
- **Depends on:** 003, 005, 006
- **Unblocks:** 009
- **Owned paths:** public package entry points, `examples/vanilla-js/`, API documentation, `site/validation/task-008/`, `site/validation/index.json`

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
- [ ] The published Pages example proves a standalone host can render and edit a recipe.

## Validation

Clean-package smoke test, browser integration test, bundle inspection, CSP-safe run, and import/export interoperability test.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-008/`

Publish the vanilla-JS integration as an isolated example, not a repository-internal shortcut. Ask the reviewer to complete a small edit/export/import flow and confirm that the embedded experience is understandable outside the reference Studio.
