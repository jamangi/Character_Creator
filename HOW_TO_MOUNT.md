# How to mount Character Creator

Character Creator supports two integration levels. Choose the full Studio when another project needs the complete reference experience with minimal work. Choose the native package integration when the host must control layout, state, recipes, or lifecycle.

## Option A: embed the complete Studio

The published Studio is a static application. Embed it in an iframe:

```html
<iframe
  title="Character Creator Studio"
  src="https://jamangi.github.io/Character_Creator/"
  style="width:100%;min-height:900px;border:0"
  loading="lazy"
></iframe>
```

For a release-pinned or offline deployment, publish this repository's `site/` directory from the host project and point the iframe at that copy. Preserve the directory layout: the Studio loads `validation/index.json`, `studio-data/`, and image fragments by relative URL.

This option intentionally treats the Studio as a separate application. The 0.1 release does not define a cross-origin `postMessage` recipe protocol. If the parent application must read or write the active recipe, use Option B instead of scraping the iframe.

## Option B: mount a host-controlled editor

Use only these public package entry points:

- `@character-creator/schema`
- `@character-creator/core`
- `@character-creator/renderer-canvas`
- `@character-creator/creator-ui` when editing is required

The packages are currently distributed from this repository's `0.1.x` release artifacts/workspace. Application code should import the package names above and must not import `packages/*/src` or other repository-internal paths.

Add a host element and give it an accessible name:

```html
<div id="character-creator" aria-label="Character creator"></div>
```

Load and validate the published rig, asset manifests, and starting recipe, then mount the editor:

```ts
import { mountCharacterCreator } from "./mount-character-creator.js";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig
} from "@character-creator/schema";

const host = document.querySelector<HTMLElement>("#character-creator");
if (!host) throw new Error("Character Creator host is missing");

const assetBaseUrl = new URL("/character-assets/", window.location.href);
const catalogResponse = await fetch(new URL("catalog.json", assetBaseUrl));
if (!catalogResponse.ok) throw new Error(`Catalog failed: ${catalogResponse.status}`);

const published = await catalogResponse.json() as {
  rig: unknown;
  assets: unknown[];
  heroRecipes: Array<{ recipe: unknown }>;
};
const rigResult = parseRig(published.rig);
if (!rigResult.ok) throw new Error(rigResult.diagnostics.map((item) => item.message).join("; "));
const rig = rigResult.value;
const assets = published.assets.map((value) => {
  const result = parseAssetManifest(value, rig);
  if (!result.ok) throw new Error(result.diagnostics.map((item) => item.message).join("; "));
  return result.value;
});
const recipeResult = parseCharacterRecipe(published.heroRecipes[0]?.recipe);
if (!recipeResult.ok) throw new Error(recipeResult.diagnostics.map((item) => item.message).join("; "));
const recipe = recipeResult.value;

const mounted = mountCharacterCreator(host, {
  assetBaseUrl,
  rig,
  assets,
  recipe
});

const recipeJson = mounted.exportRecipe();

// Required before route changes, remounts, or host removal.
mounted.destroy();
```

`mountCharacterCreator()` is the small reference adapter in [`examples/vanilla-js/main.ts`](examples/vanilla-js/main.ts). Copy or adapt that adapter into the host application; its implementation uses only public package entry points. The host owns its HTML and CSS, so a React, Vue, Svelte, or vanilla application can wrap the same lifecycle without depending on the reference Studio shell.

## Required host behavior

1. Treat the asset base as a URL, not a filesystem path. Resolve fragment paths with `new URL(fragment.source, assetBaseUrl)`.
2. Validate untrusted rigs, assets, and recipes before replacing live state. Keep the last valid recipe when an operation returns error diagnostics.
3. Drive preview and export from the same normalized recipe and resolved scene.
4. On unmount, abort event listeners, unsubscribe store observers, invalidate pending paints, and clear the host. The reference adapter's `destroy()` does all four.
5. Mount at most one editor instance in a host element. Destroy the previous instance before remounting.
6. Keep styles scoped to the host application. The example stylesheet in [`examples/vanilla-js/example.css`](examples/vanilla-js/example.css) is a starting point, not a required runtime dependency.

## CSP and browser requirements

The 0.1 browser target requires ES2022 modules, Canvas 2D, `fetch`, `URL`, `AbortController`, and native form controls. Browser-side schema parsing currently uses Ajv runtime compilation. A host that performs that parsing must either precompile validators or allow the narrowly scoped `script-src 'unsafe-eval'` exception documented in [`docs/INTEGRATION.md`](docs/INTEGRATION.md). A renderer-only host consuming already validated typed data does not need that exception.

If images are served from another origin, allow only that asset origin in `img-src` and `connect-src`. Asset manifests must continue to contain safe relative paths.

## Mount validation checklist

- The saved recipe renders before any editor is mounted.
- Equip, export, undo, and import work without repository-internal imports.
- Unmount leaves zero children in the host element.
- Remount creates exactly one responsive editor and one canvas.
- Repeated mount/unmount cycles do not duplicate listeners or renders.
- The asset base works from a nested route and after production deployment.
- Keyboard focus, labels, reduced motion, and a 320 CSS-pixel viewport remain usable.

See [`examples/vanilla-js/`](examples/vanilla-js/) for the executable host and [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for recipe, error, URL, compatibility, and security details.
