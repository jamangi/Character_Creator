# Asset contract (draft v0.1)

This document is the human-readable contract for the first executable schema. The schema task may refine field names, but must preserve the behavior and invariants unless it records a deliberate architecture change.

## Design rule

An **asset** is the thing selected by the user. A **fragment** is one drawable contribution from that asset. A hairstyle, coat, or wing set is one asset even when it contributes many fragments across several planes.

## Manifest sketch

```json
{
  "schemaVersion": "0.1.0",
  "id": "starter.hair.long-wave",
  "version": "1.0.0",
  "kind": "hair",
  "display": {
    "name": "Long Wave",
    "tags": ["long", "wavy"],
    "thumbnail": "preview.png"
  },
  "compatibility": {
    "rigFamilies": ["starter-humanoid@1"],
    "engine": ">=0.1.0 <1.0.0",
    "fitTags": ["head:standard-v1"]
  },
  "equip": {
    "slots": ["hair"],
    "exclusiveGroup": "hair.primary",
    "requires": ["anchor:head.crown"],
    "conflicts": [],
    "provides": ["appearance:hair"]
  },
  "palette": {
    "roles": {
      "hair.base": { "default": "#382721", "mode": "multiply" },
      "hair.highlight": { "default": "#765247", "mode": "screen" }
    }
  },
  "effects": [],
  "fragments": [
    {
      "id": "portrait.back-mass",
      "selector": { "profile": "portrait", "view": "front", "expression": "*" },
      "source": "portrait/front/back-mass.png",
      "plane": "hair-back",
      "order": 0,
      "anchor": "head.origin",
      "pivot": [0.5, 0.5],
      "paletteRoles": ["hair.base", "hair.highlight"],
      "covers": [],
      "tags": ["hair.back"]
    },
    {
      "id": "portrait.bangs",
      "selector": { "profile": "portrait", "view": "front", "expression": "*" },
      "source": "portrait/front/bangs.png",
      "plane": "hair-front",
      "order": 0,
      "anchor": "head.origin",
      "pivot": [0.5, 0.5],
      "paletteRoles": ["hair.base", "hair.highlight"],
      "covers": [],
      "tags": ["hair.front"]
    }
  ],
  "fallbacks": [],
  "provenance": {
    "authors": ["Example Artist"],
    "license": "CC-BY-4.0",
    "source": null,
    "contentHash": "sha256-..."
  }
}
```

## Required manifest concerns

Every distributable asset needs:

- globally stable, namespaced ID and semantic version;
- manifest schema version and compatible engine/rig range;
- kind, display name, searchable tags, and thumbnail;
- owned slot(s), exclusivity behavior, requirements, conflicts, and provided capabilities;
- one or more fragments or a declared recipe-only bundle;
- palette roles with defaults and allowed recolor method;
- license, author/attribution, source provenance, and integrity hash;
- deterministic ordering inputs;
- a machine-generated validation report in release packs.

## Fragment selector and coverage

A selector may constrain:

- `profile`: `portrait`, `full-body`, or `sprite`;
- `view`: profile-defined view/direction;
- `expression`: rig-defined expression ID or wildcard;
- `clip`: `idle`, `sit`, `walk`, `run`, or a rig extension;
- `frame`: stable rig frame ID, not merely an array index;
- `variant`: a named style or fit variant.

The resolver chooses the most specific matching fragment, then follows only fallbacks permitted by the rig. Ambiguous equally specific matches are an error.

A fragment may additionally declare:

- `covers`: semantic regions for which it supplies required pixels;
- `suppresses`: base or equipped fragment tags it intentionally removes;
- `occludesWith`: one or more rig-defined masks;
- `anchor`, `offset`, `pivot`, and optionally attachment transforms;
- `plane` and bounded `order`;
- `bounds` and safe overflow intent;
- palette-role bindings and blend modes from an allowlist;
- hit-test/selection mask when transparent bounds would be misleading.

## Semantic planes

Each rig owns a closed, ordered list. A likely initial list is:

1. `far-back`
2. `hair-back`
3. `accessory-back`
4. `garment-behind-body`
5. `body-back`
6. `body-base`
7. `face-base`
8. `under-garment`
9. `garment-main`
10. `garment-overlap`
11. `face-features`
12. `hair-mid`
13. `hair-front`
14. `accessory-front`
15. `foreground`

