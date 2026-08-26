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
import { CreatorStore } from "./store.js";

const root = process.cwd();
const json = (path: string): unknown => JSON.parse(readFileSync(join(root, path), "utf8")) as unknown;

function fixtures(): { recipe: CharacterRecipe; rig: RigDefinition; assets: AssetManifest[]; catalog: AssetManifest[] } {
  const recipe = parseCharacterRecipe(json("fixtures/valid/recipes/proof-character.json"));
  const rig = parseRig(json("fixtures/valid/rig/starter-humanoid.json"));
  if (!recipe.ok || !rig.ok) throw new Error("Fixture parse failed");
  const assets = ["base-standard.json", "body-arm-left-crystal.json", "hair-long-wave.json", "outerwear-long-coat.json", "top-simple-shirt.json", "accessory-glasses.json", "accessory-neck-scarf.json"].map((name) => {
    const parsed = parseAssetManifest(json(`fixtures/valid/assets/${name}`), rig.value);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
    return parsed.value;
  });
  return { recipe: recipe.value, rig: rig.value, assets, catalog: assets };
}

describe("framework-neutral Creator Studio state", () => {
  it("searches and filters a semantic catalog", () => {
    const input = fixtures();
    const store = new CreatorStore({ ...input });
    expect(store.queryCatalog({ search: "glasses" }).map((asset) => asset.id)).toEqual(["starter.accessory.glasses"]);
    expect(store.queryCatalog({ kinds: ["hair"] }).map((asset) => asset.id)).toEqual(["starter.hair.long-wave"]);
    expect(store.queryCatalog({ compatibleOnly: true }).length).toBeGreaterThan(0);
  });

  it("keeps the last valid recipe when an equip operation is invalid", () => {
    const input = fixtures();
    const store = new CreatorStore({ ...input });
    const before = store.exportJson();
    const rejected = store.unequip("starter.base.standard");
    expect(rejected.ok).toBe(false);
    expect(store.exportJson()).toBe(before);
    expect(rejected.diagnostics.some((item) => item.severity === "error")).toBe(true);
  });

  it("supports equip, undo, redo, and exact recipe round trips", () => {
    const input = fixtures();
    const store = new CreatorStore({ ...input });
    expect(store.equip("starter.accessory.glasses").ok).toBe(true);
    const equipped = store.exportJson();
    expect(equipped).toContain("starter.accessory.glasses");
    expect(store.undo().ok).toBe(true);
    expect(store.exportJson()).not.toContain("starter.accessory.glasses");
    expect(store.redo().ok).toBe(true);
    expect(store.exportJson()).toBe(equipped);
    const second = new CreatorStore({ ...input });
    expect(second.importJson(equipped).ok).toBe(true);
    expect(second.exportJson()).toBe(equipped);
  });

  it("switches preview without mutating recipe intent", () => {
    const input = fixtures();
    const store = new CreatorStore({ ...input });
    const recipe = store.exportJson();
    store.setPreview({ profile: "full-body", view: "back", expression: "smirk" });
    store.setPreview({ profile: "sprite", view: "left", clip: "idle", frame: "center" });
    expect(store.exportJson()).toBe(recipe);
    expect(store.snapshot.canUndo).toBe(false);
  });

  it("undoes and redoes a palette gesture as one exact recipe transaction", () => {
    const input = fixtures();
    const store = new CreatorStore({ ...input });
    const before = store.exportJson();
    expect(store.setPalette("skin.base", "#ABCDEF").ok).toBe(true);
    const changed = store.exportJson();
    expect(changed).not.toBe(before);
    expect(store.undo().ok).toBe(true);
    expect(store.exportJson()).toBe(before);
    expect(store.redo().ok).toBe(true);
    expect(store.exportJson()).toBe(changed);
  });

  it("coalesces many live palette values into one committed history entry", () => {
    const input = fixtures();
    const store = new CreatorStore({ ...input });
    const before = store.exportJson();
    expect(store.previewPalette("skin.base", "#111111").ok).toBe(true);
    expect(store.previewPalette("skin.base", "#222222").ok).toBe(true);
    expect(store.previewPalette("skin.base", "#ABCDEF").ok).toBe(true);
    const final = store.exportJson();
    expect(store.commitPalettePreview().ok).toBe(true);
    expect(store.undo().ok).toBe(true);
    expect(store.exportJson()).toBe(before);
    expect(store.undo().ok).toBe(false);
    expect(store.redo().ok).toBe(true);
    expect(store.exportJson()).toBe(final);
  });

  it("undoes a hero reset in one step and clears redo after a new branch", () => {
    const input = fixtures();
    const alternate = structuredClone(input.recipe);
    alternate.seed = 9876;
    alternate.palette = { ...alternate.palette, "skin.base": "#123456" };
    const store = new CreatorStore({ ...input });
    const before = store.exportJson();
    expect(store.reset(alternate).ok).toBe(true);
    const hero = store.exportJson();
    expect(store.undo().ok).toBe(true);
    expect(store.exportJson()).toBe(before);
    expect(store.redo().ok).toBe(true);
    expect(store.exportJson()).toBe(hero);
    expect(store.undo().ok).toBe(true);
    expect(store.setPalette("skin.base", "#654321").ok).toBe(true);
    expect(store.snapshot.canRedo).toBe(false);
  });

  it("randomizes deterministically", () => {
    const input = fixtures();
    const first = new CreatorStore({ ...input });
    const second = new CreatorStore({ ...input });
    expect(first.randomize(12345).ok).toBe(true);
    expect(second.randomize(12345).ok).toBe(true);
    expect(second.exportJson()).toBe(first.exportJson());
  });
});
