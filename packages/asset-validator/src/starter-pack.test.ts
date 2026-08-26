import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveAnimation } from "@character-creator/core";
import {
  parseAssetManifest,
  parseAssetPack,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";
import { describe, expect, it } from "vitest";
import type { FileInspection, ValidationRenderCase } from "./types.js";
import { validatePack } from "./validator.js";

const root = process.cwd();
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), "utf8")) as unknown;

function packFixtures(): {
  rig: RigDefinition;
  assets: AssetManifest[];
  recipes: CharacterRecipe[];
  pack: ReturnType<typeof parseAssetPack> & { ok: true };
  files: Map<string, FileInspection>;
} {
  const rig = parseRig(readJson("packages/starter-pack/rig.json"));
  const pack = parseAssetPack(readJson("packages/starter-pack/pack.json"));
  if (!rig.ok || !pack.ok) throw new Error("Starter pack root manifests failed");
  const assets = pack.value.assets.map((entry) => {
    const parsed = parseAssetManifest(readJson(`packages/starter-pack/${entry.manifest}`), rig.value);
    if (!parsed.ok) throw new Error(`${entry.id}: ${JSON.stringify(parsed.diagnostics)}`);
    return parsed.value;
  });
  const recipes = ["everyday-layered", "silhouette-replacement", "occlusion-stress"].map((name) => {
    const parsed = parseCharacterRecipe(readJson(`packages/starter-pack/recipes/${name}.json`));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
    return parsed.value;
  });
  const files = new Map<string, FileInspection>();
  for (const asset of assets) {
    files.set(asset.display.thumbnail, { exists: true, byteLength: 1024, width: 96, height: 96, hasAlpha: true });
    for (const fragment of asset.fragments) files.set(fragment.source, {
      exists: true,
      byteLength: 4096,
      width: fragment.bounds?.width ?? 0,
      height: fragment.bounds?.height ?? 0,
      hasAlpha: true
    });
  }
  return { rig: rig.value, assets, recipes, pack: pack as ReturnType<typeof parseAssetPack> & { ok: true }, files };
}

describe("starter asset pack conformance", () => {
  it("ships the promised catalog breadth under one rig", () => {
    const { assets } = packFixtures();
    expect(assets.filter((asset) => asset.kind === "base-body")).toHaveLength(3);
    expect(assets.filter((asset) => asset.kind === "hair")).toHaveLength(8);
    expect(assets.filter((asset) => asset.kind === "top")).toHaveLength(4);
    expect(assets.filter((asset) => asset.kind === "bottom")).toHaveLength(3);
    expect(assets.filter((asset) => asset.kind === "shoes")).toHaveLength(4);
    expect(assets.filter((asset) => asset.kind === "body-module")).toHaveLength(2);
    expect(assets.filter((asset) => asset.display.tags.includes("multi-plane")).length).toBeGreaterThanOrEqual(4);
    expect(assets.filter((asset) => asset.display.tags.includes("shoulder-crossing")).length).toBeGreaterThanOrEqual(2);
  });

  it("passes validator levels 1–5 and 7 across all hero requests", () => {
    const { rig, assets, recipes, pack, files } = packFixtures();
    const requests: ValidationRenderCase["requests"] = [
      ...rig.expressions.map((expression) => ({ profile: "portrait" as const, view: "front", expression: expression.id })),
      ...(rig.profiles.find((profile) => profile.id === "full-body")?.views ?? []).map((view) => ({ profile: "full-body" as const, view, expression: "neutral" })),
      ...rig.clips.flatMap((clip) => clip.directions.flatMap((view) => clip.frames.map((frame) => ({ profile: "sprite" as const, view, clip: clip.id, frame: frame.id }))))
    ];
    const renderCases = recipes.map((recipe, index) => ({ id: `hero-${index + 1}`, recipe, requests }));
    const report = validatePack({ rig, assets, pack: pack.value, files, renderCases, noVisual: true, generatedAt: "2026-08-25T00:00:00.000Z" });
    expect(report.summary.errors, JSON.stringify(report.findings.map((finding) => finding.diagnostic))).toBe(0);
    expect(report.levels.filter((level) => level.level !== "visual").every((level) => level.status === "pass")).toBe(true);
  });

  it("resolves every hero clip and direction without critical fallback", () => {
    const { rig, assets, recipes } = packFixtures();
    for (const recipe of recipes) for (const clip of rig.clips) {
      const animation = resolveAnimation({ recipe, rig, catalog: assets, clip: clip.id });
      expect(animation.diagnostics, `${recipe.metadata?.["name"]} ${clip.id}`).toEqual([]);
    }
  });
});
