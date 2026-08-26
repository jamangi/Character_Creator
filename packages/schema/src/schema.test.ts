import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  parseAssetManifest,
  parseAssetPack,
  parseCharacterRecipe,
  parseRig,
  validateAssetCatalog,
  validateDiagnostic,
  validateRecipeSelection
} from "./validate.js";
import type {
  AssetManifest,
  CharacterRecipe,
  Diagnostic,
  RigDefinition
} from "./types.js";

const repositoryRoot = process.cwd();

function loadJson<T = unknown>(relativePath: string): T {
  return JSON.parse(readFileSync(join(repositoryRoot, relativePath), "utf8")) as T;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function setAtPath(target: unknown, path: Array<string | number>, value: unknown): void {
  let cursor = target as Record<string | number, unknown>;
  for (const segment of path.slice(0, -1)) {
    cursor = cursor[segment] as Record<string | number, unknown>;
  }
  const finalSegment = path.at(-1);
  if (finalSegment === undefined) throw new Error("Mutation path cannot be empty");
  cursor[finalSegment] = value;
}

function parseValidRig(): RigDefinition {
  const result = parseRig(loadJson("fixtures/valid/rig/starter-humanoid.json"));
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
  return result.value;
}

function parseValidAsset(filename: string, rig: RigDefinition): AssetManifest {
  const result = parseAssetManifest(loadJson(`fixtures/valid/assets/${filename}`), rig);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
  return result.value;
}

describe("executable JSON contracts", () => {
  it("parses the starter rig into the public TypeScript contract", () => {
    const result = parseRig(loadJson("fixtures/valid/rig/starter-humanoid.json"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectTypeOf(result.value).toEqualTypeOf<RigDefinition>();
    expect(result.value.planes).toEqual([
      "far-back",
      "hair-back",
      "accessory-back",
      "garment-behind-body",
      "body-back",
      "body-base",
      "face-base",
      "under-garment",
      "garment-main",
      "garment-overlap",
      "face-features",
      "hair-mid",
      "hair-front",
      "accessory-front",
      "foreground"
    ]);
  });

  it("accepts and normalizes every representative asset fixture", () => {
    const rig = parseValidRig();
    const filenames = [
      "accessory-glasses.json",
      "accessory-neck-scarf.json",
      "base-standard.json",
      "body-arm-left-crystal.json",
      "hair-long-wave.json",
      "outerwear-long-coat.json",
      "top-simple-shirt.json"
    ];
    for (const filename of filenames) {
      const result = parseAssetManifest(loadJson(`fixtures/valid/assets/${filename}`), rig);
      expect(result, filename).toMatchObject({ ok: true, diagnostics: [] });
      if (result.ok) expectTypeOf(result.value).toEqualTypeOf<AssetManifest>();
    }
  });

  it("accepts pack and recipe fixtures and normalizes recipe ordering", () => {
    const pack = parseAssetPack(loadJson("fixtures/valid/asset-packs/proof-pack.json"));
    const recipe = parseCharacterRecipe(loadJson("fixtures/valid/recipes/proof-character.json"));
    expect(pack.ok).toBe(true);
    expect(recipe.ok).toBe(true);
    if (!recipe.ok) return;
    expectTypeOf(recipe.value).toEqualTypeOf<CharacterRecipe>();
    expect(recipe.value.equipped.map((item) => item.assetId)).toEqual([
      "starter.base.standard",
      "starter.body.arm-left-crystal",
      "starter.hair.long-wave",
      "starter.outerwear.long-coat",
      "starter.top.simple-shirt"
    ]);
    expect(Object.keys(recipe.value.palette)).toEqual([
      "body.arm.left",
      "body.arm.right",
      "coat.base",
      "hair.base",
      "shirt.base",
      "skin.base"
    ]);
  });

  it("projects legacy broad palette keys into stable slot-scoped roles", () => {
    const legacy = loadJson<CharacterRecipe>("fixtures/valid/recipes/proof-character.json");
    legacy.palette = {
      "skin.base": "#AA7755",
      "garment.primary": "#1188CC",
      "garment.secondary": "#202020",
      "accent.base": "#DDAA33",
      "crystal.base": "#66DDEE"
    };
    const parsed = parseCharacterRecipe(legacy);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.palette).toMatchObject({
      "body.arm.left": "#66DDEE",
      "body.arm.right": "#66DDEE",
      "garment.top": "#1188CC",
      "garment.outfit": "#1188CC",
      "garment.bottom": "#202020",
      "garment.outerwear": "#202020",
      "garment.shoes": "#66DDEE",
      "accessory.hat": "#DDAA33",
      "accessory.ear": "#DDAA33"
    });
    expect(parsed.value.palette["garment.primary"]).toBe("#1188CC");
    expect(parsed.value.palette["accent.base"]).toBe("#DDAA33");
  });

  it("keeps structured diagnostics aligned with their JSON Schema", () => {
    const item = {
      code: "UNKNOWN_ANCHOR",
      severity: "error",
      path: "$.fragments[0].anchor",
      message: "Unknown rig anchor"
    } satisfies Diagnostic;
    expect(validateDiagnostic(item)).toMatchObject({ ok: true });
  });
});

interface InvalidCase {
  name: string;
  kind: string;
  base?: string;
  mutations?: Array<{ path: Array<string | number>; value: unknown }>;
  expected: { code: string; path: string };
}

describe("invalid fixture table", () => {
  const rig = parseValidRig();
  const cases = loadJson<InvalidCase[]>("fixtures/invalid/cases.json");

  for (const fixture of cases) {
    it(fixture.name, () => {
      let diagnostics: Diagnostic[];
      if (fixture.kind === "asset") {
        const input = loadJson<Record<string, unknown>>(
          `fixtures/valid/assets/${fixture.base as string}`
        );
        for (const mutation of fixture.mutations ?? []) {
          setAtPath(input, mutation.path, clone(mutation.value));
        }
        const result = parseAssetManifest(input, rig);
        diagnostics = result.diagnostics;
      } else if (fixture.kind === "catalog-cycle") {
        const base = parseValidAsset("base-standard.json", rig);
        const shirt = parseValidAsset("top-simple-shirt.json", rig);
        const coat = parseValidAsset("outerwear-long-coat.json", rig);
        base.equip.requires = ["asset:starter.outerwear.long-coat"];
        diagnostics = validateAssetCatalog([base, shirt, coat], rig);
      } else if (fixture.kind === "catalog-duplicate") {
        const hair = parseValidAsset("hair-long-wave.json", rig);
        diagnostics = validateAssetCatalog([hair, clone(hair)], rig);
      } else {
        const recipeResult = parseCharacterRecipe(
          loadJson("fixtures/valid/recipes/proof-character.json")
        );
        if (!recipeResult.ok) throw new Error(JSON.stringify(recipeResult.diagnostics));
        const hair = parseValidAsset("hair-long-wave.json", rig);
        const secondHair = clone(hair);
        secondHair.id = "starter.hair.long-wave-alt";
        const assets = [
          parseValidAsset("base-standard.json", rig),
          parseValidAsset("body-arm-left-crystal.json", rig),
          hair,
          secondHair,
          parseValidAsset("outerwear-long-coat.json", rig),
          parseValidAsset("top-simple-shirt.json", rig)
        ];
        const recipe = clone(recipeResult.value);
        if (fixture.kind === "selection-ambiguous") {
          recipe.equipped.push({ assetId: secondHair.id, version: secondHair.version });
        } else {
          recipe.equipped.push({ assetId: "starter.missing.asset", version: "1.0.0" });
        }
        diagnostics = validateRecipeSelection(recipe, assets, rig);
      }

      expect(diagnostics[0]).toMatchObject(fixture.expected);
      expect(diagnostics.every((item) => item.severity === "error")).toBe(true);
    });
  }
});
