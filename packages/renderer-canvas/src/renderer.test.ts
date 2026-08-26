import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { resolveCharacter, type RenderRequest, type ResolvedScene } from "@character-creator/core";
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
import { applyPaletteMode, renderResolvedScene } from "./renderer.js";
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
    createCanvas: (width, height) => createCanvas(width, height) as unknown as CanvasLike,
    loadImage: async (source) =>
      (await loadImage(join(root, source))) as unknown as CanvasImageLike
  });
  expect(result.diagnostics).toEqual([]);
  return canvas.toBuffer("image/png");
}

async function renderStarterPng(
  recipe: CharacterRecipe,
  rig: RigDefinition,
  assets: AssetManifest[],
  request: RenderRequest
): Promise<Buffer> {
  const scene = resolveCharacter({ recipe, rig, catalog: assets, request });
  expect(scene.diagnostics).toEqual([]);
  const canvas = createCanvas(scene.width, scene.height);
  const result = await renderResolvedScene(scene, {
    canvas: canvas as unknown as CanvasLike,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as CanvasLike,
    loadImage: async (source) =>
      (await loadImage(join(root, "packages/starter-pack", source))) as unknown as CanvasImageLike
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

  it("recolors only authored role pixels while preserving alpha and fixed linework", async () => {
    const source = createCanvas(3, 1);
    const sourceContext = source.getContext("2d");
    sourceContext.fillStyle = "#112233";
    sourceContext.fillRect(0, 0, 1, 1);
    sourceContext.fillStyle = "#2A2035";
    sourceContext.fillRect(1, 0, 1, 1);
    const scene: ResolvedScene = {
      width: 3,
      height: 1,
      sampling: "nearest",
      request: { profile: "sprite", view: "front", expression: "neutral", clip: "idle", frame: "center" },
      drawList: [{
        assetId: "test.palette.sample",
        assetVersion: "1.0.0",
        fragmentId: "main",
        source: "sample.png",
        plane: "body-base",
        planeIndex: 0,
        order: 0,
        anchor: { x: 0, y: 0 },
        offset: [0, 0],
        pivot: [0, 0],
        palette: [{ role: "sample.base", source: "#112233", value: "#AABBCC", mode: "replace" }],
        contentSlots: ["sample"],
        tags: [],
        covers: [],
        selector: { profile: "sprite", view: "front", clip: "idle", frame: "center" }
      }],
      diagnostics: [],
      provenance: {
        engineVersion: "0.1.0",
        schemaVersion: "0.1.0",
        rig: { id: "test-rig@1", version: "1.0.0" },
        recipeFingerprint: "test",
        request: { profile: "sprite", view: "front", expression: "neutral", clip: "idle", frame: "center" },
        assets: []
      }
    };
    const output = createCanvas(3, 1);
    const result = await renderResolvedScene(scene, {
      canvas: output as unknown as CanvasLike,
      createCanvas: (width, height) => createCanvas(width, height) as unknown as CanvasLike,
      loadImage: async () => source as unknown as CanvasImageLike
    });
    expect(result.diagnostics).toEqual([]);
    expect(Array.from(output.getContext("2d").getImageData(0, 0, 3, 1).data)).toEqual([
      170, 187, 204, 255,
      42, 32, 53, 255,
      0, 0, 0, 0
    ]);
  });

  it("maps authored colors to requested colors for every palette mode", () => {
    const authored: [number, number, number] = [64, 128, 192];
    const target: [number, number, number] = [180, 90, 45];
    expect(applyPaletteMode(authored, authored, target, "replace")).toEqual(target);
    expect(applyPaletteMode(authored, authored, target, "multiply")).toEqual(target);
    expect(applyPaletteMode(authored, authored, target, "screen")).toEqual(target);
  });

  it("renders scene differences across retained walk and run motion for all three heroes", async () => {
    const catalog = json("packages/starter-pack/catalog.json") as {
      rig: unknown;
      assets: unknown[];
      heroRecipes: Array<{ id: string; recipe: unknown }>;
    };
    const parsedRig = parseRig(catalog.rig);
    if (!parsedRig.ok) throw new Error("Starter rig failed to parse");
    const assets = catalog.assets.map((value) => {
      const parsed = parseAssetManifest(value, parsedRig.value);
      if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
      return parsed.value;
    });
    for (const hero of catalog.heroRecipes) {
      const parsedRecipe = parseCharacterRecipe(hero.recipe);
      if (!parsedRecipe.ok) throw new Error(`Hero ${hero.id} failed to parse`);
      for (const [clip, left, right] of [
        ["walk", "contact-left", "contact-right"],
        ["run", "contact-left", "flight-left"]
      ] as const) {
        const first = PNG.sync.read(await renderStarterPng(parsedRecipe.value, parsedRig.value, assets, {
          profile: "sprite", view: "front", clip, frame: left
        }));
        const second = PNG.sync.read(await renderStarterPng(parsedRecipe.value, parsedRig.value, assets, {
          profile: "sprite", view: "front", clip, frame: right
        }));
        expect(pixelmatch(first.data, second.data, undefined, first.width, first.height, { threshold: 0 }), `${hero.id} ${clip}`).toBeGreaterThan(0);
      }
    }
  });
});
