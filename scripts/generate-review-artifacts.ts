import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile as writeFileOnce, copyFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createCanvas, loadImage, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import {
  resolveAnimation,
  resolveCharacter,
  type RenderRequest
} from "../packages/core/dist/index.js";
import {
  parseAssetManifest,
  parseAssetPack,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "../packages/schema/dist/index.js";
import {
  inspectPng,
  validatePack,
  writeValidationReport,
  type FileInspection,
  type ValidationRenderCase
} from "../packages/asset-validator/dist/index.js";
import {
  packAtlas,
  renderResolvedScene,
  type CanvasLike
} from "../packages/renderer-canvas/dist/index.js";

const root = process.cwd();
const packRoot = join(root, "packages/starter-pack");
const task4Root = join(root, "site/validation/task-004");
const task5Root = join(root, "site/validation/task-005");
const task6Root = join(root, "site/validation/task-006");
const task7Root = join(root, "site/validation/task-007");
const task17Root = join(root, "site/validation/task-017");
const task18Root = join(root, "site/validation/task-018");
const task19Root = join(root, "site/validation/task-019");
const task20Root = join(root, "site/validation/task-020");
const generatedAt = "2026-08-26T19:00:00.000Z";

async function withUnknownRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "UNKNOWN" || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
  throw new Error("Retry loop exhausted");
}

async function writeFile(path: string, data: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
  await withUnknownRetry(() => writeFileOnce(path, data, encoding));
}

function json(path: string): unknown {
  return JSON.parse(requireText(path)) as unknown;
}

function requireText(path: string): string {
  return readFileSync(path, "utf8");
}

const parsedRig = parseRig(json(join(packRoot, "rig.json")));
const parsedPack = parseAssetPack(json(join(packRoot, "pack.json")));
if (!parsedRig.ok || !parsedPack.ok) throw new Error("Starter pack root data failed validation");
const rig = parsedRig.value;
const pack = parsedPack.value;
const assets = pack.assets.map((entry) => {
  const parsed = parseAssetManifest(json(join(packRoot, entry.manifest)), rig);
  if (!parsed.ok) throw new Error(`${entry.id}: ${JSON.stringify(parsed.diagnostics)}`);
  return parsed.value;
});
const assetById = new Map(assets.map((asset) => [asset.id, asset]));
const heroDefinitions = [
  ["everyday-layered", "Everyday Layered"],
  ["silhouette-replacement", "Silhouette Replacement"],
  ["occlusion-stress", "Occlusion Stress"]
] as const;
const heroes = heroDefinitions.map(([id, name]) => {
  const parsed = parseCharacterRecipe(json(join(packRoot, "recipes", `${id}.json`)));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
  return { id, name, recipe: parsed.value };
});

for (const generatedPath of [
  join(task5Root, "proofs"),
  join(task6Root, "frames"),
  join(task6Root, "before"),
  join(task7Root, "renders"),
  join(task7Root, "sheets"),
  join(task7Root, "galleries"),
  join(task17Root, "renders"),
  join(task18Root, "renders"),
  join(task19Root, "renders"),
  join(task20Root, "renders")
]) await rm(generatedPath, { recursive: true, force: true });
await rm(join(task6Root, "asymmetric-explicit.png"), { force: true });

interface RenderedItem {
  label: string;
  canvas: Canvas;
  request: RenderRequest;
  recipe: CharacterRecipe;
}

async function render(recipe: CharacterRecipe, request: RenderRequest): Promise<Canvas> {
  const scene = resolveCharacter({ recipe, rig, catalog: assets, request });
  const canvas = createCanvas(scene.width, scene.height);
  const result = await renderResolvedScene(scene, {
    canvas: canvas as unknown as CanvasLike,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as CanvasLike,
    loadImage: (source) => loadImage(join(packRoot, source))
  });
  const errors = result.diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0) throw new Error(`${recipe.metadata?.["name"]}: ${JSON.stringify(errors)}`);
  return canvas;
}

async function saveCanvas(path: string, canvas: Canvas): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, canvas.toBuffer("image/png"));
}

function checker(context: SKRSContext2D, x: number, y: number, width: number, height: number, size = 12): void {
  for (let row = 0; row < Math.ceil(height / size); row += 1) for (let column = 0; column < Math.ceil(width / size); column += 1) {
    context.fillStyle = (row + column) % 2 === 0 ? "#241f2e" : "#322a40";
    context.fillRect(x + column * size, y + row * size, Math.min(size, width - column * size), Math.min(size, height - row * size));
  }
}

