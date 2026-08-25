# TASK-006-HIGH-animation-pipeline

- **Status:** BLOCKED
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

- [ ] All four clips resolve in four directions for the proof assets.
- [ ] Asymmetric assets never mirror unless explicitly safe.
- [ ] Foot contact remains within rig tolerance across compatible body/shoe combinations.
- [ ] Atlas coordinates and metadata are deterministic.
- [ ] Missing critical motion artwork is an error, not a silent static fallback.
- [ ] Pages provides native-scale and enlarged playback with frame-step and overlay controls.

## Validation

Frame-resolution unit tests, atlas reproducibility tests, ground/contact checks, pixel diffs, and native-scale looping visual review.

## Human validation

- **Required:** Yes
- **Pages path:** `site/validation/task-006/`

Publish all clips and directions at native and enlarged scale, including the asymmetric no-mirror case. Ask the reviewer to inspect timing, foot sliding, ground contact, jitter, silhouette continuity, and directional consistency.
