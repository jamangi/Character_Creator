import type {
  AssetFragment,
  AssetManifest,
  CharacterRecipe,
  Diagnostic,
  RenderProfileId,
  RigDefinition
} from "@character-creator/schema";

export interface RenderRequest {
  profile: RenderProfileId;
  view?: string;
  expression?: string;
  clip?: "idle" | "sit" | "walk" | "run";
  frame?: string;
  variant?: string;
}

export interface ResolvedRenderRequest {
  profile: RenderProfileId;
  view: string;
  expression: string;
  clip?: "idle" | "sit" | "walk" | "run";
  frame?: string;
  variant?: string;
}

export interface AssetCatalog {
  assets: ReadonlyMap<string, AssetManifest>;
  orderedAssets: readonly AssetManifest[];
}

export interface ResolvedDrawItem {
  assetId: string;
  assetVersion: string;
  fragmentId: string;
  source: string;
  plane: string;
  planeIndex: number;
  order: number;
  anchor: { x: number; y: number };
  offset: [number, number];
  pivot: [number, number];
  palette: Array<{
    role: string;
    source: string;
    value: string;
    mode: "multiply" | "screen" | "replace";
  }>;
  contentSlots: string[];
  motionGroup?: string;
  tags: string[];
  covers: string[];
  selector: AssetFragment["selector"];
}

export interface RenderProvenance {
  engineVersion: string;
  schemaVersion: string;
  rig: { id: string; version: string };
  recipeFingerprint: string;
  request: ResolvedRenderRequest;
  assets: Array<{ id: string; version: string; contentHash: string }>;
}

export interface ResolvedScene {
  width: number;
  height: number;
  sampling: "nearest" | "smooth";
  request: ResolvedRenderRequest;
  drawList: ResolvedDrawItem[];
  diagnostics: Diagnostic[];
  provenance: RenderProvenance;
}

export interface ResolveCharacterInput {
  recipe: CharacterRecipe;
  catalog: AssetCatalog | readonly AssetManifest[];
  rig: RigDefinition;
  request: RenderRequest;
}
