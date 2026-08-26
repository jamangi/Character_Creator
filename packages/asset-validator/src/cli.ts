#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import {
  parseAssetManifest,
  parseAssetPack,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type Diagnostic
} from "@character-creator/schema";
import { inspectPng } from "./files.js";
import { writeValidationReport } from "./report.js";
import type { ValidationRenderCase } from "./types.js";
import { validatePack } from "./validator.js";

function argument(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

const root = resolve(argument("--root", "packages/starter-pack") ?? "packages/starter-pack");
const output = resolve(argument("--out", "artifacts/validator") ?? "artifacts/validator");
const noVisual = process.argv.includes("--no-visual");
const rigResult = parseRig(await loadJson(join(root, "rig.json")));
const packResult = parseAssetPack(await loadJson(join(root, "pack.json")));
if (!rigResult.ok || !packResult.ok) {
  const diagnostics = [...(!rigResult.ok ? rigResult.diagnostics : []), ...(!packResult.ok ? packResult.diagnostics : [])];
  console.error(JSON.stringify(diagnostics, null, 2));
  process.exitCode = 1;
} else {
  const schemaDiagnostics: Diagnostic[] = [];
  const assets: AssetManifest[] = [];
  for (const entry of packResult.value.assets) {
    const parsed = parseAssetManifest(await loadJson(join(root, entry.manifest)), rigResult.value);
    if (parsed.ok) assets.push(parsed.value);
    else schemaDiagnostics.push(...parsed.diagnostics);
  }
  const paths = new Set(assets.flatMap((asset) => [asset.display.thumbnail, ...asset.fragments.map((fragment) => fragment.source)]));
  const files = new Map();
  for (const path of paths) {
    const absolute = isAbsolute(path) ? path : join(root, path);
    files.set(path, await inspectPng(absolute));
  }
  const renderCases: ValidationRenderCase[] = [];
  for (const recipePath of argument("--recipe", "")?.split(",").filter(Boolean) ?? []) {
    const parsed = parseCharacterRecipe(await loadJson(resolve(recipePath)));
    if (parsed.ok) renderCases.push({ id: recipePath, recipe: parsed.value, requests: [{ profile: "portrait", view: "front" }, { profile: "full-body", view: "front" }] });
    else schemaDiagnostics.push(...parsed.diagnostics);
  }
  const report = validatePack({ rig: rigResult.value, pack: packResult.value, assets, files, renderCases, schemaDiagnostics, noVisual });
  await writeValidationReport(report, output);
  await writeFile(join(output, "summary.txt"), `${report.pack.id}: ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.reviewRequired} review-required\n`, "utf8");
  console.log(`Validation report: ${join(output, "index.html")}`);
  if (report.summary.errors > 0) process.exitCode = 1;
}
