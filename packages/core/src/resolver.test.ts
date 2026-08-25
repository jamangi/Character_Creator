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
import { resolveCharacter } from "./resolver.js";

const root = process.cwd();

function json(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function fixtures(): {
  rig: RigDefinition;
  recipe: CharacterRecipe;
  assets: AssetManifest[];
} {
  const parsedRig = parseRig(json("fixtures/valid/rig/starter-humanoid.json"));
  const parsedRecipe = parseCharacterRecipe(json("fixtures/valid/recipes/proof-character.json"));
  if (!parsedRig.ok || !parsedRecipe.ok) throw new Error("Valid core fixtures failed to parse");
  const filenames = [
    "base-standard.json",
    "body-arm-left-crystal.json",
    "hair-long-wave.json",
    "outerwear-long-coat.json",
    "top-simple-shirt.json"
  ];
  const assets = filenames.map((filename) => {
    const result = parseAssetManifest(json(`fixtures/valid/assets/${filename}`), parsedRig.value);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
    return result.value;
  });
  return { rig: parsedRig.value, recipe: parsedRecipe.value, assets };
}

describe("deterministic composition resolver", () => {
  it("resolves the same recipe across portrait, full-body, and directional sprite requests", () => {
    const { rig, recipe, assets } = fixtures();
    const scenes = [
      resolveCharacter({ recipe, rig, catalog: assets, request: { profile: "portrait", view: "front" } }),
      resolveCharacter({ recipe, rig, catalog: assets, request: { profile: "full-body", view: "front" } }),
      resolveCharacter({
        recipe,
        rig,
        catalog: assets,
        request: { profile: "sprite", view: "front", clip: "idle", frame: "center" }
      }),
      resolveCharacter({
        recipe,
        rig,
        catalog: assets,
        request: { profile: "sprite", view: "left", clip: "idle", frame: "center" }
      })
    ];

    expect(scenes.every((scene) => scene.diagnostics.length === 0)).toBe(true);
    expect(new Set(scenes.map((scene) => scene.provenance.recipeFingerprint)).size).toBe(1);
    expect(scenes.map((scene) => [scene.width, scene.height])).toEqual([
      [256, 256],
      [256, 384],
      [96, 96],
      [96, 96]
    ]);
  });

  it("uses named planes for multi-plane hair and the tailed coat", () => {
    const { rig, recipe, assets } = fixtures();
    const scene = resolveCharacter({
      recipe,
      rig,
      catalog: assets,
      request: { profile: "full-body", view: "front" }
    });
    expect(scene.drawList.map((item) => `${item.assetId}:${item.fragmentId}`)).toEqual([
      "starter.hair.long-wave:full-body.back",
      "starter.outerwear.long-coat:full-body.tail",
      "starter.base.standard:full-body.core",
      "starter.body.arm-left-crystal:full-body.arm-left",
      "starter.top.simple-shirt:full-body.main",
      "starter.outerwear.long-coat:full-body.main",
      "starter.hair.long-wave:full-body.front"
    ]);
  });

  it("suppresses only the declared base region when a body module replaces it", () => {
    const { rig, recipe, assets } = fixtures();
    const scene = resolveCharacter({
      recipe,
      rig,
      catalog: assets,
      request: { profile: "full-body", view: "front" }
    });
    expect(scene.drawList.some((item) => item.fragmentId === "full-body.arm-left")).toBe(true);
    expect(
      scene.drawList.some(
        (item) => item.assetId === "starter.base.standard" && item.fragmentId === "full-body.core"
      )
    ).toBe(true);
    expect(
      scene.drawList.some(
        (item) => item.assetId === "starter.base.standard" && item.fragmentId === "full-body.arm-left"
      )
    ).toBe(false);
  });

  it("fails required coverage when replacement artwork is missing", () => {
    const { rig, recipe, assets } = fixtures();
    const brokenAssets = structuredClone(assets);
    const replacement = brokenAssets.find((asset) => asset.id === "starter.body.arm-left-crystal");
    if (replacement === undefined) throw new Error("Missing test fixture");
    replacement.fragments = replacement.fragments.filter(
      (fragment) => fragment.id !== "full-body.arm-left"
    );
    const scene = resolveCharacter({
      recipe,
      rig,
      catalog: brokenAssets,
      request: { profile: "full-body", view: "front" }
    });
    expect(scene.diagnostics).toContainEqual(
      expect.objectContaining({ code: "MISSING_COVERAGE", severity: "error" })
    );
  });

  it("is invariant to recipe and catalog input ordering", () => {
    const { rig, recipe, assets } = fixtures();
    const reversedRecipe = { ...recipe, equipped: [...recipe.equipped].reverse() };
    const first = resolveCharacter({
      recipe,
      rig,
      catalog: assets,
      request: { profile: "full-body", view: "front" }
    });
    const second = resolveCharacter({
      recipe: reversedRecipe,
      rig,
      catalog: [...assets].reverse(),
      request: { profile: "full-body", view: "front" }
    });
    expect(second.drawList).toEqual(first.drawList);
    expect(second.provenance).toEqual(first.provenance);
  });

  it("reports unmet requirements and declared conflicts before rendering", () => {
    const { rig, recipe, assets } = fixtures();
    const withoutTop = {
      ...recipe,
      equipped: recipe.equipped.filter((item) => item.assetId !== "starter.top.simple-shirt")
    };
    const missing = resolveCharacter({
      recipe: withoutTop,
      rig,
      catalog: assets,
      request: { profile: "portrait", view: "front" }
    });
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({ code: "MISSING_REQUIREMENT" })
    );

    const scarfResult = parseAssetManifest(
      json("fixtures/valid/assets/accessory-neck-scarf.json"),
      rig
    );
    if (!scarfResult.ok) throw new Error("Scarf fixture failed");
    const conflicting = {
      ...recipe,
      equipped: [...recipe.equipped, { assetId: scarfResult.value.id, version: "1.0.0" }]
    };
    const conflict = resolveCharacter({
      recipe: conflicting,
      rig,
      catalog: [...assets, scarfResult.value],
      request: { profile: "portrait", view: "front" }
    });
    expect(conflict.diagnostics).toContainEqual(
      expect.objectContaining({ code: "ASSET_CONFLICT" })
    );
  });

  it("uses only rig-declared fallbacks when an exact selector is absent", () => {
    const { rig, recipe, assets } = fixtures();
    const glassesResult = parseAssetManifest(
      json("fixtures/valid/assets/accessory-glasses.json"),
      rig
    );
    if (!glassesResult.ok) throw new Error("Glasses fixture failed");
    const scene = resolveCharacter({
      recipe: {
        ...recipe,
        equipped: [
          ...recipe.equipped,
          { assetId: glassesResult.value.id, version: glassesResult.value.version }
        ]
      },
      rig,
      catalog: [...assets, glassesResult.value],
      request: { profile: "portrait", view: "front", expression: "smirk" }
    });
    expect(scene.diagnostics).toEqual([]);
    expect(scene.drawList).toContainEqual(
      expect.objectContaining({
        assetId: "starter.accessory.glasses",
        fragmentId: "portrait.front"
      })
    );
  });

  it("runs in Node without DOM or browser globals", () => {
    expect(globalThis.document).toBeUndefined();
    const { rig, recipe, assets } = fixtures();
    expect(
      resolveCharacter({
        recipe,
        rig,
        catalog: assets,
        request: { profile: "portrait", view: "front" }
      }).diagnostics
    ).toEqual([]);
  });
});

