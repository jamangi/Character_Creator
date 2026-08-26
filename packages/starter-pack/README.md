# Character Creator starter pack

A deterministic CC0 proof pack for `starter-humanoid@1`. It deliberately favors a compact, coherent shape language over content volume while covering body profiles, reusable face channels, multi-plane hair, layered garments, replacement anatomy, conflicts, dependencies, multi-slot equipment, explicit asymmetric art, and every advertised animation selector. The equipped mouth defines neutral portrait/full-body output; named non-neutral expressions retain preset-authored curves.

The first-release animation matrix is front-facing `idle`, `walk`, and `run` (9 frames total). Every visible equipped fragment carries exact motion-group art for those frames. Portrait projection omits the lower body/bottom/shoes, sprite projection omits mouths, and both rules preserve the portable recipe.

Generated distributable data lives in `rig.json`, `pack.json`, `assets/`, `images/`, and `recipes/`. Runtime code consumes those files without pack-specific branches. Regenerate the source export and review artifacts with:

```text
pnpm starter-pack
```

The source workflow and visual rules are in `ART_DIRECTION.md`; generated-art references and their exact prompts are in `reference/` and `REFERENCE_PROMPTS.md`.