function label(context: SKRSContext2D, value: string, x: number, y: number, maxWidth: number): void {
  context.fillStyle = "#f7f2ff";
  context.font = "600 14px sans-serif";
  context.fillText(value, x, y, maxWidth);
}

async function contactSheet(items: readonly RenderedItem[], columns: number, cellWidth: number, cellHeight: number): Promise<Canvas> {
  const rows = Math.ceil(items.length / columns);
  const canvas = createCanvas(columns * cellWidth, rows * cellHeight);
  const context = canvas.getContext("2d");
  context.fillStyle = "#0d0a14";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    context.fillStyle = "#171321";
    context.fillRect(x + 5, y + 5, cellWidth - 10, cellHeight - 10);
    label(context, item.label, x + 14, y + 25, cellWidth - 28);
    const availableWidth = cellWidth - 24;
    const availableHeight = cellHeight - 46;
    const scale = Math.min(availableWidth / item.canvas.width, availableHeight / item.canvas.height);
    const width = item.canvas.width * scale;
    const height = item.canvas.height * scale;
    const imageX = x + (cellWidth - width) / 2;
    const imageY = y + 36 + (availableHeight - height) / 2;
    checker(context, imageX, imageY, width, height, Math.max(4, 12 * scale));
    context.imageSmoothingEnabled = item.request.profile !== "sprite";
    context.drawImage(item.canvas, imageX, imageY, width, height);
  }
  return canvas;
}

function equip(recipe: CharacterRecipe, assetId: string): CharacterRecipe {
  const target = assetById.get(assetId);
  if (target === undefined) throw new Error(`Unknown matrix asset ${assetId}`);
  const slots = new Set(target.equip.slots);
  const equipped = recipe.equipped.filter((selection) => {
    const current = assetById.get(selection.assetId);
    return current === undefined || !current.equip.slots.some((slot) => slots.has(slot));
  });
  equipped.push({ assetId: target.id, version: target.version });
  return { ...recipe, equipped };
}

function unequip(recipe: CharacterRecipe, assetId: string): CharacterRecipe {
  return { ...recipe, equipped: recipe.equipped.filter((selection) => selection.assetId !== assetId) };
}

function withPalette(recipe: CharacterRecipe, role: string, value: string): CharacterRecipe {
  return { ...recipe, palette: { ...recipe.palette, [role]: value } };
}

function changedPixels(left: Canvas, right: Canvas): number {
  const leftPixels = left.getContext("2d").getImageData(0, 0, left.width, left.height).data;
  const rightPixels = right.getContext("2d").getImageData(0, 0, right.width, right.height).data;
  let changed = 0;
  for (let offset = 0; offset < leftPixels.length; offset += 4) {
    if (leftPixels[offset] !== rightPixels[offset] ||
        leftPixels[offset + 1] !== rightPixels[offset + 1] ||
        leftPixels[offset + 2] !== rightPixels[offset + 2] ||
        leftPixels[offset + 3] !== rightPixels[offset + 3]) changed += 1;
  }
  return changed;
}

const heroSummary: RenderedItem[] = [];
for (const hero of heroes) {
  const portraitItems: RenderedItem[] = [];
  for (const expression of rig.expressions) {
    const request = { profile: "portrait" as const, view: "front", expression: expression.id };
    const canvas = await render(hero.recipe, request);
    portraitItems.push({ label: expression.id, canvas, request, recipe: hero.recipe });
    await saveCanvas(join(task7Root, "renders", hero.id, `portrait-${expression.id}.png`), canvas);
  }
  await saveCanvas(join(task7Root, "sheets", `${hero.id}-expressions.png`), await contactSheet(portraitItems, 4, 188, 215));

  const turnarounds: RenderedItem[] = [];
  const fullViews = rig.profiles.find((profile) => profile.id === "full-body")?.views ?? [];
  for (const view of fullViews) {
    const request = { profile: "full-body" as const, view, expression: "neutral" };
    const canvas = await render(hero.recipe, request);
    turnarounds.push({ label: view, canvas, request, recipe: hero.recipe });
    await saveCanvas(join(task7Root, "renders", hero.id, `full-body-${view}.png`), canvas);
    if (view === "front") heroSummary.push({ label: hero.name, canvas, request, recipe: hero.recipe });
  }
  await saveCanvas(join(task7Root, "sheets", `${hero.id}-turnaround.png`), await contactSheet(turnarounds, 4, 230, 410));

  const animationItems: RenderedItem[] = [];
  for (const clip of rig.clips) for (const view of clip.directions) for (const frame of clip.frames) {
    const request = { profile: "sprite" as const, view, clip: clip.id, frame: frame.id };
    const canvas = await render(hero.recipe, request);
    animationItems.push({ label: `${clip.id} · ${view} · ${frame.id}`, canvas, request, recipe: hero.recipe });
    await saveCanvas(join(task7Root, "renders", hero.id, "animation", `${clip.id}-${view}-${frame.id}.png`), canvas);
  }
  await saveCanvas(join(task7Root, "sheets", `${hero.id}-animation.png`), await contactSheet(animationItems, 8, 142, 142));
}
await saveCanvas(join(task7Root, "sheets", "hero-summary.png"), await contactSheet(heroSummary, 3, 300, 430));

