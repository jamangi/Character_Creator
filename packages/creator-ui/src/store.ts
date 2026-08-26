import {
  createCatalog,
  exportCharacterRecipe,
  importCharacterRecipe,
  resolveCharacter,
  type AssetCatalog,
  type RenderRequest
} from "@character-creator/core";
import {
  diagnostic,
  normalizeRecipe,
  type AssetManifest,
  type CharacterRecipe,
  type Diagnostic,
  type RigDefinition
} from "@character-creator/schema";
import type {
  BodyProfileOption,
  CatalogQuery,
  CreatorActionResult,
  CreatorSnapshot,
  CreatorStoreOptions
} from "./types.js";

type Listener = (snapshot: CreatorSnapshot) => void;

function cloneRecipe(recipe: CharacterRecipe): CharacterRecipe {
  return structuredClone(recipe);
}

function cloneRequest(request: RenderRequest): RenderRequest {
  return structuredClone(request);
}

export class CreatorStore {
  readonly rig: RigDefinition;
  readonly catalog: AssetCatalog;
  readonly bodyProfiles: readonly BodyProfileOption[];
  #recipe: CharacterRecipe;
  #preview: RenderRequest;
  #history: CharacterRecipe[] = [];
  #future: CharacterRecipe[] = [];
  #diagnostics: Diagnostic[] = [];
  #listeners = new Set<Listener>();

  constructor(options: CreatorStoreOptions) {
    this.rig = options.rig;
    this.catalog = Array.isArray(options.catalog)
      ? createCatalog(options.catalog).catalog
      : options.catalog as AssetCatalog;
    this.bodyProfiles = options.bodyProfiles ?? [];
    this.#recipe = normalizeRecipe(cloneRecipe(options.recipe));
    this.#preview = options.preview ?? { profile: "portrait", view: "front", expression: "neutral" };
  }

