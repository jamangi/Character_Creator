import { readFileSync } from "node:fs";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
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
const task6Root = join(root, "site/validation/task-006");
const task7Root = join(root, "site/validation/task-007");
const generatedAt = "2026-08-25T19:00:00.000Z";

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

function tint(source: Canvas, color: string): Canvas {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "source-atop";
  context.globalAlpha = .28;
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  return canvas;
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
  paletteItems.push({ label: name, canvas: tint(await render(heroes[0]?.recipe ?? (() => { throw new Error("Hero missing"); })(), request), color), request, recipe: heroes[0]?.recipe ?? (() => { throw new Error("Hero missing"); })() });
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

const asymmetricHero = heroes[1];
if (asymmetricHero !== undefined) {
  const asymmetricItems: RenderedItem[] = [];
  for (const view of ["left", "right"] as const) for (const clipId of ["walk", "run"] as const) {
    const clip = rig.clips.find((candidate) => candidate.id === clipId);
    for (const frame of clip?.frames ?? []) {
      const request = { profile: "sprite" as const, view, clip: clipId, frame: frame.id };
      asymmetricItems.push({ label: `${clipId} · ${view} · ${frame.id} · explicit`, canvas: await render(asymmetricHero.recipe, request), request, recipe: asymmetricHero.recipe });
    }
  }
  await saveCanvas(join(task6Root, "asymmetric-explicit.png"), await contactSheet(asymmetricItems, 8, 148, 150));
}

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
await writeValidationReport(passingReport, join(task4Root, "report"));
const failingFiles = new Map(files);
const firstSource = assets[0]?.fragments[0]?.source;
if (firstSource !== undefined) failingFiles.delete(firstSource);
const failingReport = validatePack({ rig, pack, assets, files: failingFiles, renderCases: [], noVisual: true, generatedAt });
await writeValidationReport(failingReport, join(task4Root, "failing-report"));
await copyFile(join(task7Root, "sheets", "hero-summary.png"), join(task4Root, "contact-sheet.png"));

const measuredStart = process.hrtime.bigint();
for (let index = 0; index < 25; index += 1) await render(animationHero.recipe, { profile: "sprite", view: "front", clip: "walk", frame: "contact-left" });
const measuredMs = Number(process.hrtime.bigint() - measuredStart) / 1_000_000;
const budgets = {
  generatedAt,
  assets: assets.length,
  pngFiles: allPaths.size,
  decodedSourceBytes: totalBytes,
  packBudgetBytes: 32 * 1024 * 1024,
  withinPackBudget: totalBytes <= 32 * 1024 * 1024,
  renderSample: { iterations: 25, totalMs: Number(measuredMs.toFixed(2)), averageMs: Number((measuredMs / 25).toFixed(2)), targetAverageMs: 20 }
};
await writeFile(join(task7Root, "budgets.json"), `${JSON.stringify(budgets, null, 2)}\n`, "utf8");
await writeFile(join(task7Root, "matrix.json"), `${JSON.stringify({ generatedAt, hairHeadOuterCases: hairMatrix.length, bodyFitCases: bodyMatrix.length, paletteExtremeCases: paletteItems.length, adversarialCases: adversarialItems.length, heroRequests: allRequests.length * heroes.length }, null, 2)}\n`, "utf8");
console.log(`Published ${heroSummary.length} hero summaries, ${hairMatrix.length + bodyMatrix.length} combination cases, ${task6Frames.length} animation frames, and validator reports.`);
