# `@character-creator/schema`

Executable v0.1 contracts for rigs, asset packs, assets/fragments, character recipes, and structured diagnostics.

## Public entry points

- `parseRig`
- `parseAssetManifest`
- `parseAssetPack`
- `parseCharacterRecipe`
- `validateAssetCatalog`
- `validateRecipeSelection`
- normalization helpers and public TypeScript types

All parse functions return `{ ok, value, diagnostics }`; untrusted input is never thrown through as an application exception. JSON Schemas are published under the `./schemas/*` export.

The v0.1 rig/fragment contract includes semantic output projection (`hiddenSlots`/`contentSlots`) and coupled animation coverage (`motionGroup`). Missing visible motion groups use the stable `MOTION_FALLBACK_UNSAFE` diagnostic.

## Compatibility policy

Schema version `0.1.0` is closed by default: unknown fields are errors. Extensions must live under the explicit `extensions` object and use a namespaced key such as `example-plugin.feature`. This prevents a misspelled contract field from being silently accepted while retaining an intentional forward-compatible escape hatch.

Run `pnpm typecheck` and `pnpm test` from the repository root to validate the contracts and fixture table.
