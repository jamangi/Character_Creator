# Asset validator

Seven-level pack validation for schema, files, compatibility, coverage, geometry, visual review, and distribution. The library is deterministic and the CLI writes both `report.json` and an accessible `index.html`.

```text
pnpm validator --root packages/starter-pack --out artifacts/validator
pnpm validator --root packages/starter-pack --out artifacts/validator-ci --no-visual
```

The no-GUI form exits nonzero when errors are present. Review-required findings remain distinct from warnings and errors.

## Artist loop

1. Export lossless PNGs with transparent padding and filenames matching the manifest.
2. Run the validator against the pack directory.
3. Fix the first error at each level; later findings are preserved but grouped so a missing file does not hide its source.
4. Open the HTML report and contact sheets at native scale, then inspect the high-DPI enlarged view.
5. Commit generated reports only when a task names them as a review artifact or baseline.
