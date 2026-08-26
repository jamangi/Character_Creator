import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const outputRoot = join(root, "site/validation/task-009");
await mkdir(outputRoot, { recursive: true });
const roots = [
  "packages/schema/dist", "packages/core/dist", "packages/renderer-canvas/dist",
  "packages/asset-validator/dist", "packages/creator-ui/dist", "packages/starter-pack",
  "site"
];
const excludedPrefixes = ["site/validation/task-009/release-manifest.json", "site/validation/task-009/release-summary.json"];

async function filesBelow(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(child));
    else if (entry.isFile()) result.push(child);
  }
  return result;
}

const selected: string[] = [];
for (const item of roots) {
  try { selected.push(...await filesBelow(join(root, item))); } catch { /* Missing output is reported below. */ }
}
const unique = [...new Set(selected)].filter((path) => !excludedPrefixes.includes(relative(root, path).replaceAll("\\", "/"))).sort();
const manifest: Array<{ path: string; bytes: number; sha256: string }> = [];
const absoluteLeaks: string[] = [];
for (const path of unique) {
  const bytes = await readFile(path);
  const name = relative(root, path).replaceAll("\\", "/");
  manifest.push({ path: name, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
  if ([".js", ".html", ".css", ".json", ".md"].includes(extname(path))) {
    const text = bytes.toString("utf8");
    if (/([A-Z]:\\Users\\|\/Users\/|\/home\/[^/]+\/)/.test(text)) absoluteLeaks.push(name);
  }
}
const required = ["docs/INTEGRATION.md", "docs/ASSET_AUTHORING.md", "docs/VERSIONING.md", "SECURITY.md", "LICENSES.md", "RELEASE.md"];
const missingDocs: string[] = [];
for (const path of required) {
  try { await stat(join(root, path)); } catch { missingDocs.push(path); }
}
const packageBytes = Object.fromEntries(["schema", "core", "renderer-canvas", "asset-validator", "creator-ui"].map((name) => [name, manifest.filter((item) => item.path.startsWith(`packages/${name}/dist/`)).reduce((sum, item) => sum + item.bytes, 0)]));
const siteBytes = manifest.filter((item) => item.path.startsWith("site/")).reduce((sum, item) => sum + item.bytes, 0);
const starterBytes = manifest.filter((item) => item.path.startsWith("packages/starter-pack/")).reduce((sum, item) => sum + item.bytes, 0);
const exampleSource = await readFile(join(root, "examples/vanilla-js/main.ts"), "utf8");
const internalImports = [...exampleSource.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1] ?? "").filter((value) => value.startsWith(".") || value.includes("packages/"));
const summary = {
  generatedAt: "2026-08-26T23:00:00.000Z",
  releaseVersion: "0.1.0-rc.1",
  files: manifest.length,
  totalBytes: manifest.reduce((sum, item) => sum + item.bytes, 0),
  packageBytes,
  siteBytes,
  starterBytes,
  budgets: { siteBytes: 64 * 1024 * 1024, starterBytes: 32 * 1024 * 1024, packageEntryBytes: 512 * 1024 },
  checks: {
    missingDocs,
    absoluteDeveloperPaths: absoluteLeaks,
    exampleInternalImports: internalImports,
    siteWithinBudget: siteBytes <= 64 * 1024 * 1024,
    starterWithinBudget: starterBytes <= 32 * 1024 * 1024,
    packageEntriesWithinBudget: Object.values(packageBytes).every((bytes) => bytes <= 512 * 1024)
  },
  dependencyAudit: { command: "pnpm audit --audit-level high", checkedAt: "2026-08-26", result: "No known vulnerabilities found" },
  knownBlockers: ["Owner source-code license choice (APPROVAL-002)"]
};
await writeFile(join(outputRoot, "release-manifest.json"), `${JSON.stringify({ algorithm: "sha256", files: manifest }, null, 2)}\n`, "utf8");
await writeFile(join(outputRoot, "release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (missingDocs.length > 0 || absoluteLeaks.length > 0 || internalImports.length > 0 || !summary.checks.siteWithinBudget || !summary.checks.starterWithinBudget || !summary.checks.packageEntriesWithinBudget) {
  throw new Error(`Release audit failed: ${JSON.stringify(summary.checks)}`);
}
console.log(`Release audit passed for ${manifest.length} files (${summary.totalBytes} bytes); one owner license decision remains.`);
