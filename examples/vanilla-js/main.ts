import { createCatalog, resolveCharacter } from "@character-creator/core";
import { CreatorStore } from "@character-creator/creator-ui";
import { renderResolvedScene, type CanvasImageLike, type CanvasLike } from "@character-creator/renderer-canvas";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "@character-creator/schema";

interface PublishedCatalog {
  rig: unknown;
  assets: unknown[];
  heroRecipes: Array<{ id: string; name: string; recipe: unknown }>;
}

interface IntegrationOptions {
  assetBaseUrl: URL;
  rig: RigDefinition;
  assets: AssetManifest[];
  recipe: CharacterRecipe;
}

export interface MountedCreator {
  destroy(): void;
  exportRecipe(): string;
}

function imageLoader(baseUrl: URL): (source: string) => Promise<CanvasImageLike> {
  return (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load published asset: ${source}`));
    image.src = new URL(source, baseUrl).href;
  });
}

async function draw(canvas: HTMLCanvasElement, options: IntegrationOptions, recipe: CharacterRecipe): Promise<void> {
  const scene = resolveCharacter({
    recipe,
    rig: options.rig,
    catalog: options.assets,
    request: { profile: "full-body", view: "front", expression: "neutral" }
  });
  const result = await renderResolvedScene(scene, {
    canvas: canvas as unknown as CanvasLike,
    createCanvas: (width, height) => Object.assign(document.createElement("canvas"), { width, height }) as unknown as CanvasLike,
    loadImage: imageLoader(options.assetBaseUrl)
  });
  const errors = result.diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0) throw new Error(errors.map((item) => item.message).join("; "));
}

export function mountCharacterCreator(host: HTMLElement, options: IntegrationOptions): MountedCreator {
  const controller = new AbortController();
  const store = new CreatorStore({ recipe: options.recipe, rig: options.rig, catalog: createCatalog(options.assets).catalog });
  host.innerHTML = `
    <section class="embed" aria-label="Embedded character editor">
      <canvas width="256" height="384" aria-label="Embedded character preview"></canvas>
      <div class="controls">
        <label>Asset to equip<select data-asset></select></label>
        <button type="button" data-equip>Equip selected asset</button>
        <label>Recipe JSON<textarea data-recipe spellcheck="false"></textarea></label>
        <div class="row"><button type="button" data-export>Export</button><button type="button" data-import>Import</button><button type="button" data-undo>Undo</button></div>
        <p data-status role="status">Mounted with package APIs.</p>
      </div>
    </section>`;
  const canvas = host.querySelector("canvas");
  const select = host.querySelector<HTMLSelectElement>("[data-asset]");
  const textarea = host.querySelector<HTMLTextAreaElement>("[data-recipe]");
  const status = host.querySelector<HTMLElement>("[data-status]");
  if (canvas === null || select === null || textarea === null || status === null) throw new Error("Embed shell failed to mount");
  select.innerHTML = options.assets.map((asset) => `<option value="${asset.id}">${asset.display.name} · ${asset.kind}</option>`).join("");

  let renderToken = 0;
  const unsubscribe = store.subscribe((snapshot) => {
    textarea.value = store.exportJson();
    const token = ++renderToken;
    void draw(canvas, options, snapshot.recipe).then(() => {
      if (token === renderToken) status.textContent = `${snapshot.recipe.equipped.length} assets · deterministic render`;
    }).catch((error: unknown) => {
      if (token === renderToken) status.textContent = error instanceof Error ? error.message : String(error);
    });
  });
  const listen = (selector: string, action: () => void): void => {
    host.querySelector(selector)?.addEventListener("click", action, { signal: controller.signal });
  };
  listen("[data-equip]", () => { store.equip(select.value); });
  listen("[data-export]", () => { textarea.value = store.exportJson(); status.textContent = "Canonical recipe exported."; });
  listen("[data-import]", () => { status.textContent = store.importJson(textarea.value).ok ? "Recipe imported and rendered." : "Recipe rejected; previous character retained."; });
  listen("[data-undo]", () => { store.undo(); });

  return {
    destroy() {
      renderToken += 1;
      controller.abort();
      unsubscribe();
      host.replaceChildren();
    },
    exportRecipe: () => store.exportJson()
  };
}

async function loadPublishedCatalog(assetBaseUrl: URL): Promise<{ options: IntegrationOptions; heroes: PublishedCatalog["heroRecipes"] }> {
  const response = await fetch(new URL("catalog.json", assetBaseUrl));
  if (!response.ok) throw new Error(`Published catalog unavailable (${response.status})`);
  const data = await response.json() as PublishedCatalog;
  const rig = parseRig(data.rig);
  if (!rig.ok) throw new Error(rig.diagnostics.map((item) => item.message).join("; "));
  const assets = data.assets.map((value) => {
    const parsed = parseAssetManifest(value, rig.value);
    if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join("; "));
    return parsed.value;
  });
  const first = parseCharacterRecipe(data.heroRecipes[0]?.recipe);
  if (!first.ok) throw new Error(first.diagnostics.map((item) => item.message).join("; "));
  return { options: { assetBaseUrl, rig: rig.value, assets, recipe: first.value }, heroes: data.heroRecipes };
}

const host = document.querySelector<HTMLElement>("#embed-host");
const directCanvas = document.querySelector<HTMLCanvasElement>("#direct-render");
const lifecycleStatus = document.querySelector<HTMLElement>("#lifecycle-status");
if (host === null || directCanvas === null || lifecycleStatus === null) throw new Error("Example host is incomplete");
const assetBaseUrl = new URL("../../studio-data/", import.meta.url);
const { options } = await loadPublishedCatalog(assetBaseUrl);
let mounted: MountedCreator | undefined = mountCharacterCreator(host, options);
try {
  await draw(directCanvas, options, options.recipe);
} catch (error) {
  lifecycleStatus.textContent = `Direct render failed: ${error instanceof Error ? error.message : String(error)}`;
}

document.querySelector("#mount")?.addEventListener("click", () => {
  if (mounted !== undefined) return;
  mounted = mountCharacterCreator(host, options);
  lifecycleStatus.textContent = "Mounted: one editor canvas and one listener set.";
});
document.querySelector("#unmount")?.addEventListener("click", () => {
  mounted?.destroy();
  mounted = undefined;
  lifecycleStatus.textContent = `Unmounted: ${host.childElementCount} host children remain.`;
});
