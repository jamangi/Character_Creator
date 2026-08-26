export const SCHEMA_VERSION = "0.1.0" as const;
export const ENGINE_VERSION = "0.1.0" as const;

export type SchemaVersion = typeof SCHEMA_VERSION;
export type RenderProfileId = "portrait" | "full-body" | "sprite";
export type Direction = "front" | "back" | "left" | "right";
export type ClipId = "idle" | "sit" | "walk" | "run";
export type SamplingMode = "nearest" | "smooth";
export type AssetKind =
  | "base-body"
  | "body-module"
  | "body-profile"
  | "hair"
  | "face"
  | "top"
  | "bottom"
  | "outerwear"
  | "shoes"
  | "accessory"
  | "outfit";

export type DiagnosticSeverity = "error" | "warning" | "review-required";

export type DiagnosticCode =
  | "SCHEMA_INVALID"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "UNSAFE_OBJECT_KEY"
  | "INVALID_SAFE_PATH"
  | "DUPLICATE_ASSET_ID"
  | "INCOMPATIBLE_RIG"
  | "INCOMPATIBLE_ENGINE"
  | "UNKNOWN_PROFILE"
  | "UNKNOWN_VIEW"
  | "UNKNOWN_CLIP"
  | "UNKNOWN_FRAME"
  | "UNKNOWN_PLANE"
  | "UNKNOWN_SLOT"
  | "UNKNOWN_REGION"
  | "UNKNOWN_ANCHOR"
  | "DEPENDENCY_CYCLE"
  | "MISSING_REQUIREMENT"
  | "ASSET_CONFLICT"
  | "AMBIGUOUS_SLOT"
  | "AMBIGUOUS_FRAGMENT"
  | "MISSING_COVERAGE"
  | "INVALID_SUPPRESSION"
  | "ASSET_NOT_FOUND"
  | "INVALID_JSON"
  | "RECIPE_LIMIT_EXCEEDED"
  | "MIGRATION_FAILED"
  | "ASSET_ALIAS_APPLIED"
  | "UNSAFE_RECIPE_VALUE"
  | "BEST_EFFORT_SUBSTITUTION"
  | "FILE_MISSING"
  | "FILE_DECODE_FAILED"
  | "IMAGE_DIMENSION_MISMATCH"
  | "IMAGE_ALPHA_MISSING"
  | "CONTENT_HASH_MISMATCH"
  | "BUDGET_EXCEEDED"
  | "GEOMETRY_OUT_OF_BOUNDS"
  | "GROUND_CONTACT_INVALID"
  | "MIRRORING_UNSAFE"
  | "DISTRIBUTION_METADATA_MISSING"
  | "VISUAL_REVIEW_REQUIRED"
  | "MISSING_MOTION_ARTWORK"
  | "MOTION_FALLBACK_UNSAFE"
  | "FOOT_CONTACT_DRIFT"
  | "ATLAS_PACK_FAILED"
  | "RENDER_FAILED";

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  path: string;
  message: string;
  assetId?: string;
  details?: Record<string, unknown>;
}

export interface ParseSuccess<T> {
  ok: true;
  value: T;
  diagnostics: Diagnostic[];
}

export interface ParseFailure {
  ok: false;
  diagnostics: Diagnostic[];
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface RigProfile {
  id: RenderProfileId;
  width: number;
  height: number;
  views: string[];
  requiredCoverage: string[];
  safeArea: Rect;
  sampling: SamplingMode;
  hiddenSlots?: string[];
}

export interface RigAnchor extends Point {
  id: string;
  profiles: RenderProfileId[];
}

export interface RigRegion {
  id: string;
  anatomyCritical: boolean;
}

export interface RigSlot {
  id: string;
  exclusive: boolean;
  allowedKinds: AssetKind[];
}

export interface RigExpression {
  id: string;
  channels: Record<string, string>;
}

export interface RigFrame {
  id: string;
  durationMs: number;
  contacts: string[];
}

export interface RigClip {
  id: ClipId;
  loop: boolean;
  directions: Direction[];
  frames: RigFrame[];
}

export interface RigFallback {
  axis: "expression" | "view" | "clip" | "frame" | "variant";
  from: string;
  to: string;
  allowedFor: AssetKind[];
  forbiddenFor: AssetKind[];
}

export interface RigDefinition {
  schemaVersion: SchemaVersion;
  id: string;
  version: string;
  coordinateSystem: {
    origin: "top-left";
    units: "pixels";
    yAxis: "down";
  };
  profiles: RigProfile[];
  planes: string[];
  localOrder: { min: number; max: number };
  slots: RigSlot[];
  regions: RigRegion[];
  anchors: RigAnchor[];
  expressions: RigExpression[];
  clips: RigClip[];
  fallbacks: RigFallback[];
  masks: string[];
  mirroring: {
    from: "left";
    to: "right";
    requiresCapability: string;
  };
  budgets: {
    maxFragmentsPerAsset: number;
    maxCanvasArea: number;
    maxAssetBytes: number;
  };
  extensions?: Record<string, unknown>;
}

export interface FragmentSelector {
  profile: RenderProfileId;
  view?: string;
  expression?: string;
  clip?: ClipId;
  frame?: string;
  variant?: string;
}

export interface AssetFragment {
  id: string;
  selector: FragmentSelector;
  source: string;
  plane: string;
  order: number;
  anchor: string;
  offset?: [number, number];
  pivot: [number, number];
  paletteRoles: string[];
  contentSlots?: string[];
  motionGroup?: string;
  covers: string[];
  suppresses: string[];
  occludesWith?: string[];
  tags: string[];
  optional?: boolean;
  mirrorSafe?: boolean;
  bounds?: Rect;
  extensions?: Record<string, unknown>;
}

export type AssetEffect =
  | { kind: "suppress-tags"; targetTags: string[] }
  | { kind: "provide-coverage"; regions: string[] }
  | { kind: "select-variant"; assetId: string; variant: string };

export interface AssetManifest {
  schemaVersion: SchemaVersion;
  id: string;
  version: string;
  kind: AssetKind;
  display: {
    name: string;
    tags: string[];
    thumbnail: string;
  };
  compatibility: {
    rigFamilies: string[];
    engine: string;
    fitTags: string[];
  };
  equip: {
    slots: string[];
    exclusiveGroup?: string;
    requires: string[];
    conflicts: string[];
    provides: string[];
  };
  palette: {
    roles: Record<
      string,
      { default: string; mode: "multiply" | "screen" | "replace" }
    >;
  };
  effects: AssetEffect[];
  fragments: AssetFragment[];
  fallbacks: RigFallback[];
  provenance: {
    authors: string[];
    license: string;
    source: string | null;
    contentHash: string;
  };
  extensions?: Record<string, unknown>;
}

export interface AssetPackManifest {
  schemaVersion: SchemaVersion;
  id: string;
  version: string;
  engine: string;
  rigFamilies: string[];
  assets: Array<{ id: string; manifest: string; contentHash: string }>;
  provenance: {
    authors: string[];
    license: string;
    source: string | null;
  };
  extensions?: Record<string, unknown>;
}

export interface EquippedAsset {
  assetId: string;
  version?: string;
  variant?: string;
}

export interface CharacterRecipe {
  schemaVersion: SchemaVersion;
  engineVersion: string;
  rigFamily: string;
  equipped: EquippedAsset[];
  palette: Record<string, string>;
  parameters: Record<string, number | string | boolean>;
  seed: number;
  metadata?: Record<string, string>;
  extensions?: Record<string, unknown>;
}
