# TASK-015-LOW-expression-intent-mapping

- **Status:** READY
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

- [ ] Positive expressions no longer read as frowns.
- [ ] Thoughtful, concerned, and annoyed do not read as cheerful smiles.
- [ ] Smirk remains asymmetric and distinct from cheerful.
- [ ] All 12 presets remain recognizably differentiated by the combined eye/brow/mouth result.
- [ ] Generator reruns are deterministic and all automated validation passes.
- [ ] `CHANGE-004` passes visual review on all three hero sheets.
- [ ] Relevant documentation is updated.

## Validation

Run `pnpm validate`, regenerate the starter pack and review artifacts twice, compare hashes, and inspect labeled expression sheets at native and enlarged scale.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-007/`

Publish updated labeled expression sheets for all three heroes. Acceptance requires explicit confirmation of expression polarity and useful differentiation, independent of animation review.

## Handoff notes

Record the final expression-to-mouth mapping, regenerated baselines, request status, and human result. Do not mark Task 007 complete until the animation remediation and Task 016 also pass.