const hairIds = assets.filter((asset) => asset.kind === "hair").map((asset) => asset.id);
const headIds = assets.filter((asset) => asset.equip.slots.includes("head")).map((asset) => asset.id);
const outerIds = ["starter.outerwear.short-jacket", "starter.outerwear.long-coat", "starter.outfit.simple"];
const hairMatrix: RenderedItem[] = [];
for (const hairId of hairIds) for (const headId of headIds) for (const outerId of outerIds) {
  let value = equip(heroes[0]?.recipe ?? (() => { throw new Error("Hero missing"); })(), hairId);
  value = equip(value, headId);
  value = equip(value, outerId);
  const request = { profile: "full-body" as const, view: "front", expression: "neutral" };
  hairMatrix.push({ label: `${hairId.split(".").at(-1)} · ${headId.split(".").at(-1)} · ${outerId.split(".").at(-1)}`, canvas: await render(value, request), request, recipe: value });
}
await saveCanvas(join(task7Root, "galleries", "hair-head-outer-matrix.png"), await contactSheet(hairMatrix, 9, 160, 235));

const bodyRecipes = [
  ["starter.base.standard", "starter.top.fitted-shirt", "starter.bottom.fitted-pants", "starter.shoes.low"],
  ["starter.base.petite", "starter.outfit.simple", "starter.bottom.shorts", "starter.shoes.tall-boots"],
  ["starter.base.broad", "starter.top.sweater", "starter.bottom.wide-trousers", "starter.shoes.boots"]
] as const;
const topIds = assets.filter((asset) => asset.kind === "top").map((asset) => asset.id);
const bottomIds = assets.filter((asset) => asset.kind === "bottom").map((asset) => asset.id);
const shoeIds = assets.filter((asset) => asset.kind === "shoes").map((asset) => asset.id);
const bodyMatrix: RenderedItem[] = [];
for (let index = 0; index < bodyRecipes.length; index += 1) {
  const baseSet = bodyRecipes[index];
  if (baseSet === undefined) continue;
  let baseRecipe = heroes[0]?.recipe;
  if (baseRecipe === undefined) throw new Error("Hero missing");
  for (const assetId of baseSet) baseRecipe = equip(baseRecipe, assetId);
  for (const assetId of [...topIds, ...bottomIds, ...shoeIds]) {
    const value = equip(baseRecipe, assetId);
    const request = { profile: "full-body" as const, view: "front", expression: "neutral" };
    bodyMatrix.push({ label: `${baseSet[0].split(".").at(-1)} · ${assetId.split(".").at(-1)}`, canvas: await render(value, request), request, recipe: value });
  }
}
await saveCanvas(join(task7Root, "galleries", "body-fit-matrix.png"), await contactSheet(bodyMatrix, 8, 166, 240));

const paletteItems: RenderedItem[] = [];
for (const [name, color] of [["light", "#F6D2B8"], ["dark", "#4A2A24"], ["saturated-cyan", "#00E5FF"], ["saturated-coral", "#FF5B70"], ["desaturated", "#8B8793"], ["high-contrast", "#DFFF00"]] as const) {
  const request = { profile: "full-body" as const, view: "front", expression: "neutral" };
  const value = withPalette(heroes[0]?.recipe ?? (() => { throw new Error("Hero missing"); })(), "skin.base", color);
  paletteItems.push({ label: `skin.base · ${name}`, canvas: await render(value, request), request, recipe: value });
}
await saveCanvas(join(task7Root, "galleries", "palette-extremes.png"), await contactSheet(paletteItems, 3, 285, 420));

