# TASK-010-HIGH-animation-release-scope

- **Status:** BLOCKED
- **Outcome:** Make the starter rig's advertised animation selectors exactly match the release scope approved by the owner.
- **Tracks:** DEFECT-002, DEFECT-003, DEFECT-004, CHANGE-003
- **Depends on:** 001, 002, APPROVAL-001
- **Unblocks:** 011, 016 and completion review for 006–007
- **Owned paths:** starter-rig clip/profile definitions and fixtures, related schema/type contract only if required, `shared/ARCHITECTURE.md`, `shared/ASSET_CONTRACT.md`, `shared/STARTER_ASSET_PACK.md`, Task 006–007 claims and generated metadata

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`
- `shared/ASSET_CONTRACT.md`
- `shared/DEFECTS.md` (`DEFECT-002` through `DEFECT-004`)
- `shared/CHANGE_REQUESTS.md` (`CHANGE-003`)
- `root/APPROVALS.md` (`APPROVAL-001`)

## Context

Task 006 technically resolves `idle`, `sit`, `walk`, and `run` in four directions, but human review found that back-facing, lateral, and seated requests do not visually implement their advertised meaning. This is a contract/scope issue before it is an art issue. The recommended release choice is to keep the engine vocabulary extensible while narrowing only `starter-humanoid@1` to front-facing `idle`, `walk`, and `run`.

This task has authority to refine the executable starter-rig contract and the draft shared documents, but it must not choose the product scope before APPROVAL-001 is recorded.

## Scope

- Apply the selector set chosen in APPROVAL-001 to the starter rig, pack metadata, fixtures, generators, validation, and public claims.
- Preserve general engine support for future rigs to declare additional directions and clips.
- Remove obsolete generated requests and fallback claims when the approved scope narrows.
- Ensure unsupported requests fail with structured diagnostics rather than silently resembling another selector.
- Resolve `DEFECT-002`, `DEFECT-003`, and `DEFECT-004` either through correct implementation or an explicit removal from advertised release coverage, according to the approval.

## Non-goals

- Repairing motion of equipped fragments in retained walk/run frames; Task 011 owns that work.
- Authoring unapproved back, lateral, or seated art.
- Removing extensibility from the cross-pack schema merely because the starter rig uses a smaller selector set.

## Acceptance criteria

- [ ] APPROVAL-001 records the chosen release selector set.
- [ ] The starter rig, generator, pack metadata, tests, and Pages copy advertise exactly the same clips and directions.
- [ ] A request outside the advertised set fails clearly and cannot resolve through a misleading static or front-facing fallback.
- [ ] General schema/core APIs remain capable of representing future rig-defined clips and directions unless the approval explicitly says otherwise.
- [ ] `DEFECT-002`, `DEFECT-003`, and `DEFECT-004` each record an independent resolution.
- [ ] Relevant documentation is updated without claiming Task 006 human acceptance.

## Validation

Run `pnpm validate`, regenerate the starter pack and review metadata, and add selector-boundary tests for every retained and removed request. Audit the generated atlas/frame list against the approved selector matrix.

## Human validation

- **Required:** No
- **Pages path:** Not applicable

The product decision itself is the owner checkpoint in APPROVAL-001. Visual quality of the retained animation scope is reviewed by Tasks 011 and 016.

## Handoff notes

Record the approved selector matrix, compatibility impact, migrated or removed generated files, closed defect IDs, and any follow-up tasks required if the full-scope option is selected.