  get snapshot(): CreatorSnapshot {
    return {
      recipe: cloneRecipe(this.#recipe),
      preview: cloneRequest(this.#preview),
      canUndo: this.#history.length > 0,
      canRedo: this.#future.length > 0,
      diagnostics: structuredClone(this.#diagnostics)
    };
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  #emit(): void {
    const snapshot = this.snapshot;
    for (const listener of this.#listeners) listener(snapshot);
  }

  #validate(recipe: CharacterRecipe): Diagnostic[] {
    return resolveCharacter({
      recipe,
      rig: this.rig,
      catalog: this.catalog,
      request: { profile: "portrait", view: "front", expression: "neutral" }
    }).diagnostics;
  }

  #commit(recipe: CharacterRecipe, diagnostics: Diagnostic[] = []): CreatorActionResult {
    const errors = this.#validate(recipe);
    if (errors.some((item) => item.severity === "error")) {
      this.#diagnostics = errors;
      this.#emit();
      return { ok: false, snapshot: this.snapshot, diagnostics: errors };
    }
    this.#history.push(cloneRecipe(this.#recipe));
    if (this.#history.length > 100) this.#history.shift();
    this.#future = [];
    this.#recipe = normalizeRecipe(cloneRecipe(recipe));
    this.#diagnostics = diagnostics;
    this.#emit();
    return { ok: true, snapshot: this.snapshot, diagnostics };
  }

  queryCatalog(query: CatalogQuery = {}): AssetManifest[] {
    const search = query.search?.trim().toLocaleLowerCase() ?? "";
    const selected = new Set(this.#recipe.equipped.map((item) => item.assetId));
    return this.catalog.orderedAssets.filter((asset) => {
      if (query.kinds !== undefined && !query.kinds.includes(asset.kind)) return false;
      if (query.tags !== undefined && !query.tags.every((tag) => asset.display.tags.includes(tag))) return false;
      if (search !== "" && ![asset.display.name, asset.id, ...asset.display.tags].some((value) => value.toLocaleLowerCase().includes(search))) return false;
      if (!query.compatibleOnly || selected.has(asset.id)) return true;
      const result = this.#candidateWith(asset, this.#recipe);
      return !this.#validate(result).some((item) => item.severity === "error");
    });
  }

  #candidateWith(asset: AssetManifest, recipe: CharacterRecipe): CharacterRecipe {
    const slots = new Set(asset.equip.slots);
    const equipped = recipe.equipped.filter((selection) => {
      const current = this.catalog.assets.get(selection.assetId);
      return current === undefined || !current.equip.slots.some((slot) => slots.has(slot) && this.rig.slots.find((candidate) => candidate.id === slot)?.exclusive);
    });
    equipped.push({ assetId: asset.id, version: asset.version });
    return normalizeRecipe({ ...recipe, equipped });
  }

  equip(assetId: string): CreatorActionResult {
    const asset = this.catalog.assets.get(assetId);
    if (asset === undefined) {
      const diagnostics = [diagnostic("ASSET_NOT_FOUND", "$.equipped", `Unknown asset ${assetId}`, { assetId })];
      this.#diagnostics = diagnostics;
      this.#emit();
      return { ok: false, snapshot: this.snapshot, diagnostics };
    }
    return this.#commit(this.#candidateWith(asset, this.#recipe));
  }

  unequip(assetId: string): CreatorActionResult {
    return this.#commit({ ...this.#recipe, equipped: this.#recipe.equipped.filter((selection) => selection.assetId !== assetId) });
  }

  setPalette(role: string, value: string): CreatorActionResult {
    return this.#commit({ ...this.#recipe, palette: { ...this.#recipe.palette, [role]: value } });
  }

  selectBodyProfile(id: string): CreatorActionResult {
    const profile = this.bodyProfiles.find((candidate) => candidate.id === id);
    if (profile === undefined) {
      const diagnostics = [diagnostic("ASSET_NOT_FOUND", "$.bodyProfile", `Unknown body profile ${id}`)];
      return { ok: false, snapshot: this.snapshot, diagnostics };
    }
    return this.#commit(profile.recipe);
  }

  setPreview(preview: RenderRequest): CreatorSnapshot {
    this.#preview = cloneRequest(preview);
    this.#emit();
    return this.snapshot;
  }

  undo(): CreatorActionResult {
    const previous = this.#history.pop();
    if (previous === undefined) return { ok: false, snapshot: this.snapshot, diagnostics: [] };
    this.#future.push(cloneRecipe(this.#recipe));
    this.#recipe = previous;
    this.#diagnostics = [];
    this.#emit();
    return { ok: true, snapshot: this.snapshot, diagnostics: [] };
  }

  redo(): CreatorActionResult {
    const next = this.#future.pop();
    if (next === undefined) return { ok: false, snapshot: this.snapshot, diagnostics: [] };
    this.#history.push(cloneRecipe(this.#recipe));
    this.#recipe = next;
    this.#diagnostics = [];
    this.#emit();
    return { ok: true, snapshot: this.snapshot, diagnostics: [] };
  }

  reset(recipe: CharacterRecipe): CreatorActionResult {
    return this.#commit(recipe);
  }

  randomize(seed: number): CreatorActionResult {
    let state = seed >>> 0;
    const next = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    };
    let recipe = normalizeRecipe({ ...this.#recipe, seed: seed >>> 0 });
    for (const slot of this.rig.slots) {
      const candidates = this.catalog.orderedAssets.filter((asset) => asset.equip.slots.includes(slot.id));
      if (candidates.length === 0) continue;
      const offset = next() % candidates.length;
      for (let index = 0; index < candidates.length; index += 1) {
        const asset = candidates[(offset + index) % candidates.length];
        if (asset === undefined) continue;
        const candidate = this.#candidateWith(asset, recipe);
        if (!this.#validate(candidate).some((item) => item.severity === "error")) {
          recipe = candidate;
          break;
        }
      }
    }
    const result = this.#commit(recipe);
    if (result.ok) return result;
    return { ok: false, snapshot: this.snapshot, diagnostics: result.diagnostics };
  }

  exportJson(): string {
    const exported = exportCharacterRecipe(this.#recipe);
    if (!exported.ok) throw new Error(exported.diagnostics.map((item) => item.message).join("; "));
    return exported.value;
  }

  importJson(sourceText: string): CreatorActionResult {
    const imported = importCharacterRecipe(sourceText, { catalog: this.catalog, rig: this.rig });
    if (!imported.ok) {
      this.#diagnostics = imported.diagnostics;
      this.#emit();
      return { ok: false, snapshot: this.snapshot, diagnostics: imported.diagnostics };
    }
    return this.#commit(imported.value.recipe, imported.diagnostics);
  }
}
