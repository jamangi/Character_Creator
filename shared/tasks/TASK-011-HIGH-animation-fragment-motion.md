# TASK-011-HIGH-animation-fragment-motion

- **Status:** IN PROGRESS
- **Outcome:** Every visible equipped fragment follows the pose and vertical motion of each retained starter-rig animation frame.
- **Tracks:** DEFECT-001
- **Depends on:** 010
- **Unblocks:** 016 and completion review for 006–007
- **Owned paths:** animation resolution and render-scene support in `packages/core/` and `packages/renderer-canvas/`, motion validation in `packages/asset-validator/`, starter motion assets/generator, animation fixtures, `site/validation/task-006/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`, especially “Expressions and animation cost”
- `shared/ASSET_CONTRACT.md`
- `shared/DEFECTS.md` (`DEFECT-001`)
- `shared/defects/DEFECT-001-animation-fragments-stuck/README.md`
- `shared/tasks/TASK-010-HIGH-animation-release-scope.md`

## Context

The current generator emits exact frame selectors for base bodies, body modules, and shoes, but emits direction-only sprite fragments for most other slots. Human evidence shows trousers, tops, outerwear, hair, glasses, and other attached layers staying still while anatomy strides or bobs beneath them. The correction must distinguish body-coupled motion from assets that are intentionally static.

## Scope

- Define the clean motion mechanism for retained frames: frame-specific art where silhouettes deform, and explicit rig-driven transforms only for rigid fragments that can safely move as a unit.
- Apply the mechanism to hair, tops, bottoms, outfits, outerwear, head/face layers, body modules, shoes, and representative accessories.
- Keep multi-plane fragments synchronized while preserving their named plane order.
- Extend validation so body-coupled slots cannot claim complete animation coverage while visibly falling back to a static pose.
- Regenerate the three hero cycles, atlas metadata, native-scale player frames, and a labeled before/after evidence sheet.

## Non-goals

- Reintroducing any selector removed by Task 010.
- Redesigning clip timing or foot-contact semantics unless a regression proves they are involved.
- Solving the portrait/sprite visibility requests from Task 014.

## Acceptance criteria

- [x] `DEFECT-001` is covered by a failing regression before the fix and passes afterward.
- [x] Bottoms/outfits follow retained leg strides; torso garments follow body bob; head-worn layers follow head motion.
- [x] Multi-plane hair and outerwear remain synchronized without crossing their declared layer order.
- [x] Asymmetric and rigid accessories use explicit legal motion behavior and do not drift from their attachment.
- [x] Validator output identifies missing body-coupled motion coverage by stable diagnostic code.
- [x] All three hero recipes pass automated retained-frame coverage and pixel/scene-difference checks.
- [ ] Task 006's updated motion artifact passes human review at native and enlarged scale.
- [x] Relevant documentation is updated.

## Validation

Run `pnpm validate`, the starter-pack validator, and deterministic artifact generation twice. Add scene-coordinate assertions for coupled fragments, representative pixel diffs across consecutive walk/run frames, and a negative fixture for a static garment fallback.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-006/`

Publish labeled before/after frame strips for `DEFECT-001` and retained cycles for all three heroes. Ask whether clothing follows stride, upper layers follow bob, attachments remain connected, and the silhouettes read continuously without jitter. Acceptance is an explicit approval of the repaired retained scope.

## Handoff notes

Every visible starter slot now uses exact authored frame art grouped by `motionGroup`; no starter asset currently claims `motion.static-safe`. The new stable validator diagnostic is `MOTION_FALLBACK_UNSAFE`. All 9-frame hero baselines and the Task 006 before/after sheet were regenerated. DEFECT-001 is `READY FOR REVIEW`; human acceptance remains unchecked and Task 006 stays in progress until Task 016.