let adversarial = heroes[2]?.recipe;
if (adversarial === undefined) throw new Error("Hero missing");
for (const assetId of ["starter.marking.runes", "starter.accessory.glasses", "starter.accessory.earrings", "starter.accessory.sketchbook", "starter.body.vine-arm"]) adversarial = equip(adversarial, assetId);
const adversarialRequest = { profile: "full-body" as const, view: "front", expression: "surprised" };
const adversarialItems: RenderedItem[] = [{ label: `${adversarial.equipped.length} simultaneous assets`, canvas: await render(adversarial, adversarialRequest), request: adversarialRequest, recipe: adversarial }];
await saveCanvas(join(task7Root, "galleries", "adversarial-max-fragments.png"), await contactSheet(adversarialItems, 1, 420, 500));

const task6Frames: RenderedItem[] = [];
const animationMetadata: Array<Record<string, unknown>> = [];
const animationHero = heroes[0];
if (animationHero === undefined) throw new Error("Hero missing");
for (const clip of rig.clips) {
  const resolved = resolveAnimation({ recipe: animationHero.recipe, rig, catalog: assets, clip: clip.id });
  if (resolved.diagnostics.length > 0) throw new Error(JSON.stringify(resolved.diagnostics));
  for (const frame of resolved.frames) {
    const request = { profile: "sprite" as const, view: frame.direction, clip: frame.clip, frame: frame.frame };
    const canvas = await render(animationHero.recipe, request);
    const filename = `${frame.clip}-${frame.direction}-${frame.frame}.png`;
    await saveCanvas(join(task6Root, "frames", filename), canvas);
    task6Frames.push({ label: `${frame.clip} · ${frame.direction} · ${frame.frame} · ${frame.durationMs}ms`, canvas, request, recipe: animationHero.recipe });
    animationMetadata.push({ key: `${frame.clip}.${frame.direction}.${frame.frame}`, file: `frames/${filename}`, durationMs: frame.durationMs, contacts: frame.contacts, groundLine: frame.groundLine, mirrored: frame.mirrored });
  }
}
const packed = packAtlas(task6Frames.map((item, index) => ({ key: String(animationMetadata[index]?.["key"]), width: item.canvas.width, height: item.canvas.height, value: index })), { maxWidth: 768, padding: 2 });
if (packed.diagnostics.length > 0) throw new Error(JSON.stringify(packed.diagnostics));
const atlas = createCanvas(packed.width, packed.height);
const atlasContext = atlas.getContext("2d");
atlasContext.imageSmoothingEnabled = false;
for (const frame of packed.frames) {
  const item = task6Frames[frame.value];
  if (item !== undefined) atlasContext.drawImage(item.canvas, frame.x, frame.y);
  const metadata = animationMetadata[frame.value];
  if (metadata !== undefined) Object.assign(metadata, { x: frame.x, y: frame.y, width: frame.width, height: frame.height });
}
await saveCanvas(join(task6Root, "atlas.png"), atlas);
await saveCanvas(join(task6Root, "contact-sheet.png"), await contactSheet(task6Frames, 8, 148, 150));
await writeFile(join(task6Root, "animation.json"), `${JSON.stringify({ hero: animationHero.name, loop: true, atlas: { file: "atlas.png", width: packed.width, height: packed.height }, frames: animationMetadata }, null, 2)}\n`, "utf8");

const defectEvidence = [
  ["walk-frame-01.png", "Before · reported walk 1"],
  ["walk-frame-02.png", "Before · reported walk 2"],
  ["run-frame-01.png", "Before · reported run 1"],
  ["run-frame-02.png", "Before · reported run 2"],
  ["run-frame-03.png", "Before · reported run 3"],
  ["run-frame-04.png", "Before · reported run 4"]
] as const;
const beforeItems: RenderedItem[] = [];
for (const [filename, itemLabel] of defectEvidence) {
  const source = join(root, "shared/defects/DEFECT-001-animation-fragments-stuck", filename);
  const destination = join(task6Root, "before", filename);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  const loaded = await loadImage(source);
  const canvas = createCanvas(loaded.width, loaded.height);
  canvas.getContext("2d").drawImage(loaded, 0, 0);
  beforeItems.push({ label: itemLabel, canvas, request: { profile: "sprite", view: "front", clip: "walk", frame: "contact-left" }, recipe: animationHero.recipe });
}
const afterKeys = [
  "walk.front.contact-left",
  "walk.front.contact-right",
  "run.front.contact-left",
  "run.front.flight-left",
  "run.front.contact-right",
  "run.front.flight-right"
];
const afterItems = afterKeys.map((key) => {
  const index = animationMetadata.findIndex((item) => item["key"] === key);
  const item = task6Frames[index];
  if (item === undefined) throw new Error(`Missing repaired motion frame ${key}`);
  return { ...item, label: `After · ${key.replaceAll(".", " · ")}` };
});
await saveCanvas(join(task6Root, "motion-before-after.png"), await contactSheet([...beforeItems, ...afterItems], 6, 150, 150));

