import type {
  AssetManifest,
  AssetPackManifest,
  CharacterRecipe,
  Diagnostic,
  RigDefinition
} from "@character-creator/schema";
import type { RenderRequest } from "@character-creator/core";

export type ValidationLevel =
  | "schema"
  | "files"
  | "compatibility"
  | "coverage"
  | "geometry"
  | "visual"
  | "distribution";

export interface FileInspection {
  exists: boolean;
  byteLength?: number;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  sha256?: string;
  decodeError?: string;
}

export interface ValidationFinding {
  level: ValidationLevel;
  diagnostic: Diagnostic;
}

export interface ValidationLevelSummary {
  level: ValidationLevel;
  errors: number;
  warnings: number;
  reviewRequired: number;
  status: "pass" | "fail" | "review";
}

export interface ValidationReport {
  reportVersion: "0.1.0";
  engineVersion: string;
  pack: { id: string; version: string };
  generatedAt: string;
  summary: { errors: number; warnings: number; reviewRequired: number };
  levels: ValidationLevelSummary[];
  findings: ValidationFinding[];
}

export interface ValidationRenderCase {
  id: string;
  recipe: CharacterRecipe;
  requests: RenderRequest[];
}

export interface ValidatePackInput {
  rig: RigDefinition;
  pack: AssetPackManifest;
  assets: readonly AssetManifest[];
  files: ReadonlyMap<string, FileInspection>;
  renderCases?: readonly ValidationRenderCase[];
  schemaDiagnostics?: readonly Diagnostic[];
  noVisual?: boolean;
  generatedAt?: string;
}
