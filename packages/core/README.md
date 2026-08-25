# `@character-creator/core`

Framework-agnostic catalog indexing and deterministic character resolution.

`resolveCharacter` consumes a normalized recipe, validated assets, a rig, and a render request. It returns a stable draw list, structured diagnostics, dimensions/sampling metadata, and reproducible provenance. It performs no I/O and imports no DOM or browser globals.

Draw order is determined by rig plane, bounded local order, asset ID, and fragment ID. Rendering backends do not resolve conflicts, suppression, or coverage.