const task5Hero = heroes[0];
const crystalHero = heroes[1];
if (task5Hero === undefined || crystalHero === undefined) throw new Error("Palette proof heroes missing");
const openFaceRecipe = equip(task5Hero.recipe, "starter.hair.bald");
const openFaceMarkingRecipe = equip(openFaceRecipe, "starter.marking.runes");
let accessoryProofRecipe = task5Hero.recipe;
for (const assetId of ["starter.accessory.brim-hat", "starter.accessory.earrings", "starter.accessory.scarf", "starter.accessory.wings", "starter.accessory.pendant"]) accessoryProofRecipe = equip(accessoryProofRecipe, assetId);
const paletteCases: Array<{ role: string; value: string; hero: typeof task5Hero; recipe?: CharacterRecipe }> = [
  { role: "skin.base", value: "#F6D2B8", hero: task5Hero },
  { role: "skin.shadow", value: "#E8D7D2", hero: task5Hero, recipe: openFaceRecipe },
  { role: "mouth.base", value: "#356EEA", hero: task5Hero, recipe: openFaceRecipe },
  { role: "hair.base", value: "#C350D7", hero: task5Hero },
  { role: "garment.top", value: "#FF9B32", hero: task5Hero },
  { role: "garment.bottom", value: "#101116", hero: task5Hero },
  { role: "garment.outfit", value: "#00E7A5", hero: crystalHero },
  { role: "garment.outerwear", value: "#35B66F", hero: task5Hero },
  { role: "garment.shoes", value: "#8B5CF6", hero: task5Hero },
  { role: "body.arm.left", value: "#FF6B9A", hero: crystalHero },
  { role: "body.arm.right", value: "#4DE1D0", hero: crystalHero },
  { role: "eyes.iris", value: "#F2DD42", hero: task5Hero, recipe: openFaceRecipe },
  { role: "marking.base", value: "#FF4F91", hero: task5Hero, recipe: openFaceMarkingRecipe },
  { role: "accessory.hat", value: "#151515", hero: task5Hero, recipe: accessoryProofRecipe },
  { role: "accessory.face", value: "#E7C44A", hero: task5Hero, recipe: accessoryProofRecipe },
  { role: "accessory.ear", value: "#FF5E6C", hero: task5Hero, recipe: accessoryProofRecipe },
  { role: "accessory.neck", value: "#55D6BE", hero: task5Hero, recipe: accessoryProofRecipe },
  { role: "accessory.handheld", value: "#9B7653", hero: task5Hero, recipe: accessoryProofRecipe },
  { role: "accessory.back", value: "#B388EB", hero: task5Hero, recipe: accessoryProofRecipe },
  { role: "accessory.charm", value: "#7AF3FF", hero: task5Hero, recipe: accessoryProofRecipe }
];
const roleItems: RenderedItem[] = [];
const roleMetrics: Array<Record<string, unknown>> = [];
for (const paletteCase of paletteCases) {
  const recipe = paletteCase.recipe ?? paletteCase.hero.recipe;
  const request = { profile: "full-body" as const, view: "front", expression: "neutral" };
  const baseline = await render(recipe, request);
  const changedRecipe = withPalette(recipe, paletteCase.role, paletteCase.value);
  const changed = await render(changedRecipe, request);
  const count = changedPixels(baseline, changed);
  if (count === 0) throw new Error(`Palette proof role ${paletteCase.role} changed no pixels`);
  roleItems.push(
    { label: `${paletteCase.role} · baseline`, canvas: baseline, request, recipe },
    { label: `${paletteCase.role} · only`, canvas: changed, request, recipe: changedRecipe }
  );
  roleMetrics.push({ role: paletteCase.role, hero: paletteCase.hero.name, value: paletteCase.value, changedPixels: count });
}
await saveCanvas(join(task5Root, "proofs", "palette-role-isolation.png"), await contactSheet(roleItems, 4, 218, 348));
await writeFile(join(task5Root, "proofs", "palette-role-isolation.json"), `${JSON.stringify({ generatedAt, cases: roleMetrics }, null, 2)}\n`, "utf8");

