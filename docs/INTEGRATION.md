# Integration guide

## Supported package boundary

Use only the package entry points: `@character-creator/schema`, `@character-creator/core`, `@character-creator/renderer-canvas`, and optionally `@character-creator/creator-ui`. Renderer-only hosts do not need `creator-ui` or the reference Studio.

The release line is `0.1.x`. Recipes declare `schemaVersion` and `engineVersion`; imports validate and migrate before they can replace live state. Treat an error diagnostic as a rejected operation and retain the last valid recipe.

## Asset URLs and base paths

Manifests contain safe relative paths, never absolute filesystem paths or executable URLs. The host owns the base URL and resolves each fragment with `new URL(fragment.source, assetBaseUrl)`. This works under a domain root, a subdirectory such as GitHub Pages, or a CDN prefix without changing recipe data.

## Browser and CSP behavior

The browser packages require ES2022, Canvas 2D, `fetch`, `URL`, and module scripts. They do not require inline scripts, workers, or remote code. In 0.1, the schema entry point uses Ajv runtime compilation, so a host performing browser-side schema parsing must either precompile validators in its build or explicitly permit `'unsafe-eval'` in `script-src`. The isolated example uses `default-src 'self'; img-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self'` and no broader network origin. Renderer-only hosts that consume already-validated typed data can omit this exception. If assets are served from a CDN, add only that origin to `img-src` and `connect-src`.

## Rendering and cleanup

Resolve a recipe with `resolveCharacter`, then pass the returned scene to `renderResolvedScene`. A host that mounts editing UI should keep the unsubscribe callbacks and event-listener abort signal together and expose one `destroy()` method. Destroying must cancel future paints, remove listeners, unsubscribe state observers, and clear the host element.

The isolated example in `examples/vanilla-js/` demonstrates both renderer-only and mount/unmount modes. Its source imports no workspace paths; its published page configures the asset root with a relative URL.

## Error handling

- Reject malformed or incompatible recipes without partially applying them.
- Surface structured diagnostic `code`, `path`, and `message` values; do not parse prose.
- Treat image-load failures as render failures and keep the previous valid character available.
- Preserve canonical exported JSON for support reports and deterministic replay.

## Import and export

`exportCharacterRecipe` produces canonical intent-only JSON. `importCharacterRecipe` bounds input size, validates schema and catalog references, applies deterministic aliases/migrations, and reports warnings separately from errors. Image bytes and developer paths never belong in a recipe.
