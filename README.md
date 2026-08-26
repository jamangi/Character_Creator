# Character Creator

Character Creator is intended to be a portable JavaScript character-composition engine: a host application supplies asset packs and a UI, the engine produces a portrait, a full-body render, and animated directional sprites, and a versioned character recipe can be exported and imported without embedding image data.

**Human validation hub:** [jamangi.github.io/Character_Creator](https://jamangi.github.io/Character_Creator/)

## Product direction

The project will use a **hybrid modular rig**:

- A canonical base rig supplies anatomy, anchors, poses, and default coverage.
- Ordinary assets equip into semantic slots such as hair, eyes, top, shoes, and accessory.
- One logical item may contain several render fragments on different named planes. Long hair can have `hair-back` and `hair-front` fragments; a tailed jacket can render behind the legs and over the torso.
- Body modules may replace named regions such as the head, torso, arms, or legs. Replacements declare the regions they cover and the base regions they suppress.
- Coherence-sensitive replacements can be shipped as an atomic body profile instead of allowing every limb to be mixed freely.

This preserves the extensibility of a bald-base system while supporting the strongest part of a build-a-bear system. The engine is responsible for deterministic composition and validation; the visual quality remains primarily the responsibility of well-authored asset packs.

## Non-negotiable principles

1. **Recipes contain intent, not pixels.** A saved character refers to versioned asset IDs, palette choices, and options.
2. **Assets are data.** The core engine must not require code changes to add a conforming asset pack.
3. **Layering is named and deterministic.** Assets use declared planes and local ordering, never arbitrary global `z-index` values.
4. **Replacement is explicit.** An item cannot hide anatomy accidentally; it must claim coverage and declare suppression.
5. **Coverage is capability-based.** An asset states which render profiles, views, poses, and frames it supports. It need not duplicate unaffected artwork for every expression.
6. **Compatibility is validated before rendering.** Rig family, anchors, dimensions, dependencies, conflicts, masks, and licenses are machine-checkable.
7. **The core remains framework-agnostic.** UI adapters and render backends sit outside the character model and resolver.

## Repository map

This repository contains the design foundation, portable engine, editing Studio, validation tooling, animation exporter, and deterministic starter content:

- [`root/`](root/README.md) — root-task operating notes, decisions, approvals, and the task template.
- [`shared/`](shared/README.md) — architecture and contracts that every implementation task must follow.
- [`shared/DEFECTS.md`](shared/DEFECTS.md) and [`shared/CHANGE_REQUESTS.md`](shared/CHANGE_REQUESTS.md) — review findings, evidence, architecture impact, and builder ownership.
- [`shared/tasks/`](shared/tasks/README.md) — ordered, independently assignable development tasks.
- [`site/`](site/README.md) — the GitHub Pages review hub and published validation artifacts.
- [`packages/schema/`](packages/schema/README.md) — executable JSON Schemas, TypeScript contracts, diagnostics, and normalization.
- [`packages/core/`](packages/core/README.md) — framework-agnostic catalog and deterministic composition resolution.
- [`packages/renderer-canvas/`](packages/renderer-canvas/README.md) — Canvas 2D rendering of resolved draw lists.
- [`packages/asset-validator/`](packages/asset-validator/README.md) — seven-level asset-pack validation, contact sheets, and artist-facing reports.
- [`packages/creator-ui/`](packages/creator-ui/README.md) — framework-neutral editing state, history, catalog filtering, and recipe I/O.
- [`packages/starter-pack/`](packages/starter-pack/README.md) — CC0 starter content, hero recipes, art-direction references, and animation coverage.
- [`apps/studio/`](apps/studio/) — the responsive reference Creator Studio published at the Pages root.
- [`fixtures/`](fixtures/) — valid, invalid, recipe, animation, validator, and visual conformance fixtures.

The implementation layout and package boundaries are documented in [`shared/ARCHITECTURE.md`](shared/ARCHITECTURE.md).

## Start here

New tasks should read, in order:

1. [`shared/README.md`](shared/README.md)
2. [`shared/ARCHITECTURE.md`](shared/ARCHITECTURE.md)
3. [`shared/ASSET_CONTRACT.md`](shared/ASSET_CONTRACT.md)
4. Their assigned task in [`shared/tasks/`](shared/tasks/README.md)

Open product decisions that require owner input belong in [`root/APPROVALS.md`](root/APPROVALS.md). APPROVAL-001 selected the reduced first-release animation scope, now implemented by Task 010. Owner review accepted Tasks 011, 014, and 015 on 2026-08-26. Task 012 remains open while Tasks 017–020 address selected-mouth, bilateral-arm, and finer palette-control requests; Task 013 follows the stabilized palette vocabulary.

## Development validation

With Node.js and pnpm available:

```text
pnpm install
pnpm validate
pnpm visuals
pnpm validator --root packages/starter-pack --out artifacts/validator
pnpm starter-pack
pnpm review-artifacts
```

`pnpm validate` runs project-reference type checking and the full automated test suite. `pnpm visuals` regenerates the Task 002 fixtures; the remaining commands run the asset validator, regenerate the starter pack and Studio, and rebuild the Pages review artifacts.