const outputRecipeText = JSON.stringify(task5Hero.recipe);
const outputItems: RenderedItem[] = [];
for (const request of [
  { profile: "portrait" as const, view: "front", expression: "neutral" },
  { profile: "full-body" as const, view: "front", expression: "neutral" },
  { profile: "sprite" as const, view: "front", clip: "idle" as const, frame: "center" }
]) outputItems.push({ label: request.profile, canvas: await render(task5Hero.recipe, request), request, recipe: task5Hero.recipe });
await saveCanvas(join(task5Root, "proofs", "output-profile-projections.png"), await contactSheet(outputItems, 3, 280, 430));
const outputRecipeAfter = JSON.stringify(task5Hero.recipe);
await writeFile(join(task5Root, "proofs", "output-profile-projections.json"), `${JSON.stringify({
  generatedAt,
  recipeSha256: createHash("sha256").update(outputRecipeText).digest("hex"),
  recipeByteLength: Buffer.byteLength(outputRecipeText),
  recipeByteIdenticalAfterRendering: outputRecipeAfter === outputRecipeText,
  hiddenSlots: Object.fromEntries(rig.profiles.map((profile) => [profile.id, profile.hiddenSlots ?? []]))
}, null, 2)}\n`, "utf8");

const mouthAssets = assets
  .filter((asset) => asset.equip.slots.includes("mouth"))
  .sort((left, right) => left.display.name.localeCompare(right.display.name));
const neutralPortraitMouths: RenderedItem[] = [];
const neutralFullBodyMouths: RenderedItem[] = [];
const cheerfulPortraitMouths: RenderedItem[] = [];
const mouthProofCases: Array<Record<string, unknown>> = [];
for (const mouth of mouthAssets) {
  const recipe = equip(openFaceRecipe, mouth.id);
  const neutralPortraitRequest = { profile: "portrait" as const, view: "front", expression: "neutral" };
  const neutralFullBodyRequest = { profile: "full-body" as const, view: "front", expression: "neutral" };
  const cheerfulPortraitRequest = { profile: "portrait" as const, view: "front", expression: "cheerful" };
  const neutralPortrait = await render(recipe, neutralPortraitRequest);
  const neutralFullBody = await render(recipe, neutralFullBodyRequest);
  const cheerfulPortrait = await render(recipe, cheerfulPortraitRequest);
  const key = mouth.id.split(".").at(-1) ?? mouth.id;
  await saveCanvas(join(task17Root, "renders", `${key}-neutral-portrait.png`), neutralPortrait);
  await saveCanvas(join(task17Root, "renders", `${key}-neutral-full-body.png`), neutralFullBody);
  await saveCanvas(join(task17Root, "renders", `${key}-cheerful-portrait.png`), cheerfulPortrait);
  neutralPortraitMouths.push({ label: `${mouth.display.name} · neutral portrait`, canvas: neutralPortrait, request: neutralPortraitRequest, recipe });
  neutralFullBodyMouths.push({ label: `${mouth.display.name} · neutral full body`, canvas: neutralFullBody, request: neutralFullBodyRequest, recipe });
  cheerfulPortraitMouths.push({ label: `${mouth.display.name} · cheerful preset`, canvas: cheerfulPortrait, request: cheerfulPortraitRequest, recipe });
  mouthProofCases.push({
    assetId: mouth.id,
    name: mouth.display.name,
    neutralPortraitSha256: createHash("sha256").update(neutralPortrait.toBuffer("image/png")).digest("hex"),
    neutralFullBodySha256: createHash("sha256").update(neutralFullBody.toBuffer("image/png")).digest("hex"),
    cheerfulPortraitSha256: createHash("sha256").update(cheerfulPortrait.toBuffer("image/png")).digest("hex")
  });
}
const uniqueProofHashes = (key: string): number => new Set(mouthProofCases.map((item) => item[key])).size;
if (mouthAssets.length !== 4 || uniqueProofHashes("neutralPortraitSha256") !== 4 || uniqueProofHashes("neutralFullBodySha256") !== 4 || uniqueProofHashes("cheerfulPortraitSha256") !== 1) {
  throw new Error(`Selected-mouth proof failed: ${JSON.stringify(mouthProofCases)}`);
}
await saveCanvas(join(task17Root, "selected-mouth-dominance.png"), await contactSheet([
  ...neutralPortraitMouths,
  ...neutralFullBodyMouths,
  ...cheerfulPortraitMouths
], 4, 250, 405));
await writeFile(join(task17Root, "selected-mouth-dominance.json"), `${JSON.stringify({ generatedAt, cases: mouthProofCases }, null, 2)}\n`, "utf8");

