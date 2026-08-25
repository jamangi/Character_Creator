# `@character-creator/renderer-canvas`

A small Canvas 2D backend that consumes only a resolved draw list from `@character-creator/core`.

The package accepts structural Canvas and image-loader interfaces so the same renderer works with a browser canvas or a compatible server-side implementation. Resolution, equip conflicts, suppression, and coverage remain in core.

Task 002 goldens use exact pixel comparison (`threshold: 0`) against the transparent PNGs published under `site/validation/task-002/renders/`.