Sprite rigs may use a more anatomical order per direction. Plane names are semantic API, not an invitation to add one plane per asset. Assets may set only a small local `order` within the plane range permitted for their kind.

## Slots, regions, capabilities, and fit tags

These concepts must remain distinct:

- A **slot** governs user selection and exclusivity, such as `hair` or `shoes`.
- A **coverage region** answers which required visual surface is supplied, such as `body.foot.left.skin`.
- A **capability** satisfies a dependency, such as `anchor:hand.left.grip` or `appearance:eyes`.
- A **fit tag** indicates authored geometric compatibility, such as `torso:standard-v1`.
- A **fragment tag** lets declarative effects target a specific drawable component.

Conflating these is a common source of fragile systems. Socks may occupy the `feet` slot, cover `body.lower-leg.*`, provide `appearance:feet`, require `fit:leg.petite-v1`, and suppress default lower-leg fragments—all without pretending those five ideas are one slot.

## Body modules and profiles

A body module is an ordinary data asset with permission to claim anatomy coverage. It must include:

- regions provided and base fragment tags suppressed;
- replacement anchors and their maximum allowed displacement;
- seam overlap zones or masks;
- compatible neighboring fit tags;
- full required motion/view coverage for the regions it replaces;
- a fallback policy of `forbidden` for anatomy-critical missing frames.

A body profile is a recipe bundle that equips a tested set of modules atomically. The UI should present profiles as the normal way to change proportions while leaving advanced individual-part mixing available only when compatibility checks pass.

## Rig-level asset requirements the initial proposal was missing

- canonical canvas dimensions, origin, scale, and coordinate convention per profile;
- transparent padding rules, crop/safe areas, and overflow rules;
- anchor points, pivots, seam zones, and occlusion masks;
- animation frame IDs, duration, loop behavior, ground line, and foot-contact metadata;
- left/right mirroring policy—explicit artwork versus allowed reflection;
- nearest-neighbor versus smooth sampling and color-space expectations;
- premultiplied-alpha and edge-bleed requirements to avoid halos;
- palette role masks rather than a single global tint;
- item thumbnails and preview framing;
- accessibility metadata such as readable names and searchable tags;
- dependencies, incompatibilities, exclusivity, suppression, and fit tags;
- license, attribution, provenance, content hash, and content-safety metadata;
- file dimension/size limits and performance budgets;
- optional physics/secondary-motion grouping for future use, without runtime code;
- migrations, aliases, and deprecation information for renamed or replaced assets.

## Expression and motion vocabulary

The proposed expression list is a good content target, but it belongs to the rig and may be mapped from composable channels:

`neutral`, `smirk`, `concerned`, `focused`, `cheerful`, `annoyed`, `thoughtful`, `surprised`, `tired`, `confident`, `determined`, `playful`.

For authoring reuse, define an expression as eye/brow/mouth channel choices plus optional overrides. Face assets implement channels; a rig expression preset selects them. Assets such as a hand-to-chin pose may opt into an expression-specific override, but clothing should not duplicate twelve identical portrait files.

For sprites, prefer stable clips and frame IDs:

- `idle` and `sit`: directional, normally one or more explicitly timed frames;
- `walk` and `run`: directional cycles with named contact/pass frames and foot-contact metadata;
- `left` and `right`: may mirror only when the entire equipped draw list declares mirroring safe. Text, asymmetric accessories, scars, and handed items commonly forbid reflection.

## Validation levels

1. **Schema:** types, required values, known enum/rig names, safe paths.
2. **Files:** existence, dimensions, hashes, alpha, color profile, size budgets.
3. **Compatibility:** rig range, anchors, fit tags, dependencies, conflicts, cycles.
4. **Coverage:** all required render requests resolve without anatomy holes or forbidden fallback.
5. **Geometry:** anchor tolerance, seam overlap, bounds, ground/foot contact.
6. **Visual:** generated contact sheets, hero recipes, pairwise combinations, and regression diffs.
7. **Distribution:** license, attribution, provenance, duplicate IDs, package integrity.

Warnings are acceptable only for conditions explicitly marked non-fatal. Release packs must pass levels 1–5 and 7; level 6 requires human sign-off as well as automated comparison.
