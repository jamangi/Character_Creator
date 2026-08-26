import { createCatalog, resolveCharacter } from "@character-creator/core";
import { CreatorStore, type BodyProfileOption } from "@character-creator/creator-ui";
import { renderResolvedScene, type CanvasLike, type CanvasImageLike } from "@character-creator/renderer-canvas";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";

interface StudioData {
  rig: unknown;
  assets: unknown[];
  heroRecipes: Array<{ id: string; name: string; recipe: unknown }>;
  bodyProfiles: Array<{ id: string; name: string; recipe: unknown }>;
}

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing #${id}`);
  return element as T;
};

const canvas = byId<HTMLCanvasElement>("character-canvas");
const assetGrid = byId<HTMLDivElement>("asset-grid");
const search = byId<HTMLInputElement>("search");
const compatible = byId<HTMLButtonElement>("compatible");
const categories = byId<HTMLDivElement>("categories");
const equipped = byId<HTMLOListElement>("equipped");
const paletteControls = byId<HTMLDivElement>("palette-controls");
const diagnostics = byId<HTMLDivElement>("diagnostics");
const renderState = byId<HTMLSpanElement>("render-state");
const bodyProfile = byId<HTMLSelectElement>("body-profile");
const heroRecipesElement = byId<HTMLDivElement>("hero-recipes");
const dialog = byId<HTMLDialogElement>("recipe-dialog");
const recipeJson = byId<HTMLTextAreaElement>("recipe-json");
const dialogTitle = byId<HTMLHeadingElement>("dialog-title");
const dialogHelp = byId<HTMLParagraphElement>("dialog-help");
let activeCategory = "all";
let baseline: CharacterRecipe;
let store: CreatorStore;
let assets: AssetManifest[] = [];
let rig: RigDefinition;
let heroes: Array<{ id: string; name: string; recipe: CharacterRecipe }> = [];
let renderToken = 0;

function image(source: string): Promise<CanvasImageLike> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`Could not load ${source}`));
    element.src = `studio-data/${source}`;
  });
}

function currentRequest() {
  const request = store.snapshot.preview;
  return request.profile === "sprite"
    ? { ...request, view: request.view ?? "front", clip: request.clip ?? "idle", frame: request.frame ?? "center" }
    : request;
}

async function render(): Promise<void> {
  const token = ++renderToken;
  renderState.textContent = "Resolving…";
  const scene = resolveCharacter({ recipe: store.snapshot.recipe, rig, catalog: store.catalog, request: currentRequest() });
  const result = await renderResolvedScene(scene, {
    canvas: canvas as unknown as CanvasLike,
    createCanvas: (width, height) => Object.assign(document.createElement("canvas"), { width, height }) as unknown as CanvasLike,
    loadImage: image
  });
  if (token !== renderToken) return;
  const actionErrors = store.snapshot.diagnostics.filter((item) => item.severity === "error");
  const errors = actionErrors.length > 0 ? actionErrors : result.diagnostics.filter((item) => item.severity === "error");
  renderState.textContent = errors.length === 0 ? `${scene.drawList.length} layers · deterministic` : `${errors.length} issue${errors.length === 1 ? "" : "s"}`;
  diagnostics.innerHTML = errors.length === 0
    ? "<p>No conflicts. This recipe is ready to render.</p>"
    : errors.map((item) => `<p class="error"><strong>${item.code}</strong> — ${item.message}</p>`).join("");
}

function updateCatalog(): void {
  const kinds = activeCategory === "all" ? undefined : [activeCategory as AssetManifest["kind"]];
  const results = store.queryCatalog({ search: search.value, kinds, compatibleOnly: compatible.getAttribute("aria-pressed") === "true" });
  const selected = new Set(store.snapshot.recipe.equipped.map((item) => item.assetId));
  assetGrid.innerHTML = results.map((asset) => `<button class="asset-card" type="button" data-asset="${asset.id}" aria-pressed="${selected.has(asset.id)}"><img src="studio-data/${asset.display.thumbnail}" alt="" loading="lazy"><strong>${asset.display.name}</strong><small>${asset.kind.replaceAll("-", " ")}</small></button>`).join("");
  if (results.length === 0) assetGrid.innerHTML = "<p>No assets match these filters.</p>";
}

function updateInspector(): void {
  const snapshot = store.snapshot;
  equipped.innerHTML = snapshot.recipe.equipped.map((selection) => {
    const asset = store.catalog.assets.get(selection.assetId);
    return `<li>${asset?.display.name ?? selection.assetId}<button type="button" data-remove="${selection.assetId}" aria-label="Remove ${asset?.display.name ?? selection.assetId}">×</button></li>`;
  }).join("");
  const roles = new Set(assets.flatMap((asset) => Object.keys(asset.palette.roles)));
  paletteControls.innerHTML = [...roles].sort().map((role) => {
    const fallback = assets.find((asset) => asset.palette.roles[role] !== undefined)?.palette.roles[role]?.default ?? "#ffffff";
    return `<label><input type="color" data-palette="${role}" value="${snapshot.recipe.palette[role] ?? fallback}"><span>${role.replaceAll(".", " ")}</span></label>`;
  }).join("");
  byId<HTMLButtonElement>("undo").disabled = !snapshot.canUndo;
  byId<HTMLButtonElement>("redo").disabled = !snapshot.canRedo;
}

function updateAll(): void {
  updateCatalog();
  updateInspector();
  void render();
}

