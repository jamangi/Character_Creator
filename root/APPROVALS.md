# Approvals

## APPROVAL-001 — starter animation scope for the first release

- **Status:** APPROVED — OPTION 1
- **Needed before:** TASK-010 begins
- **Raised:** 2026-08-26
- **Approved:** 2026-08-26

### Context

Task 006 human review found three separately tracked coverage defects: the advertised back view uses front-facing equipped fragments (`DEFECT-002`), left/right do not communicate a lateral orientation (`DEFECT-003`), and `sit` is visually the idle pose (`DEFECT-004`). The owner proposed removing those selectors so the first release can focus on front-facing idle, walk, and run plus the independent stuck-fragment repair.

### Options

1. **Reduce only the starter-rig release scope (recommended).** `starter-humanoid@1` advertises front-facing `idle`, `walk`, and `run`. Back, left, right, and `sit` are deferred. The general schema and engine remain capable of future rig-defined directions and clips.
2. **Keep the full Task 006 scope.** Author correct base, clothing, hair, accessory, asymmetry, and seated art for all four directions and four clips before release. This requires additional high-effort art/animation tasks before Task 011 can finish.

### Consequences

Option 1 makes the first release smaller but honest, removes misleading generated coverage, and isolates Task 011 to repairing visible layers in the useful walk/run cycles. Option 2 preserves the original feature breadth but substantially expands art, validation, and review work. Either choice requires the rig, generator, validator, shared docs, task claims, and Pages artifacts to agree.

### Decision

The owner approved Option 1. `starter-humanoid@1` will advertise front-facing `idle`, `walk`, and `run` for the first release. Back, left, right, and `sit` are deferred. The engine remains extensible for future rigs to define those selectors. Task 010 is now ready; Task 011 remains blocked only until Task 010 applies the approved scope.

---

## Standing defaults

The following defaults are recommended and may be changed later without invalidating the architecture:

- Start with one rig family and one illustration style.
- Use Canvas 2D as the first renderer.
- Treat the canonical source files as lossless PNGs initially; allow SVG and sprite-atlas adapters later.
- Keep the first release local-first with no account, cloud, marketplace, or remote asset execution.
- License the engine separately from asset packs so third-party packs can choose compatible licenses.

When an approval is needed, add a numbered entry with context, options, a recommendation, consequences, and the date by which a decision becomes blocking.
