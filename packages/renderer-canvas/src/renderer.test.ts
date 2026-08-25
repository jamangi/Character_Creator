import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { resolveCharacter, type RenderRequest } from "@character-creator/core";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { renderResolvedScene } from "./renderer.js";
import type { CanvasImageLike, CanvasLike } from "./types.js";

const root = process.cwd();

function json(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function fixtures(): {
  rig: RigDefinition;
  recipe: CharacterRecipe;
  assets: AssetManifest[];
} {
  const rigResult = parseRig(json("fixtures/valid/rig/starter-humanoid.json"));
  const recipeResult = parseCharacterRecipe(json("fixtures/valid/recipes/proof-character.json"));
  if (!rigResult.ok || !recipeResult.ok) throw new Error("Visual fixtures failed to parse");
  const assets = [
    "base-standard.json",
    "body-arm-left-crystal.json",
    "hair-long-wave.json",
    "outerwear-long-coat.json",
    "top-simple-shirt.json"
  ].map((filename) => {
    const result = parseAssetManifest(json(`fixtures/valid/assets/${filename}`), rigResult.value);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
    return result.value;
  });
  return { rig: rigResult.value, recipe: recipeResult.value, assets };
}

async function renderPng(
  request: RenderRequest,
  options: { reverseInputs?: boolean } = {}
): Promise<Buffer> {
  const { rig, recipe, assets } = fixtures();
  const scene = resolveCharacter({
    rig,
    recipe: options.reverseInputs
      ? { ...recipe, equipped: [...recipe.equipped].reverse() }
      : recipe,
    catalog: options.reverseInputs ? [...assets].reverse() : assets,
    request
  });
  expect(scene.diagnostics).toEqual([]);
  const canvas = createCanvas(scene.width, scene.height);
  const result = await renderResolvedScene(scene, {
    canvas: canvas as unknown as CanvasLike,
    loadImage: async (source) =>
      (await loadImage(join(root, source))) as unknown as CanvasImageLike
  });
  expect(result.diagnostics).toEqual([]);
  return canvas.toBuffer("image/png");
}

const cases: Array<{ name: string; request: RenderRequest; golden: string }> = [
  {
    name: "portrait front",
    request: { profile: "portrait", view: "front", expression: "neutral" },
    golden: "portrait-front.png"
  },
  {
    name: "full-body front",
    request: { profile: "full-body", view: "front", expression: "neutral" },
    golden: "full-body-front.png"
  },
  {
    name: "sprite front idle",
    request: { profile: "sprite", view: "front", clip: "idle", frame: "center" },
    golden: "sprite-front-idle-center.png"
  },
  {
    name: "sprite left idle",
    request: { profile: "sprite", view: "left", clip: "idle", frame: "center" },
    golden: "sprite-left-idle-center.png"
  }
];

describe("Canvas 2D deterministic rendering", () => {
  for (const testCase of cases) {
    it(`matches the ${testCase.name} golden with zero changed pixels`, async () => {
      const actual = PNG.sync.read(await renderPng(testCase.request));
      const expected = PNG.sync.read(
        readFileSync(join(root, "site", "validation", "task-002", "renders", testCase.golden))
      );
      expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
      const changedPixels = pixelmatch(
        expected.data,
        actual.data,
        undefined,
        actual.width,
        actual.height,
        { threshold: 0 }
      );
      expect(changedPixels).toBe(0);
      const alphaValues = Array.from(actual.data).filter((_, index) => index % 4 === 3);
      expect(alphaValues.some((alpha) => alpha === 0)).toBe(true);
      expect(alphaValues.some((alpha) => alpha > 0)).toBe(true);
    });
  }

  it("produces identical pixels when recipe and catalog inputs are reversed", async () => {
    const request: RenderRequest = { profile: "full-body", view: "front" };
    const canonical = PNG.sync.read(await renderPng(request));
    const reversed = PNG.sync.read(await renderPng(request, { reverseInputs: true }));
    expect(
      pixelmatch(
        canonical.data,
        reversed.data,
        undefined,
        canonical.width,
        canonical.height,
        { threshold: 0 }
      )
    ).toBe(0);
  });
});

