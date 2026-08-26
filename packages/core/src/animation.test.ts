import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig,
  type AssetFragment,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";
import { describe, expect, it } from "vitest";
import { resolveAnimation, validateFootContactSamples } from "./animation.js";

const root = process.cwd();
const json = (path: string): unknown => JSON.parse(readFileSync(join(root, path), "utf8")) as unknown;

function proof(): { rig: RigDefinition; recipe: CharacterRecipe; asset: AssetManifest } {
  const rig = parseRig(json("fixtures/valid/rig/starter-humanoid.json"));
  const parsedRecipe = parseCharacterRecipe(json("fixtures/valid/recipes/proof-character.json"));
  if (!rig.ok || !parsedRecipe.ok) throw new Error("Fixture parse failed");
  const base = parseAssetManifest(json("fixtures/valid/assets/base-standard.json"), rig.value);
  if (!base.ok) throw new Error("Base parse failed");
  const asset = structuredClone(base.value);
  const core = asset.fragments.find((fragment) => fragment.id === "sprite.core");
  const arm = asset.fragments.find((fragment) => fragment.id === "sprite.arm-left");
  if (core === undefined || arm === undefined) throw new Error("Sprite seed fragments missing");
  const fragments: AssetFragment[] = asset.fragments.filter((fragment) => fragment.selector.profile !== "sprite");
  for (const clip of rig.value.clips) for (const direction of clip.directions) for (const frame of clip.frames) {
    for (const seed of [core, arm]) fragments.push({
      ...structuredClone(seed),
      id: `${clip.id}.${direction}.${frame.id}.${seed.id.endsWith("core") ? "core" : "arm"}`,
      selector: { profile: "sprite", view: direction, clip: clip.id, frame: frame.id },
      mirrorSafe: true
    });
  }
  asset.fragments = fragments;
  const recipe = { ...parsedRecipe.value, equipped: [{ assetId: asset.id, version: asset.version }] };
  return { rig: rig.value, recipe, asset };
}

describe("directional animation resolution", () => {
  it("resolves idle, sit, walk, and run across all four directions", () => {
    const input = proof();
    const counts = input.rig.clips.map((clip) => {
      const result = resolveAnimation({ ...input, catalog: [input.asset], clip: clip.id });
      expect(result.diagnostics).toEqual([]);
      return result.frames.length;
    });
    expect(counts).toEqual([4, 16, 4, 16]);
  });

  it("rejects missing critical motion art instead of using a static fallback", () => {
    const input = proof();
    input.asset.fragments = input.asset.fragments.filter((fragment) => fragment.id !== "run.front.contact-left.core");
    const result = resolveAnimation({ ...input, catalog: [input.asset], clip: "run", directions: ["front"] });
    expect(result.diagnostics.some((item) => item.code === "MISSING_MOTION_ARTWORK")).toBe(true);
  });

  it("forbids mirroring an asymmetric equipped fragment", () => {
    const input = proof();
    input.asset.fragments = input.asset.fragments.filter((fragment) => fragment.selector.view !== "right");
    const left = input.asset.fragments.find((fragment) => fragment.id === "walk.left.contact-left.core");
    if (left !== undefined) left.mirrorSafe = false;
    const result = resolveAnimation({ ...input, catalog: [input.asset], clip: "walk", directions: ["right"] });
    expect(result.diagnostics.some((item) => item.code === "MIRRORING_UNSAFE")).toBe(true);
  });

  it("checks ground contact against a numeric tolerance", () => {
    expect(validateFootContactSamples([{ id: "walk.contact-left", groundLine: 88, contacts: [{ anchor: "foot.left.sole", y: 88.5 }] }], 1)).toEqual([]);
    expect(validateFootContactSamples([{ id: "walk.contact-left", groundLine: 88, contacts: [{ anchor: "foot.left.sole", y: 91 }] }], 1)[0]?.code).toBe("FOOT_CONTACT_DRIFT");
  });
});
