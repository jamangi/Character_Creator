# TASK-015-LOW-expression-intent-mapping

- **Status:** DONE
- **Outcome:** Starter-pack mouth curves communicate the intended positive, reflective, and negative expression groups.
- **Tracks:** CHANGE-004
- **Depends on:** 004
- **Unblocks:** 016 and completion review for 007
- **Owned paths:** starter-pack expression generator/data, expression fixtures, generated hero expression sheets, `site/validation/task-007/`

## Required reading

- `shared/README.md`
- `shared/STARTER_ASSET_PACK.md`
- `shared/CHANGE_REQUESTS.md` (`CHANGE-004`)
- `packages/starter-pack/ART_DIRECTION.md`
- `shared/tasks/TASK-007-HIGH-starter-asset-pack.md`

## Context

The current Canvas coordinate/sign mapping makes `cheerful`, `confident`, `playful`, and `smirk` read as frowns, while some concerned expressions read as smiles. This is a starter-art mapping issue, not a recipe-schema change.

## Scope

- Correct the mouth-curve sign convention.
- Give `cheerful`, `confident`, `playful`, and `smirk` upward corners at visibly different intensities or asymmetry.
- Give `thoughtful`, `concerned`, and `annoyed` neutral-to-downward corners while preserving their distinctions through eyes and brows.
- Regenerate all three hero expression sheets and affected assets deterministically.

## Non-goals

- Adding new expression IDs or mouth assets.
- Redesigning the face-channel schema.
- Treating every non-positive expression as the same frown.

## Acceptance criteria

- [x] Positive expressions no longer read as frowns.
- [x] Thoughtful, concerned, and annoyed do not read as cheerful smiles.
- [x] Smirk remains asymmetric and distinct from cheerful.
- [x] All 12 presets remain recognizably differentiated by the combined eye/brow/mouth result.
- [x] Generator reruns are deterministic and all automated validation passes.
- [x] `CHANGE-004` passes visual review on all three hero sheets.
- [x] Relevant documentation is updated.

## Validation

Run `pnpm validate`, regenerate the starter pack and review artifacts twice, compare hashes, and inspect labeled expression sheets at native and enlarged scale.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-007/`

Publish updated labeled expression sheets for all three heroes. Acceptance requires explicit confirmation of expression polarity and useful differentiation, independent of animation review.

## Handoff notes

Positive curves now use upward corners at three intensities, with `smirk` and `playful` asymmetric. `thoughtful` and `tired` are shallow downward/reflective curves; `concerned` and `annoyed` are stronger downward curves; `determined` remains firm. All three 12-expression sheets were regenerated deterministically. The owner accepted Task 015 on 2026-08-26; `CHANGE-004` is delivered.
