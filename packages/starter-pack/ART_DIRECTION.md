# Starter pack art direction

## Shape language

- Clean dark-violet contours, rounded modular shapes, one offset shadow, and a small highlight.
- Portrait, full-body, and sprite outputs share silhouette cues rather than unrelated redraws.
- Back masses, coat tails, wings, and rear accessories use back planes; bangs, lapels, glasses, and held objects use front planes.
- Transparent padding always matches the full rig canvas. The renderer never needs asset-specific cropping code.

## Palette roles

The pack uses semantic roles (`skin.base`, `skin.shadow`, `mouth.base`, `eyes.iris`, `hair.base`, `garment.primary`, `garment.secondary`, `marking.base`, `accent.base`, and `crystal.base`). Eight skin palettes document light-to-dark defaults. Exact authored role colors act as per-fragment masks; linework, alpha, and fixed highlight colors remain authored while the renderer recolors only matching role pixels.

Portrait art omits base legs and the profile hides bottom/shoe content. Sprite output hides mouth content. These are presentation rules only; all equipped choices remain in the canonical recipe.

## Export settings

- Lossless RGBA PNG, sRGB, straight alpha, full-canvas dimensions.
- Portrait 256×256, full-body 256×384, sprite 96×96, thumbnails 96×96.
- Smooth sampling for portrait/full-body and nearest-neighbor for sprites.
- Sources and manifests use lowercase safe relative paths.

## Review ownership

Automated geometry, selector, contact, budget, and distribution checks belong to the validator. A human reviewer owns aesthetic appeal, line consistency, seams, occlusion, recolor quality, motion readability, and the final Task 007 sign-off.
