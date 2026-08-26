# TASK-017-MEDIUM-selected-mouth-dominance

- **Status:** IN PROGRESS
- **Outcome:** The equipped mouth defines the neutral portrait/full-body mouth, while named non-neutral expressions retain their expression-authored curves.
- **Tracks:** CHANGE-005
- **Depends on:** 002, 003
- **Unblocks:** 016 and completion review for 005
- **Owned paths:** starter face-channel generation and assets, resolver/render regressions, Studio mouth selection proof, `site/validation/task-017/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`, especially “Expressions and animation cost”
- `shared/ASSET_CONTRACT.md`
- `shared/CHANGE_REQUESTS.md` (`CHANGE-005`)
- `shared/tasks/TASK-005-HIGH-creator-studio.md`

## Context

The Studio exposes four mouth assets, but their portrait/full-body artwork currently resolves to the same neutral curve. Expression generation effectively erases the user's neutral mouth choice. The owner requires the equipped mouth to be the dominant neutral appearance; named expressions may continue to supply expression-specific mouth curves.

## Scope

- Give every selectable mouth asset a distinct neutral curve that is used in portrait and full-body output.
- Keep non-neutral expression presets expression-authored and independent from neutral mouth styling.
- Ensure switching the equipped mouth changes preview and exported portrait/full-body pixels without changing any unrelated selection.
- Preserve Task 014's sprite rule: equipped mouths remain in the recipe but are not drawn in sprite output.
- Publish a labeled comparison covering every mouth in neutral portrait and full-body output plus representative non-neutral expressions.

## Non-goals

- Adding expression IDs or changing expression polarity accepted under Task 015.
- Changing palette-role vocabulary or history behavior.
- Showing mouths in sprite output.

## Acceptance criteria

- [ ] Every mouth choice has a visibly distinct neutral portrait and full-body result.
- [ ] Changing only the mouth selection changes neutral mouth pixels and no unrelated equipped choice.
- [ ] A representative non-neutral expression remains expression-authored for every mouth choice.
- [ ] Sprite output still omits the mouth without mutating the recipe.
- [ ] Preview and exported PNG use the same resolved scene.
- [ ] Automated regression and deterministic artifact generation pass.
- [ ] Relevant documentation is updated.

## Validation

Run `pnpm validate`, regenerate the starter pack and review artifacts twice, assert distinct neutral mouth image hashes/pixels, and exercise mouth selection plus portrait/full-body export in the Studio.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-017/`

Publish a four-mouth neutral comparison in portrait and full-body scale plus a representative non-neutral row. Acceptance requires confirmation that the selected mouth is evident in neutral output and expression presets still read correctly.

## Handoff notes

The owner pre-approved this as the first task in the follow-up remediation order on 2026-08-26. Record final curve mapping, test evidence, artifact provenance, and human result here.
