import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const source = join(root, "examples/vanilla-js");
const output = join(root, "site/validation/task-008");
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ["./examples/vanilla-js/main.ts"],
  outfile: "site/validation/task-008/example.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  metafile: true,
  minify: true,
  logLevel: "info",
  alias: {
    "@character-creator/schema": "./packages/schema/src/index.ts",
    "@character-creator/core": "./packages/core/src/index.ts",
    "@character-creator/renderer-canvas": "./packages/renderer-canvas/src/index.ts",
    "@character-creator/creator-ui": "./packages/creator-ui/src/index.ts"
  }
}).then(async (result) => {
  await import("node:fs/promises").then(({ writeFile }) => writeFile(join(output, "bundle-meta.json"), `${JSON.stringify(result.metafile, null, 2)}\n`, "utf8"));
});
await copyFile(join(source, "index.html"), join(output, "index.html"));
await copyFile(join(source, "example.css"), join(output, "example.css"));
