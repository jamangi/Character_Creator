# `@character-creator/renderer-canvas`

A small Canvas 2D backend that consumes only a resolved draw list from `@character-creator/core`.

The package accepts structural Canvas, canvas-factory, and image-loader interfaces so the same renderer works with a browser canvas or a compatible server-side implementation. Resolution, equip conflicts, suppression, profile projection, and coverage remain in core.

Palette bindings are applied per fragment from exact authored role-color keys. Recipe colors therefore affect only declared role pixels while alpha, linework, highlights, and fixed colors remain unchanged. Preview and export consumers use this same path.

Task 002 goldens use exact pixel comparison (`threshold: 0`) against the transparent PNGs published under `site/validation/task-002/renders/`.
