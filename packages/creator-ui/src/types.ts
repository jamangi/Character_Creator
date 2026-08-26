import type {
  AssetManifest,
  CharacterRecipe,
  Diagnostic,
  RigDefinition
} from "@character-creator/schema";
import type { AssetCatalog, RenderRequest } from "@character-creator/core";

export interface BodyProfileOption {
  id: string;
  name: string;
  recipe: CharacterRecipe;
}

export interface CreatorStoreOptions {
  recipe: CharacterRecipe;
  rig: RigDefinition;
  catalog: AssetCatalog | readonly AssetManifest[];
  bodyProfiles?: readonly BodyProfileOption[];
  preview?: RenderRequest;
}

export interface CreatorSnapshot {
  recipe: CharacterRecipe;
  preview: RenderRequest;
  canUndo: boolean;
  canRedo: boolean;
  diagnostics: Diagnostic[];
}

export interface CatalogQuery {
  search?: string;
  kinds?: readonly AssetManifest["kind"][];
  tags?: readonly string[];
  compatibleOnly?: boolean;
}

export type CreatorActionResult =
  | { ok: true; snapshot: CreatorSnapshot; diagnostics: Diagnostic[] }
  | { ok: false; snapshot: CreatorSnapshot; diagnostics: Diagnostic[] };