const armBase = task5Hero.recipe;
const armVariants: Array<{ label: string; recipe: CharacterRecipe }> = [
  { label: "Base arms · no replacements", recipe: armBase },
  { label: "Left only · vine", recipe: equip(armBase, "starter.body.vine-arm-left") },
  { label: "Right only · crystal", recipe: equip(armBase, "starter.body.crystal-arm") },
  { label: "Both · vine left + crystal right", recipe: equip(equip(armBase, "starter.body.vine-arm-left"), "starter.body.crystal-arm") }
];
const armFullBody: RenderedItem[] = [];
const armMotion: RenderedItem[] = [];
for (const variant of armVariants) {
  const fullBodyRequest = { profile: "full-body" as const, view: "front", expression: "neutral" };
  armFullBody.push({ label: variant.label, canvas: await render(variant.recipe, fullBodyRequest), request: fullBodyRequest, recipe: variant.recipe });
  for (const [clip, frame] of [["walk", "contact-left"], ["walk", "contact-right"], ["run", "flight-left"], ["run", "flight-right"]] as const) {
    const request = { profile: "sprite" as const, view: "front", clip, frame };
    armMotion.push({ label: `${variant.label} · ${clip} ${frame}`, canvas: await render(variant.recipe, request), request, recipe: variant.recipe });
  }
}
await saveCanvas(join(task18Root, "bilateral-arm-states.png"), await contactSheet(armFullBody, 4, 260, 420));
await saveCanvas(join(task18Root, "bilateral-arm-motion.png"), await contactSheet(armMotion, 8, 150, 150));
await writeFile(join(task18Root, "bilateral-arm-states.json"), `${JSON.stringify({ generatedAt, states: armVariants.map((variant) => ({ label: variant.label, equippedArmAssets: variant.recipe.equipped.filter((selection) => selection.assetId.includes("body.")).map((selection) => selection.assetId) })) }, null, 2)}\n`, "utf8");

let slotColorRecipe = equip(equip(task5Hero.recipe, "starter.body.vine-arm-left"), "starter.body.crystal-arm");
for (const [role, value] of Object.entries({
  "skin.base": "#C98261",
  "body.arm.left": "#E84D8A",
  "body.arm.right": "#4DE1D0",
  "hair.base": "#6D3B8C",
  "garment.top": "#F6A83B",
  "garment.bottom": "#101116",
  "garment.outerwear": "#35A85C",
  "garment.shoes": "#7357C7"
})) slotColorRecipe = withPalette(slotColorRecipe, role, value);
const slotColorRequest = { profile: "full-body" as const, view: "front", expression: "neutral" };
const slotColorItems: RenderedItem[] = [
  { label: "Independent category colors", canvas: await render(slotColorRecipe, slotColorRequest), request: slotColorRequest, recipe: slotColorRecipe },
  ...paletteCases.filter((entry) => ["skin.base", "hair.base", "garment.top", "garment.bottom", "garment.outfit", "garment.outerwear", "garment.shoes", "body.arm.left", "body.arm.right"].includes(entry.role)).flatMap(() => [])
];
await saveCanvas(join(task19Root, "slot-scoped-simultaneous.png"), await contactSheet(slotColorItems, 1, 430, 500));
await saveCanvas(join(task19Root, "slot-scoped-isolation.png"), await contactSheet(roleItems.slice(0, 22), 4, 218, 348));
await writeFile(join(task19Root, "slot-scoped-palette.json"), `${JSON.stringify({ generatedAt, assigned: slotColorRecipe.palette, legacyProjection: { "garment.primary": ["garment.top", "garment.outfit"], "garment.secondary": ["garment.bottom", "garment.outerwear", "garment.shoes"], "skin.base": ["body.arm.left", "body.arm.right"] } }, null, 2)}\n`, "utf8");

for (const [role, value] of Object.entries({
  "accessory.hat": "#121218",
  "accessory.face": "#E7C44A",
  "accessory.ear": "#F06489",
  "accessory.neck": "#38BFA3",
  "accessory.handheld": "#9B7653",
  "accessory.back": "#9B7CE7",
  "accessory.charm": "#69E7F2",
  "accessory.waist": "#E07B39"
})) accessoryProofRecipe = withPalette(accessoryProofRecipe, role, value);
const accessoryRequest = { profile: "full-body" as const, view: "front", expression: "neutral" };
const withoutHat = unequip(accessoryProofRecipe, "starter.accessory.brim-hat");
const restoredHat = equip(withoutHat, "starter.accessory.brim-hat");
const accessoryItems: RenderedItem[] = [
  { label: "Contrasting accessory slots", canvas: await render(accessoryProofRecipe, accessoryRequest), request: accessoryRequest, recipe: accessoryProofRecipe },
  { label: "Hat removed · other colors stable", canvas: await render(withoutHat, accessoryRequest), request: accessoryRequest, recipe: withoutHat },
  { label: "Hat restored · same saved color", canvas: await render(restoredHat, accessoryRequest), request: accessoryRequest, recipe: restoredHat }
];
await saveCanvas(join(task20Root, "accessory-color-stability.png"), await contactSheet(accessoryItems, 3, 300, 440));
await writeFile(join(task20Root, "accessory-color-stability.json"), `${JSON.stringify({ generatedAt, roles: Object.fromEntries(Object.entries(accessoryProofRecipe.palette).filter(([role]) => role.startsWith("accessory."))), equippedOrderIndependent: JSON.stringify(restoredHat.palette) === JSON.stringify(accessoryProofRecipe.palette), unusedWaistRoleRetained: accessoryProofRecipe.palette["accessory.waist"] }, null, 2)}\n`, "utf8");

