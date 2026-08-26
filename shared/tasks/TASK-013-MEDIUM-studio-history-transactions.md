# TASK-013-MEDIUM-studio-history-transactions

- **Status:** BLOCKED
- **Outcome:** Palette edits and hero-template selections behave as exact, visible, one-step Undo/Redo transactions.
- **Tracks:** DEFECT-005, DEFECT-006
- **Depends on:** 003, 020
- **Unblocks:** 016 and completion review for 005
- **Owned paths:** `packages/creator-ui/`, Studio history bindings in `apps/studio/`, history fixtures/tests, `site/validation/task-005/`

## Required reading

- `shared/README.md`
- `shared/ARCHITECTURE.md`
- `shared/DEFECTS.md` (`DEFECT-005`, `DEFECT-006`)
- `shared/tasks/TASK-005-HIGH-creator-studio.md`

## Context

After Tasks 012 and 019–020 establish correct rendering and the final palette vocabulary, palette and reset operations still need reliable recipe transactions. Color inputs may emit multiple events per gesture, and human review could not verify that palette changes or hero-chip resets were truly reversible. The fix must make recipe history and rendered state agree, not merely change a button's enabled state. Waiting for Task 020 avoids writing history and migration assertions against palette keys that are about to change.

## Scope

- Eliminate or derive any transient visual state that can disagree with the current recipe after Undo/Redo.
- Make one deliberate palette interaction one history transaction while retaining useful live preview behavior.
- Make one hero-template selection one history transaction.
- Preserve exact recipes across Undo/Redo, including palettes, seed, metadata, and equipped selections.
- Add independent regression coverage for `DEFECT-005` and `DEFECT-006`.

## Non-goals

- Adding selective history, branching history, persistence across reloads, or a visible history timeline.
- Putting preview-tab changes into recipe history.
- Changing portrait or sprite projection policy.

## Acceptance criteria

- [ ] One completed palette edit adds exactly one history entry.
- [ ] Undo and Redo restore both exact exported JSON and the visible palette result.
- [ ] Selecting a hero chip can be undone and redone as one transaction with exact equipped assets and palette values.
- [ ] Preview-only changes do not add history entries.
- [ ] A new recipe mutation after Undo clears the redo branch.
- [ ] `DEFECT-005` and `DEFECT-006` pass independent unit and browser regressions.
- [ ] Relevant documentation is updated.

## Validation

Run `pnpm validate`; add CreatorStore transaction-count and byte-stable recipe tests; exercise palette → Undo → Redo and edited character → hero chip → Undo → Redo in the Studio using keyboard and pointer input.

## Human validation

- **Required:** Yes
- **Pages path:** Main Pages route plus `site/validation/task-005/`

Update review step 4 to contain separate palette-history and hero-template-history checks. Acceptance requires the reviewer to confirm both visible state and exported JSON return exactly.

## Handoff notes

Record the final transaction boundary, treatment of live color input, defect closures, and visual review result. Do not mark Task 005 complete until Task 014 and Task 016 also pass.
