# TASK-006-HIGH-animation-pipeline

- **Status:** IN PROGRESS
- **Outcome:** Resolve, preview, and export complete directional idle/sit/walk/run sprite animations with reliable timing and foot contact.
- **Depends on:** 002, 004
- **Unblocks:** 007, 008
- **Owned paths:** animation modules in core/renderer, atlas exporter, sprite fixtures, `site/validation/task-006/`, `site/validation/index.json`

## Scope

- Implement rig-defined clips, named frames, durations, loops, pivots, ground line, and foot-contact metadata.
- Implement explicit left/right art and safe mirroring rules.
- Validate anatomy-critical frame coverage and legal fallback.
- Export individual frames, metadata, and deterministic packed atlases.
- Add preview playback with frame stepping and overlays for pivot, bounds, ground, and contacts.

## Acceptance criteria

- [x] All four clips resolve in four directions for the proof assets.
- [x] Asymmetric assets never mirror unless explicitly safe.
- [x] Foot contact remains within rig tolerance across compatible body/shoe combinations.
- [x] Atlas coordinates and metadata are deterministic.
- [x] Missing critical motion artwork is an error, not a silent static fallback.
- [x] Pages provides native-scale and enlarged playback with frame-step and overlay controls.

## Validation

Frame-resolution unit tests, atlas reproducibility tests, ground/contact checks, pixel diffs, and native-scale looping visual review.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-006/`

Publish all clips and directions at native and enlarged scale, including the asymmetric no-mirror case. Ask the reviewer to inspect timing, foot sliding, ground contact, jitter, silhouette continuity, and directional consistency.

## Handoff notes

- Added rig-driven animation resolution, explicit safe-mirroring checks, critical-frame enforcement, duration/contact/ground metadata, numeric contact tolerance, and deterministic shelf atlas packing.
- The starter pack supplies exact base/body-module/shoe art for every `idle`, `sit`, `walk`, and `run` frame in all four directions; the asymmetric hero uses explicit left and right artwork.
- Human review accepted ground contact and native-scale timing on 2026-08-26, but rejected visual motion coverage.
- `DEFECT-001` records static equipped layers over moving anatomy. `DEFECT-002`, `DEFECT-003`, and `DEFECT-004` independently record incorrect back, lateral, and seated meaning.
- Task 010 owns the release-scope decision/contract correction; Task 011 owns retained-frame motion repair. The task remains `IN PROGRESS` until the resulting animation checkpoint is accepted.
