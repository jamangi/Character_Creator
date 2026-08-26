import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const source = join(root, "apps/studio/src");
const output = join(root, "site");
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ["./apps/studio/src/main.ts"],
  outfile: "site/studio.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  minify: false,
  logLevel: "info",
  alias: {
    "@character-creator/schema": "./packages/schema/src/index.ts",
    "@character-creator/core": "./packages/core/src/index.ts",
    "@character-creator/renderer-canvas": "./packages/renderer-canvas/src/index.ts",
    "@character-creator/creator-ui": "./packages/creator-ui/src/index.ts"
  }
});
await copyFile(join(source, "index.html"), join(output, "index.html"));
await copyFile(join(source, "styles.css"), join(output, "studio.css"));
