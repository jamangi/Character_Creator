import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveAnimation, resolveCharacter } from "@character-creator/core";
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
const fileHash = (path: string): string => createHash("sha256").update(readFileSync(join(root, path))).digest("hex");

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
    expect(assets.filter((asset) => asset.kind === "body-module")).toHaveLength(4);
    expect(assets.filter((asset) => asset.display.tags.includes("multi-plane")).length).toBeGreaterThanOrEqual(4);
    expect(assets.filter((asset) => asset.display.tags.includes("shoulder-crossing")).length).toBeGreaterThanOrEqual(2);
  });

  it("publishes independently suppressible bilateral arm fragments and modules", () => {
    const { rig, assets, recipes } = packFixtures();
    expect(rig.slots.filter((slot) => slot.id === "body-arm-left" || slot.id === "body-arm-right").map((slot) => slot.id).sort())
      .toEqual(["body-arm-left", "body-arm-right"]);
    const base = assets.find((asset) => asset.kind === "base-body");
    if (base === undefined) throw new Error("Base body missing");
    for (const side of ["left", "right"] as const) {
      expect(base.fragments.some((fragment) => fragment.tags.includes(`body.arm.${side}.base`))).toBe(true);
      const modules = assets.filter((asset) => asset.kind === "body-module" && asset.equip.slots.includes(`body-arm-${side}`));
      expect(modules).toHaveLength(2);
      expect(modules.every((asset) => asset.effects.some((effect) => effect.kind === "suppress-tags" && effect.targetTags.includes(`body.arm.${side}.base`)))).toBe(true);
      expect(modules.every((asset) => Object.keys(asset.palette.roles).includes(`body.arm.${side}`))).toBe(true);
    }
    const recipe = recipes[1];
    if (recipe === undefined) throw new Error("Replacement hero missing");
    for (const request of [
      { profile: "portrait" as const, view: "front", expression: "neutral" },
      { profile: "full-body" as const, view: "front", expression: "neutral" },
      { profile: "sprite" as const, view: "front", clip: "walk" as const, frame: "contact-left" }
    ]) {
      const scene = resolveCharacter({ recipe, rig, catalog: assets, request });
      expect(scene.diagnostics, JSON.stringify(request)).toEqual([]);
      expect(scene.drawList.some((item) => item.tags.includes("body.arm.left.replacement"))).toBe(true);
      expect(scene.drawList.some((item) => item.tags.includes("body.arm.right.replacement"))).toBe(true);
    }
  });

  it("uses stable independent palette roles for body, clothing, and accessory slots", () => {
    const { assets } = packFixtures();
    const expectedByKind = new Map([
      ["top", "garment.top"], ["bottom", "garment.bottom"], ["outfit", "garment.outfit"],
      ["outerwear", "garment.outerwear"], ["shoes", "garment.shoes"]
    ]);
    for (const asset of assets) {
      const expected = expectedByKind.get(asset.kind);
      if (expected !== undefined) expect(Object.keys(asset.palette.roles)).toEqual([expected]);
      if (asset.kind === "accessory") expect(Object.keys(asset.palette.roles)[0]).toMatch(/^accessory\.(hat|face|ear|neck|handheld|back|waist|charm)$/);
    }
    expect(new Set(assets.filter((asset) => asset.kind === "accessory").flatMap((asset) => Object.keys(asset.palette.roles))).size).toBeGreaterThanOrEqual(7);
  });

  it("keeps accessory color identity stable across equip and removal", () => {
    const { rig, assets, recipes } = packFixtures();
    const recipe = recipes[0];
    const hat = assets.find((asset) => asset.id === "starter.accessory.brim-hat");
    if (recipe === undefined || hat === undefined) throw new Error("Accessory fixtures missing");
    const colored = {
      ...recipe,
      palette: { ...recipe.palette, "accessory.face": "#E7C44A", "accessory.hat": "#111118", "accessory.waist": "#FF00FF" }
    };
    const withoutHat = resolveCharacter({ recipe: colored, rig, catalog: assets, request: { profile: "full-body", view: "front" } });
    const withHatRecipe = { ...colored, equipped: [...colored.equipped, { assetId: hat.id, version: hat.version }] };
    const withHat = resolveCharacter({ recipe: withHatRecipe, rig, catalog: assets, request: { profile: "full-body", view: "front" } });
    const withoutHatAgain = resolveCharacter({ recipe: { ...withHatRecipe, equipped: withHatRecipe.equipped.filter((selection) => selection.assetId !== hat.id) }, rig, catalog: assets, request: { profile: "full-body", view: "front" } });
    const glassesPalette = (scene: typeof withHat) => scene.drawList.filter((item) => item.assetId === "starter.accessory.glasses").map((item) => item.palette);
    expect(glassesPalette(withHat)).toEqual(glassesPalette(withoutHat));
    expect(glassesPalette(withoutHatAgain)).toEqual(glassesPalette(withoutHat));
    expect(withoutHat.drawList).toEqual(withoutHatAgain.drawList);
    expect(withHat.drawList.some((item) => item.assetId === hat.id && item.palette.some((role) => role.role === "accessory.hat" && role.value === "#111118"))).toBe(true);
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

  it("advertises only the approved front idle/walk/run selector matrix", () => {
    const { rig, assets, recipes } = packFixtures();
    expect(rig.profiles.find((profile) => profile.id === "sprite")?.views).toEqual(["front"]);
    expect(rig.clips.map((clip) => clip.id)).toEqual(["idle", "run", "walk"]);
    expect(rig.clips.every((clip) => clip.directions.length === 1 && clip.directions[0] === "front")).toBe(true);
    const recipe = recipes[0];
    if (recipe === undefined) throw new Error("Hero fixture missing");
    expect(resolveAnimation({ recipe, rig, catalog: assets, clip: "sit" }).diagnostics)
      .toContainEqual(expect.objectContaining({ code: "UNKNOWN_CLIP" }));
    expect(resolveAnimation({ recipe, rig, catalog: assets, clip: "walk", directions: ["back"] }).diagnostics)
      .toContainEqual(expect.objectContaining({ code: "UNKNOWN_VIEW" }));
  });

  it("projects profile-hidden slots without mutating the canonical recipe", () => {
    const { rig, assets, recipes } = packFixtures();
    const recipe = recipes[0];
    if (recipe === undefined) throw new Error("Hero fixture missing");
    const before = JSON.stringify(recipe);
    const portrait = resolveCharacter({ recipe, rig, catalog: assets, request: { profile: "portrait", view: "front" } });
    const fullBody = resolveCharacter({ recipe, rig, catalog: assets, request: { profile: "full-body", view: "front" } });
    const sprite = resolveCharacter({ recipe, rig, catalog: assets, request: { profile: "sprite", view: "front", clip: "idle", frame: "center" } });
    expect(portrait.diagnostics).toEqual([]);
    expect(sprite.diagnostics).toEqual([]);
    expect(portrait.drawList.some((item) => item.contentSlots.some((slot) => slot === "bottom" || slot === "shoes"))).toBe(false);
    expect(sprite.drawList.some((item) => item.contentSlots.includes("mouth"))).toBe(false);
    expect(fullBody.drawList.some((item) => item.contentSlots.includes("bottom"))).toBe(true);
    expect(fullBody.drawList.some((item) => item.contentSlots.includes("shoes"))).toBe(true);
    expect(fullBody.drawList.some((item) => item.contentSlots.includes("mouth"))).toBe(true);
    expect(JSON.stringify(recipe)).toBe(before);
  });

  it("uses the equipped mouth for neutral output while retaining expression-authored curves", () => {
    const { assets } = packFixtures();
    const mouths = assets.filter((asset) => asset.equip.slots.includes("mouth"));
    expect(mouths).toHaveLength(4);
    const sourceFor = (asset: AssetManifest, profile: "portrait" | "full-body", expression: string): string => {
      const fragment = asset.fragments.find((candidate) =>
        candidate.selector.profile === profile &&
        candidate.selector.view === "front" &&
        (candidate.selector.expression === expression || (profile === "full-body" && candidate.selector.expression === "*"))
      );
      if (fragment === undefined) throw new Error(`Missing ${asset.id} ${profile}/${expression}`);
      return `packages/starter-pack/${fragment.source}`;
    };
    const neutralPortraitHashes = mouths.map((asset) => fileHash(sourceFor(asset, "portrait", "neutral")));
    const neutralFullBodyHashes = mouths.map((asset) => fileHash(sourceFor(asset, "full-body", "neutral")));
    const cheerfulHashes = mouths.map((asset) => fileHash(sourceFor(asset, "portrait", "cheerful")));
    expect(new Set(neutralPortraitHashes).size).toBe(mouths.length);
    expect(new Set(neutralFullBodyHashes).size).toBe(mouths.length);
    expect(new Set(cheerfulHashes).size).toBe(1);
  });

  it("gives every visible hero asset exact retained-frame motion groups", () => {
    const { rig, assets, recipes } = packFixtures();
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const hidden = new Set(rig.profiles.find((profile) => profile.id === "sprite")?.hiddenSlots ?? []);
    for (const recipe of recipes) for (const selection of recipe.equipped) {
      const asset = assetById.get(selection.assetId);
      if (asset === undefined || asset.equip.slots.every((slot) => hidden.has(slot))) continue;
      const sprite = asset.fragments.filter((fragment) => fragment.selector.profile === "sprite");
      const groups = new Set(sprite.map((fragment) => fragment.motionGroup ?? "main"));
      for (const clip of rig.clips) for (const frame of clip.frames) for (const group of groups) {
        expect(sprite.some((fragment) =>
          (fragment.motionGroup ?? "main") === group &&
          fragment.selector.view === "front" &&
          fragment.selector.clip === clip.id &&
          fragment.selector.frame === frame.id
        ), `${asset.id} ${group} ${clip.id}.${frame.id}`).toBe(true);
      }
    }
  });
});