function download(name: string, blob: Blob): void {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

async function initialize(): Promise<void> {
  const response = await fetch("studio-data/catalog.json");
  if (!response.ok) throw new Error(`Studio data unavailable (${response.status})`);
  const data = await response.json() as StudioData;
  const rigResult = parseRig(data.rig);
  if (!rigResult.ok) throw new Error(rigResult.diagnostics.map((item) => item.message).join("; "));
  rig = rigResult.value;
  assets = data.assets.map((value) => {
    const parsed = parseAssetManifest(value, rig);
    if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join("; "));
    return parsed.value;
  });
  heroes = data.heroRecipes.map((value) => {
    const parsed = parseCharacterRecipe(value.recipe);
    if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join("; "));
    return { id: value.id, name: value.name, recipe: parsed.value };
  });
  const profiles: BodyProfileOption[] = data.bodyProfiles.map((value) => {
    const parsed = parseCharacterRecipe(value.recipe);
    if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join("; "));
    return { id: value.id, name: value.name, recipe: parsed.value };
  });
  baseline = structuredClone(heroes[0]?.recipe ?? profiles[0]?.recipe);
  if (baseline === undefined) throw new Error("Starter pack did not publish a baseline recipe");
  store = new CreatorStore({ recipe: baseline, rig, catalog: createCatalog(assets).catalog, bodyProfiles: profiles });
  store.subscribe(updateAll);

  const kinds = ["all", ...new Set(assets.map((asset) => asset.kind))];
  categories.innerHTML = kinds.map((kind) => `<button type="button" data-kind="${kind}" aria-pressed="${kind === "all"}">${kind.replaceAll("-", " ")}</button>`).join("");
  bodyProfile.innerHTML = profiles.map((profile) => `<option value="${profile.id}">${profile.name}</option>`).join("");
  heroRecipesElement.innerHTML = heroes.map((hero) => `<button type="button" data-hero="${hero.id}">${hero.name}</button>`).join("");

  assetGrid.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-asset]");
    const id = button?.dataset["asset"];
    if (id === undefined) return;
    if (button.getAttribute("aria-pressed") === "true") store.unequip(id); else store.equip(id);
  });
  equipped.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove]");
    const id = button?.dataset["remove"];
    if (id !== undefined) store.unequip(id);
  });
  categories.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-kind]");
    if (button === null) return;
    activeCategory = button.dataset["kind"] ?? "all";
    categories.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    updateCatalog();
  });
  paletteControls.addEventListener("input", (event) => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>("[data-palette]");
    const role = input?.dataset["palette"];
    if (input !== null && role !== undefined) {
      store.setPalette(role, input.value.toUpperCase());
    }
  });
  search.addEventListener("input", updateCatalog);
  compatible.addEventListener("click", () => { compatible.setAttribute("aria-pressed", String(compatible.getAttribute("aria-pressed") !== "true")); updateCatalog(); });
  document.querySelectorAll<HTMLButtonElement>("[data-preview]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll<HTMLButtonElement>("[data-preview]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    const profile = button.dataset["preview"] as "portrait" | "full-body" | "sprite";
    store.setPreview(profile === "sprite" ? { profile, view: "front", clip: "idle", frame: "center" } : { profile, view: "front", expression: "neutral" });
  }));
  byId("undo").addEventListener("click", () => store.undo());
  byId("redo").addEventListener("click", () => store.redo());
  byId("randomize").addEventListener("click", () => store.randomize(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0));
  byId("reset").addEventListener("click", () => store.reset(baseline));
  bodyProfile.addEventListener("change", () => store.selectBodyProfile(bodyProfile.value));
  heroRecipesElement.addEventListener("click", (event) => {
    const id = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-hero]")?.dataset["hero"];
    const hero = heroes.find((candidate) => candidate.id === id);
    if (hero !== undefined) store.reset(hero.recipe);
  });
  byId("export-recipe").addEventListener("click", () => { dialogTitle.textContent = "Export recipe"; dialogHelp.textContent = "Compact, canonical JSON contains intent only—never pixels."; recipeJson.value = store.exportJson(); byId<HTMLButtonElement>("apply-recipe").hidden = true; byId<HTMLButtonElement>("copy-recipe").hidden = false; dialog.showModal(); });
  byId("import-recipe").addEventListener("click", () => { dialogTitle.textContent = "Import recipe"; dialogHelp.textContent = "The source is validated before it can replace your current character."; recipeJson.value = ""; byId<HTMLButtonElement>("apply-recipe").hidden = false; byId<HTMLButtonElement>("copy-recipe").hidden = true; dialog.showModal(); recipeJson.focus(); });
  byId("copy-recipe").addEventListener("click", () => void navigator.clipboard.writeText(recipeJson.value));
  byId("apply-recipe").addEventListener("click", () => { if (store.importJson(recipeJson.value).ok) dialog.close(); });
  byId("export-png").addEventListener("click", () => canvas.toBlob((blob) => { if (blob !== null) download("character.png", blob); }, "image/png"));
  renderState.textContent = "Ready";
}

fetch("validation/index.json").then((response) => response.json()).then((data: { entries?: Array<{ task: string; title: string; href: string; status: string }> }) => {
  byId("review-links").innerHTML = (data.entries ?? []).map((entry) => `<a href="${entry.href}">${entry.task} · ${entry.title} <small>${entry.status}</small></a>`).join("");
}).catch(() => undefined);

initialize().catch((error) => {
  renderState.textContent = "Studio failed to start";
  diagnostics.innerHTML = `<p class="error">${error instanceof Error ? error.message : String(error)}</p>`;
});
