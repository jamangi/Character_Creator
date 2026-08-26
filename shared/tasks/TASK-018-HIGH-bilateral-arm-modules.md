# TASK-018-HIGH-bilateral-arm-modules

- **Status:** DONE
- **Outcome:** The Studio offers independently removable left- and right-arm replacement assets with complete output and retained-motion coverage.
- **Tracks:** CHANGE-006
- **Depends on:** 004, 010, 011
- **Unblocks:** 019 and 016
- **Owned paths:** rig slot/coverage vocabulary as required, starter base/body-module generation, manifests and recipes, validator fixtures, Studio catalog, `site/validation/task-018/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`, especially “Replacement limbs and body parts”
- `shared/ASSET_CONTRACT.md`
- `shared/STARTER_ASSET_PACK.md`
- `shared/CHANGE_REQUESTS.md` (`CHANGE-006`)
- `shared/tasks/TASK-011-HIGH-animation-fragment-motion.md`

## Context

The starter pack exposes replacement artwork for only one arm slot. The owner wants explicit Left arm and Right arm choices so either replacement can be equipped or removed independently. Existing laterality labels must be audited because screen-left and character-left are easy to confuse.

## Scope

- Expose explicit `body-arm-left` and `body-arm-right` slots in the rig and Studio.
- Supply mirrored left/right variants of the current crystal and vine arm modules with correct human-readable labels.
- Split base-arm fragments as needed so either module suppresses and replaces only its declared side.
- Supply portrait, full-body, and all retained front idle/walk/run artwork and coverage for both sides.
- Add independent equip/remove, simultaneous equip, seam, coverage, and motion regressions.

## Non-goals

- Expanding animation beyond the approved front idle/walk/run scope.
- Arbitrary cross-rig arm mirroring at runtime.
- Changing arm palette identity; Task 019 owns separate left/right colors.

## Acceptance criteria

- [x] Left and Right arm categories are explicit and independently equipable/removable.
- [x] Removing either replacement restores only that side's base arm with no coverage error.
- [x] Both sides can be equipped together when otherwise compatible.
- [x] Full-body and retained sprite frames preserve seams, attachment, and motion on both sides.
- [x] Laterality labels match the character's anatomical left/right.
- [x] Validator, hero, and adversarial regressions pass.
- [x] Relevant schema/contract documentation is updated if vocabulary changes.

## Validation

Run `pnpm validate`, the starter validator, deterministic generation twice, and browser equip/remove checks for each side and both sides together.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-018/`

Publish labeled base, left-only, right-only, and both-arm full-body renders plus retained walk/run strips. Acceptance requires explicit laterality, seam, removability, and motion approval.

## Handoff notes

Base body art now has separate anatomical left/right fragments in portrait, full body, and every retained sprite frame. The existing generic crystal/vine IDs were corrected to anatomical Right arm (screen-left in a front view); new `*-left` mirrored assets occupy `body-arm-left`. Each module suppresses only `body.arm.<side>.base` and provides only `body.arm.<side>.skin`. Automated equip/remove, simultaneous, coverage, palette, and exact retained-frame regressions pass. The owner accepted Task 018 on 2026-08-26; `CHANGE-006` is delivered.