const allPaths = new Set(assets.flatMap((asset) => [asset.display.thumbnail, ...asset.fragments.map((fragment) => fragment.source)]));
const files = new Map<string, FileInspection>();
let totalBytes = 0;
for (const path of allPaths) {
  const inspection = await inspectPng(join(packRoot, path));
  files.set(path, inspection);
  totalBytes += inspection.byteLength ?? 0;
}
const allRequests: ValidationRenderCase["requests"] = [
  ...rig.expressions.map((expression) => ({ profile: "portrait" as const, view: "front", expression: expression.id })),
  ...(rig.profiles.find((profile) => profile.id === "full-body")?.views ?? []).map((view) => ({ profile: "full-body" as const, view, expression: "neutral" })),
  ...rig.clips.flatMap((clip) => clip.directions.flatMap((view) => clip.frames.map((frame) => ({ profile: "sprite" as const, view, clip: clip.id, frame: frame.id }))))
];
const renderCases = heroes.map((hero) => ({ id: hero.id, recipe: hero.recipe, requests: allRequests }));
const passingReport = validatePack({ rig, pack, assets, files, renderCases, generatedAt });
if (passingReport.summary.errors > 0) throw new Error(JSON.stringify(passingReport.findings, null, 2));
await withUnknownRetry(() => writeValidationReport(passingReport, join(task4Root, "report")));
const failingFiles = new Map(files);
const firstSource = assets[0]?.fragments[0]?.source;
if (firstSource !== undefined) failingFiles.delete(firstSource);
const failingReport = validatePack({ rig, pack, assets, files: failingFiles, renderCases: [], noVisual: true, generatedAt });
await withUnknownRetry(() => writeValidationReport(failingReport, join(task4Root, "failing-report")));
await withUnknownRetry(() => copyFile(join(task7Root, "sheets", "hero-summary.png"), join(task4Root, "contact-sheet.png")));

const measuredStart = process.hrtime.bigint();
for (let index = 0; index < 25; index += 1) await render(animationHero.recipe, { profile: "sprite", view: "front", clip: "walk", frame: "contact-left" });
const measuredMs = Number(process.hrtime.bigint() - measuredStart) / 1_000_000;
const renderTargetAverageMs = 20;
const renderWithinBudget = measuredMs / 25 <= renderTargetAverageMs;
if (!renderWithinBudget) throw new Error(`Representative render budget exceeded: ${measuredMs / 25}ms average`);
const budgets = {
  generatedAt,
  assets: assets.length,
  pngFiles: allPaths.size,
  decodedSourceBytes: totalBytes,
  packBudgetBytes: 32 * 1024 * 1024,
  withinPackBudget: totalBytes <= 32 * 1024 * 1024,
  renderSample: {
    iterations: 25,
    targetAverageMs: renderTargetAverageMs,
    withinBudget: renderWithinBudget,
    note: "Wall-clock timing is evaluated during generation but omitted from this reproducible artifact; only the threshold result is committed."
  }
};
await writeFile(join(task7Root, "budgets.json"), `${JSON.stringify(budgets, null, 2)}\n`, "utf8");
await writeFile(join(task7Root, "matrix.json"), `${JSON.stringify({ generatedAt, hairHeadOuterCases: hairMatrix.length, bodyFitCases: bodyMatrix.length, paletteExtremeCases: paletteItems.length, adversarialCases: adversarialItems.length, heroRequests: allRequests.length * heroes.length }, null, 2)}\n`, "utf8");
console.log(`Published ${heroSummary.length} hero summaries, ${hairMatrix.length + bodyMatrix.length} combination cases, ${task6Frames.length} animation frames, and validator reports.`);
