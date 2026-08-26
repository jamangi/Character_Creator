# Architecture

## Recommendation

Use a hybrid of the bald-base and build-a-bear approaches, built around a **canonical rig family** and **semantic coverage**.

The default path is a complete base body with layered equipables. Build-a-bear behavior is supported through body modules that replace explicit regions. Modules that were designed together may declare an atomic compatibility set, allowing a petite or broad body treatment to replace several regions as one coherent choice. This avoids both extremes: a small catalog of inflexible premade characters and an unbounded pile of parts whose seams, proportions, and poses cannot be validated.

Premade characters still have a place: they are saved recipes plus curated asset packs. They become showcases and test fixtures rather than a separate architecture.

## Core model

```text
CharacterRecipe + AssetCatalog + RigDefinition + RenderRequest
                              |
                         validate/migrate
                              |
                    resolve slots and effects
                              |
               coverage check + ordered draw list
                              |
                     renderer backend (Canvas)
                              |
           portrait / full-body / sprite frames + report
```

### Character recipe

A recipe stores identity and choices: schema version, rig family, equipped asset IDs, palette-role values, body parameters, optional text metadata, and deterministic variant/seed values. It does not store filesystem paths, arbitrary code, or rendered pixels.

### Rig definition

A rig defines the common language an asset pack targets:

- render profiles and canvas dimensions;
- views, poses, animation clips, frame IDs, pivots, and frame timing;
- named anchors such as `head.crown`, `hand.left.grip`, and `foot.right.sole`;
- named coverage regions such as `body.head.skin`, `body.arm.left.skin`, and `face.eyes`;
- allowed semantic planes and their total order;
- safe bounds, occlusion masks, hit-test regions, and pixel-sampling rules;
- required coverage for each render request.

A different anatomy, projection, pixel grid, or animation timing normally means a different rig family. Compatibility should be declared, never guessed from filenames.

### Asset bundle

An asset bundle is one selectable thing. It contains a manifest and zero or more fragments. Each fragment targets a render profile/view/pose/frame selector, a named plane, an anchor/pivot, and an image or mask. This directly solves multi-layer items: one hair asset can contribute back, middle, and front fragments while remaining one equip choice.

### Resolver

The resolver is the heart of the product. It:

1. normalizes the recipe and expands body profiles/outfits;
2. verifies rig and engine compatibility;
3. evaluates requirements, conflicts, and declared effects;
4. selects the best fragment variants for the render request;
5. applies suppression and occlusion masks;
6. verifies required semantic coverage;
7. sorts fragments deterministically by rig plane, asset priority within its allowed band, stable asset ID, and fragment ID;
8. returns a draw list and structured warnings/errors.

No renderer-specific object should leak into this step.

Render profiles may declare semantic `hiddenSlots`, and multi-slot fragments may refine their contribution through `contentSlots`. The resolver applies that projection before coverage and draw-list construction, so every renderer and export adapter sees the same intentional portrait/sprite visibility without changing the recipe.

## Solving the difficult cases

### Hair in front of and behind the head

Ship one `hair` asset with multiple fragments, for example `back-mass` on `hair-back`, `side-locks` on `hair-mid`, and `bangs` on `hair-front`. All fragments share the same color roles and selection state. The item owns the `hair` slot once, not once per fragment.

### Jacket tail behind the thighs

Split the jacket into logical fragments: back/tail, torso, sleeves, and foreground trim. The tail can sit on `garment-behind-body`; the torso and sleeves sit on their prescribed garment planes. View-specific occlusion masks prevent hidden pixels from bleeding through.

### Replacement limbs and body parts

The module claims coverage tokens and suppresses the corresponding base fragments. The starter base publishes separate anatomical left/right arm fragments; `body-arm-left` and `body-arm-right` replacements suppress only their matching `body.arm.<side>.base` tag and claim only `body.arm.<side>.skin`. In a front view, character-left is screen-right. The resolver rejects the character if required coverage is missing after suppression.

For changes that alter silhouette, garment fit, or several anchors, prefer an atomic **body profile** containing the coordinated head/torso/limb modules plus a compatibility tag such as `fit:petite-v1`. Clothing can declare which fit tags it supports. This is more reliable than pretending every arm fits every sleeve.

### Items that affect other slots

Use declarative effects, not asset code. Effects may suppress a coverage region, hide a named fragment tag, provide a replacement, require another capability, or select a compatible variant. For example, petite socks may provide `body.lower-leg.*` coverage and suppress the default lower-leg skin. Effects are limited to schema-defined operations and are reported to the UI before equip is committed.

### Expressions and animation cost

Do not require every item to contain the full Cartesian product of expressions, views, poses, directions, and frames. Coverage is scoped:

