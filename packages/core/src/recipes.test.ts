import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";
import { describe, expect, it } from "vitest";
import {
  exportCharacterRecipe,
  importCharacterRecipe,
  parseRecipeJson
} from "./recipes.js";

const root = process.cwd();
const text = (path: string): string => readFileSync(join(root, path), "utf8");
const json = (path: string): unknown => JSON.parse(text(path)) as unknown;

function fixtures(): { recipe: CharacterRecipe; rig: RigDefinition; assets: AssetManifest[] } {
  const recipe = parseCharacterRecipe(json("fixtures/valid/recipes/proof-character.json"));
  const rig = parseRig(json("fixtures/valid/rig/starter-humanoid.json"));
  if (!recipe.ok || !rig.ok) throw new Error("Recipe fixtures failed to parse");
  const names = [
    "base-standard.json",
    "body-arm-left-crystal.json",
    "hair-long-wave.json",
    "outerwear-long-coat.json",
    "top-simple-shirt.json"
  ];
  const assets = names.map((name) => {
    const parsed = parseAssetManifest(json(`fixtures/valid/assets/${name}`), rig.value);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
    return parsed.value;
  });
  return { recipe: recipe.value, rig: rig.value, assets };
}

describe("portable character recipes", () => {
  it("is byte-stable across export, import, and export", () => {
    const { recipe, rig, assets } = fixtures();
    const first = exportCharacterRecipe(recipe);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const imported = importCharacterRecipe(first.value, { catalog: assets, rig });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const second = exportCharacterRecipe(imported.value.recipe);
    expect(second).toEqual(first);
    expect(first.value).not.toMatch(/data:image|[A-Za-z]:\\|https?:\/\//);
  });

  it("migrates legacy recipes and deprecated IDs deterministically", () => {
    const { rig, assets } = fixtures();
    const result = importCharacterRecipe(text("fixtures/recipes/legacy-0.0.1.json"), {
      rig,
      catalog: assets,
      aliases: { "starter.hair.long-waves": "starter.hair.long-wave" }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.migrations).toEqual([{ from: "0.0.1", to: "0.1.0" }]);
    expect(result.value.aliases).toEqual([
      { from: "starter.hair.long-waves", to: "starter.hair.long-wave" }
    ]);
    expect(result.diagnostics.map((item) => item.code)).toContain("ASSET_ALIAS_APPLIED");
  });

  it("reports missing assets in strict mode and preserves source in best-effort preview", () => {
    const { rig, assets } = fixtures();
    const source = text("fixtures/recipes/missing-asset.json");
    const strict = importCharacterRecipe(source, { catalog: assets, rig });
    expect(strict.ok).toBe(false);
    expect(strict.diagnostics.some((item) => item.code === "ASSET_NOT_FOUND")).toBe(true);
    const preview = importCharacterRecipe(source, {
      catalog: assets,
      rig,
      mode: "best-effort-preview"
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value.sourceText).toBe(source);
    expect(preview.value.recipe.equipped).toHaveLength(2);
    expect(preview.value.previewRecipe.equipped).toHaveLength(1);
    expect(preview.diagnostics.some((item) => item.code === "BEST_EFFORT_SUBSTITUTION")).toBe(true);
  });

  it("bounds malformed, deeply nested, oversized, and hostile JSON", () => {
    expect(parseRecipeJson("{").diagnostics[0]?.code).toBe("INVALID_JSON");
    expect(parseRecipeJson(`{"x":"${"a".repeat(64)}"}`, { maxBytes: 16 }).diagnostics[0]?.code)
      .toBe("RECIPE_LIMIT_EXCEEDED");
    expect(parseRecipeJson('{"a":{"b":{"c":1}}}', { maxDepth: 1 }).diagnostics[0]?.code)
      .toBe("RECIPE_LIMIT_EXCEEDED");
    expect(importCharacterRecipe(text("fixtures/recipes/hostile-external-reference.json")).diagnostics[0]?.code)
      .toBe("UNSAFE_RECIPE_VALUE");
    expect(importCharacterRecipe('{"schemaVersion":"9.0.0"}').diagnostics[0]?.code)
      .toBe("MIGRATION_FAILED");
    expect(importCharacterRecipe('{"schemaVersion":"0.1.0","constructor":{}}').diagnostics[0]?.code)
      .toBe("UNSAFE_OBJECT_KEY");
  });
});
