# Character Creator

Character Creator is intended to be a portable JavaScript character-composition engine: a host application supplies asset packs and a UI, the engine produces a portrait, a full-body render, and animated directional sprites, and a versioned character recipe can be exported and imported without embedding image data.

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

This repository currently contains the design and execution foundation:

- [`root/`](root/README.md) — root-task operating notes, decisions, approvals, and the task template.
- [`shared/`](shared/README.md) — architecture and contracts that every implementation task must follow.
- [`shared/tasks/`](shared/tasks/README.md) — ordered, independently assignable development tasks.

The intended implementation layout is documented in [`shared/ARCHITECTURE.md`](shared/ARCHITECTURE.md). Do not create the planned package directories until the task that owns them begins.

## Start here

New tasks should read, in order:

1. [`shared/README.md`](shared/README.md)
2. [`shared/ARCHITECTURE.md`](shared/ARCHITECTURE.md)
3. [`shared/ASSET_CONTRACT.md`](shared/ASSET_CONTRACT.md)
4. Their assigned task in [`shared/tasks/`](shared/tasks/README.md)

Open product decisions that require owner input belong in [`root/APPROVALS.md`](root/APPROVALS.md). There are no blocking approvals at present.