interface ResolverInvalidCase {
  name: string;
  kind: string;
  expected: string;
}

describe("Task 002 diagnostic fixtures", () => {
  const cases = json("fixtures/invalid/task-002-cases.json") as ResolverInvalidCase[];
  for (const testCase of cases) {
    it(testCase.name, () => {
      const { rig, recipe, assets } = fixtures();
      const nextRecipe = structuredClone(recipe);
      const nextAssets = structuredClone(assets);

      if (testCase.kind === "missing-coverage") {
        const replacement = nextAssets.find(
          (asset) => asset.id === "starter.body.arm-left-crystal"
        );
        if (replacement === undefined) throw new Error("Missing replacement fixture");
        replacement.fragments = replacement.fragments.filter(
          (fragment) => fragment.id !== "full-body.arm-left"
        );
      } else if (testCase.kind === "missing-requirement") {
        nextRecipe.equipped = nextRecipe.equipped.filter(
          (item) => item.assetId !== "starter.top.simple-shirt"
        );
      } else if (testCase.kind === "asset-conflict") {
        const scarf = parseAssetManifest(
          json("fixtures/valid/assets/accessory-neck-scarf.json"),
          rig
        );
        if (!scarf.ok) throw new Error("Scarf fixture failed");
        nextAssets.push(scarf.value);
        nextRecipe.equipped.push({ assetId: scarf.value.id, version: scarf.value.version });
      } else if (testCase.kind === "invalid-suppression") {
        const replacement = nextAssets.find(
          (asset) => asset.id === "starter.body.arm-left-crystal"
        );
        if (replacement === undefined) throw new Error("Missing replacement fixture");
        replacement.effects.push({ kind: "suppress-tags", targetTags: ["body.unknown.base"] });
      } else if (testCase.kind === "ambiguous-fragment") {
        const hair = nextAssets.find((asset) => asset.id === "starter.hair.long-wave");
        const front = hair?.fragments.find((fragment) => fragment.id === "full-body.front");
        if (hair === undefined || front === undefined) throw new Error("Missing hair fixture");
        hair.fragments.push({ ...structuredClone(front), id: "full-body.front-alt" });
      } else if (testCase.kind === "version-mismatch") {
        const selection = nextRecipe.equipped.find(
          (item) => item.assetId === "starter.hair.long-wave"
        );
        if (selection === undefined) throw new Error("Missing recipe fixture");
        selection.version = "9.0.0";
      } else if (testCase.kind === "engine-mismatch") {
        nextRecipe.engineVersion = "9.0.0";
      }

      const scene = resolveCharacter({
        recipe: nextRecipe,
        rig,
        catalog: nextAssets,
        request: { profile: "full-body", view: "front" }
      });
      expect(scene.diagnostics).toContainEqual(
        expect.objectContaining({ code: testCase.expected, severity: "error" })
      );
    });
  }
});