- Hair and hats usually provide portrait/full-body view fragments and sprite direction/animation fragments, but reuse the same fragment across facial expressions.
- Eyes, brows, and mouths provide expression variants but do not need walking-leg variants.
- An equipped mouth asset defines the neutral/dominant mouth channel in portrait and full-body output. Named non-neutral expression presets may override its curve so expression intent remains consistent across mouth selections.
- Pants and shoes provide motion-frame variants but do not need portrait fragments unless visible in the portrait crop.
- A static accessory may declare a safe fallback from `walk.left-leg` to `walk.default`; a foot or leg asset may not.

The rig defines legal fallback chains. The validator rejects fallbacks that would visibly break required motion or anatomy.

### Stable palette identity

Palette addresses describe semantic ownership, not equip order. Starter body/clothing roles are `skin.base`, `hair.base`, `garment.top`, `garment.bottom`, `garment.outfit`, `garment.outerwear`, `garment.shoes`, `body.arm.left`, and `body.arm.right`. Accessory roles follow slots: `accessory.hat`, `.face`, `.ear`, `.neck`, `.handheld`, `.back`, `.waist`, and `.charm`. An unequipped role is retained as a deterministic no-op, so colors do not move when another item is equipped or removed.

Schema 0.1 normalization preserves broad legacy keys while deriving missing slot-scoped values. Explicit new values always win; the compatibility projection is deterministic and source-preserving.

Executable sprite fragments identify their coupled part with `motionGroup`. Every visible group needs exact art for an advertised frame unless the asset explicitly provides `motion.static-safe`; otherwise animation resolution emits `MOTION_FALLBACK_UNSAFE`.

The first `starter-humanoid@1` release intentionally advertises only front-facing `idle`, `walk`, and `run` (9 requests). Back, left, right, and `sit` remain representable for future rigs but are not starter-pack claims.

## Planned package boundaries

```text
packages/
  schema/             JSON Schema, public types, migrations
  core/               catalog, recipe normalization, resolver, diagnostics
  renderer-canvas/    Canvas 2D draw and export adapters
  asset-validator/    CLI/library validation and contact-sheet generation
  starter-pack/       first rig and reference assets
  creator-ui/         framework-neutral state/view model where practical
apps/
  studio/             reference browser/editor and visual test site
examples/
  vanilla-js/         copy/import integration example
fixtures/
  valid/              small conformance fixtures
  invalid/            one fixture per important diagnostic
```

Suggested published modules are independently importable. A consuming project should be able to use `schema + core + one renderer` without the Studio UI.

## Public API shape

The exact naming is deferred to implementation, but the capability boundary should remain small:

```js
const catalog = await loadAssetPacks([starterPack]);
const creator = createCharacterCreator({ catalog, renderer });

const result = await creator.render(recipe, {
  profile: "sprite",
  clip: "walk",
  direction: "left"
});

const saved = creator.exportRecipe(recipe);
const imported = creator.importRecipe(saved);
```

Rendering should return output plus diagnostics and provenance sufficient to reproduce it.

## Development stages

### Stage 1 — executable contracts

Define schemas, TypeScript types, rig vocabulary, fixtures, migrations, and diagnostics. Prove that invalid combinations fail predictably before building UI.

### Stage 2 — vertical composition slice

Render one base, one two-plane hairstyle, one ordinary garment, and one replacing body module in portrait, full-body, and a minimal sprite frame set. This tests the architecture before commissioning a large catalog.

### Stage 3 — save portability and asset tooling

Implement canonical recipe import/export, schema migration, a validator CLI, contact sheets, seam/coverage checks, and asset-pack reports. Artist feedback must be fast and local.

### Stage 4 — creator Studio

Build catalog browsing, equip/unequip, palette controls, undo/redo, diagnostics, randomization constraints, and export. The Studio consumes the same public packages as third-party hosts.

### Stage 5 — animation and full starter pack

Complete each rig's explicitly advertised clip/direction matrix, frame timing, atlas export, and the aesthetic test pack. Add automated permutation sampling and visual regression baselines.

### Stage 6 — integration and release hardening

Ship a vanilla JS example, packaging, API docs, performance budgets, accessibility, licenses/attribution, and compatibility guarantees.

## Major risks and mitigations

- **Combinatorial visual defects:** constrain rig families and fit tags; generate pairwise permutation contact sheets; maintain hero recipes and adversarial recipes.
- **Asset-author burden:** allow scoped coverage and rig-defined fallback; provide templates and validation with precise errors.
- **Seams in replacements:** require overlap zones, anchor tolerances, coverage masks, and body-profile bundles for proportion-changing swaps.
- **Layer-order chaos:** use a closed set of semantic planes and bounded local priority.
- **Recipe rot:** use stable IDs, semantic versions, content hashes, aliases, and deterministic migrations.
- **Canvas performance/memory:** cache decoded fragments and resolved draw lists, atlas sprite assets, and enforce dimensions/file-size budgets.
- **Third-party safety:** data-only manifests, no remote code, sanitized metadata, explicit URL policy, integrity hashes, and license metadata.
