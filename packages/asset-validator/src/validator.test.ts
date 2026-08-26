import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAssetManifest,
  parseAssetPack,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type AssetPackManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";
import { describe, expect, it } from "vitest";
import type { FileInspection, ValidationRenderCase } from "./types.js";
import { validatePack } from "./validator.js";

const root = process.cwd();
const json = (path: string): unknown => JSON.parse(readFileSync(join(root, path), "utf8")) as unknown;

function base(): {
  rig: RigDefinition;
  pack: AssetPackManifest;
  assets: AssetManifest[];
  recipe: CharacterRecipe;
  files: Map<string, FileInspection>;
} {
  const rig = parseRig(json("fixtures/valid/rig/starter-humanoid.json"));
  const pack = parseAssetPack(json("fixtures/valid/asset-packs/proof-pack.json"));
  const recipe = parseCharacterRecipe(json("fixtures/valid/recipes/proof-character.json"));
  if (!rig.ok || !pack.ok || !recipe.ok) throw new Error("Fixture parse failed");
  const assets = ["base-standard.json", "body-arm-left-crystal.json", "hair-long-wave.json", "outerwear-long-coat.json", "top-simple-shirt.json"].map((name) => {
    const parsed = parseAssetManifest(json(`fixtures/valid/assets/${name}`), rig.value);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
    return structuredClone(parsed.value);
  });
  const alignedPack = structuredClone(pack.value);
  for (const entry of alignedPack.assets) {
    const asset = assets.find((candidate) => candidate.id === entry.id);
    if (asset !== undefined) entry.contentHash = asset.provenance.contentHash;
  }
  const files = new Map<string, FileInspection>();
  for (const asset of assets) {
    files.set(asset.display.thumbnail, { exists: true, byteLength: 100, width: 64, height: 64, hasAlpha: true });
    for (const fragment of asset.fragments) files.set(fragment.source, { exists: true, byteLength: 100, width: 256, height: 256, hasAlpha: true });
  }
  return { rig: structuredClone(rig.value), pack: alignedPack, assets, recipe: recipe.value, files };
}

function renderCase(recipe: CharacterRecipe): ValidationRenderCase[] {
  return [{ id: "proof", recipe, requests: [{ profile: "sprite", view: "right", clip: "idle", frame: "center" }] }];
}

describe("seven-level asset validator", () => {
  const cases = json("fixtures/validator/diagnostic-cases.json") as Array<{ code: string; mutation: string }>;
  for (const fixture of cases) {
    it(`emits ${fixture.code} for the ${fixture.mutation} fixture`, () => {
      const input = base();
      const asset = input.assets[0];
      const fragment = asset?.fragments[0];
      if (asset === undefined || fragment === undefined) throw new Error("Base fragment missing");
      let renderCases: ValidationRenderCase[] = [];
      let noVisual = true;
      if (fixture.mutation === "missing") input.files.delete(fragment.source);
      if (fixture.mutation === "decode") input.files.set(fragment.source, { exists: true, decodeError: "corrupt fixture" });
      if (fixture.mutation === "dimensions") {
        fragment.bounds = { x: 0, y: 0, width: 256, height: 256 };
        input.files.set(fragment.source, { exists: true, byteLength: 100, width: 255, height: 256, hasAlpha: true });
      }
      if (fixture.mutation === "alpha") input.files.set(fragment.source, { exists: true, byteLength: 100, width: 256, height: 256, hasAlpha: false });
      if (fixture.mutation === "hash") {
        const entry = input.pack.assets.find((candidate) => candidate.id === asset.id);
        if (entry !== undefined) entry.contentHash = `sha256-${"f".repeat(64)}`;
      }
      if (fixture.mutation === "budget") input.files.set(fragment.source, { exists: true, byteLength: input.rig.budgets.maxAssetBytes + 1, width: 256, height: 256, hasAlpha: true });
      if (fixture.mutation === "bounds") {
        fragment.bounds = { x: 0, y: 0, width: 300, height: 256 };
        input.files.set(fragment.source, { exists: true, byteLength: 100, width: 300, height: 256, hasAlpha: true });
      }
      if (fixture.mutation === "contact") input.rig.clips[0]?.frames[0]?.contacts.push("foot.unknown");
      if (fixture.mutation === "mirror") {
        const sprite = asset.fragments.find((candidate) => candidate.selector.profile === "sprite");
        if (sprite !== undefined) sprite.mirrorSafe = false;
        renderCases = renderCase(input.recipe);
      }
      if (fixture.mutation === "distribution") asset.provenance.authors = [];
      if (fixture.mutation === "visual") { noVisual = false; }
      const report = validatePack({ ...input, renderCases, noVisual, generatedAt: "2026-08-25T00:00:00.000Z" });
      expect(report.findings.some((finding) => finding.diagnostic.code === fixture.code)).toBe(true);
    });
  }

  it("produces deterministic summaries and keeps review-required distinct", () => {
    const input = base();
    const first = validatePack({ ...input, noVisual: false, generatedAt: "2026-08-25T00:00:00.000Z" });
    const second = validatePack({ ...input, noVisual: false, generatedAt: "2026-08-25T00:00:00.000Z" });
    expect(second).toEqual(first);
    expect(first.summary).toEqual({ errors: 0, warnings: 0, reviewRequired: 1 });
    expect(first.levels).toHaveLength(7);
  });
});
