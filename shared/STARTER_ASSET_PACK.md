# Starter asset pack

## Goal

The first pack is not a content-volume contest. It must prove that the system can produce several genuinely attractive, recognizably different characters and also expose layering, seam, recolor, and animation failures. Commissioning hundreds of assets before the vertical slice passes would multiply rework.

Use one coherent art direction, one rig family, one line-weight/shading guide, and a shared palette-role system. Build three polished **hero recipes** first, then fill the test matrix around them.

## Recommended first package

### Foundation

- 1 humanoid rig family with portrait, full-body, and sprite profiles.
- 3 coherent body profiles on that rig: standard, petite, and broad. Each is a tested module bundle, not an arbitrary limb assortment.
- 8 representative skin tones with documented highlight/shadow behavior.
- 3 head shapes, 3 nose treatments, 4 eye shapes, 4 brow sets, and 4 mouth sets.
- All 12 expression presets, implemented through reusable face channels.

### Hair and distinguishing features

- 8 hairstyles: bald, cropped, bob, long straight, long wavy, ponytail, textured/coiled, and one dramatic asymmetric style.
- At least 4 styles must use multiple planes; at least 2 must cross the shoulder/torso silhouette.
- 4 markings/facial details: freckles, scar, makeup/liner, and fantasy marking.
- 2 ear variants plus 1 non-human ear option, if the art direction supports it.

### Clothing

- 4 tops: fitted shirt, loose shirt, sweater, and formal layer.
- 3 bottoms: fitted pants, loose pants/skirt silhouette, and shorts/skirt alternative.
- 3 one-piece or outer layers: simple outfit, short jacket, and long/tailed coat.
- 4 shoes: low shoe, boot, tall boot, and a foot-replacing fantasy or stylized option.
- 2 glove/arm items, including one that replaces or substantially changes the arm silhouette.
- At least one complete outfit for each body profile and two recolorable shared outfits.

### Accessories and stress cases

- Hat that must interact with hair via a hat-compatible hair variant or mask.
- Glasses, earrings, necklace/scarf, handheld item, and back item such as wings or a backpack.
- One asymmetric item that forbids left/right sprite mirroring.
- One item occupying multiple slots.
- One item with a dependency, one intentional conflict, and one declarative cross-slot suppression.

### Sprite coverage

- `idle`, `sit`, `walk`, and `run` in front, back, left, and right directions.
- Walk/run cycles should use named contact/pass frames rather than only `left_leg` and `right_leg`; a useful first cycle is four frames per direction, with timing and foot-contact metadata.
- Three hero recipes must have complete, hand-reviewed sprite coverage before the broader matrix is called release-ready.

## Three hero recipes

The pack should intentionally show range while staying within one art style:

1. **Everyday layered:** standard body, multi-plane long hair, shirt, pants, short jacket, glasses, and handheld item.
2. **Silhouette replacement:** petite body profile, asymmetrical hair, arm/foot replacement, fitted outfit, and an accessory that forbids mirroring.
3. **Occlusion stress:** broad body profile, textured or voluminous hair, long tailed coat, hat/hair interaction, and back item.

Each hero gets the complete expression sheet, four-view full-body turnaround, and directional sprite sheet. These are the visual bar and regression baselines.

## Combination test matrix

Generate and review:

- all hero recipes in all required outputs;
- every hairstyle against every head and outer layer in front/back full-body views;
- every body profile against every advertised compatible top, bottom, and shoe;
- pairwise combinations covering each slot, fit tag, plane, suppression effect, and palette role;
- extreme light/dark and saturated/desaturated palette values;
- adversarial recipes with the largest allowed bounds and most simultaneous fragments;
- expected failures for missing coverage, incompatible fit, ambiguous fragment selection, bad anchors, and unsafe mirroring.

The validator should emit labeled contact sheets so art review does not require clicking through the creator one combination at a time.

## Art delivery checklist

- Files match the rig templates exactly and retain transparent padding.
- Pivots, anchors, ground line, seams, and masks are included.
- Alpha edges have no light/dark matte halo.
- Palette masks preserve intentional line and highlight colors.
- Fragment IDs and file names match the manifest.
- Thumbnail and search metadata are present.
- All advertised selectors resolve; no anatomy-critical fallback is used.
- License and attribution are complete.
- Contact sheets pass both technical and visual review.
