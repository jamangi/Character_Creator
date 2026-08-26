import {
  SCHEMA_VERSION,
  diagnostic,
  normalizeRecipe,
  parseCharacterRecipe,
  sortDiagnostics,
  validateRecipeSelection,
  type AssetManifest,
  type CharacterRecipe,
  type Diagnostic,
  type ParseResult,
  type RigDefinition
} from "@character-creator/schema";
import { createCatalog, isAssetCatalog } from "./catalog.js";
import type { AssetCatalog } from "./types.js";

export interface RecipeLimits {
  maxBytes: number;
  maxDepth: number;
  maxObjectKeys: number;
  maxArrayItems: number;
}

export const DEFAULT_RECIPE_LIMITS: RecipeLimits = {
  maxBytes: 128 * 1024,
  maxDepth: 32,
  maxObjectKeys: 2_048,
  maxArrayItems: 512
};

export interface RecipeMigration {
  from: string;
  to: string;
  migrate(value: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

export interface RecipeMigrationStep {
  from: string;
  to: string;
}

export interface RecipeAlias {
  from: string;
  to: string;
}

export type RecipeImportMode = "strict" | "best-effort-preview";

export interface RecipeImportOptions {
  mode?: RecipeImportMode;
  limits?: Partial<RecipeLimits>;
  migrations?: readonly RecipeMigration[];
  aliases?: Readonly<Record<string, string>>;
  catalog?: AssetCatalog | readonly AssetManifest[];
  rig?: RigDefinition;
}

export interface ImportedRecipe {
  sourceText: string;
  recipe: CharacterRecipe;
  previewRecipe: CharacterRecipe;
  canonicalJson: string;
  migrations: RecipeMigrationStep[];
  aliases: RecipeAlias[];
}

export type RecipeImportResult =
  | { ok: true; value: ImportedRecipe; diagnostics: Diagnostic[] }
  | { ok: false; sourceText: string; diagnostics: Diagnostic[] };

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalStringify(child)}`)
    .join(",")}}`;
}

export function exportCharacterRecipe(recipe: CharacterRecipe): ParseResult<string> {
  const parsed = parseCharacterRecipe(recipe);
  return parsed.ok
    ? { ok: true, value: `${canonicalStringify(parsed.value)}\n`, diagnostics: [] }
    : parsed;
}

interface StructureState {
  keys: number;
  items: number;
  diagnostics: Diagnostic[];
}

function inspectStructure(
  value: unknown,
  limits: RecipeLimits,
  state: StructureState,
  path = "$",
  depth = 0
): void {
  if (state.diagnostics.length > 0) return;
  if (depth > limits.maxDepth) {
    state.diagnostics.push(
      diagnostic(
        "RECIPE_LIMIT_EXCEEDED",
        path,
        `Recipe nesting exceeds the maximum depth of ${limits.maxDepth}`,
        { details: { limit: limits.maxDepth } }
      )
    );
    return;
  }
  if (typeof value === "string") {
    if (
      /^(?:data:image\/|javascript:|file:|https?:\/\/)/i.test(value) ||
      /^[A-Za-z]:[\\/]/.test(value) ||
      value.includes("\\") ||
      /(?:^|\/)\.\.(?:\/|$)/.test(value)
    ) {
      state.diagnostics.push(
        diagnostic(
          "UNSAFE_RECIPE_VALUE",
          path,
          "Recipes may not embed images, executable URLs, external URLs, or machine-specific paths"
        )
      );
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    state.items += value.length;
    if (state.items > limits.maxArrayItems) {
      state.diagnostics.push(
        diagnostic(
          "RECIPE_LIMIT_EXCEEDED",
          path,
          `Recipe arrays exceed the combined item limit of ${limits.maxArrayItems}`,
          { details: { limit: limits.maxArrayItems } }
        )
      );
      return;
    }
    value.forEach((child, index) => inspectStructure(child, limits, state, `${path}[${index}]`, depth + 1));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    state.keys += 1;
    const childPath = `${path}.${key}`;
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      state.diagnostics.push(
        diagnostic("UNSAFE_OBJECT_KEY", childPath, `Object key ${JSON.stringify(key)} is forbidden`)
      );
      return;
    }
    if (state.keys > limits.maxObjectKeys) {
      state.diagnostics.push(
        diagnostic(
          "RECIPE_LIMIT_EXCEEDED",
          path,
          `Recipe objects exceed the combined key limit of ${limits.maxObjectKeys}`,
          { details: { limit: limits.maxObjectKeys } }
        )
      );
      return;
    }
    inspectStructure(child, limits, state, childPath, depth + 1);
  }
}

export function parseRecipeJson(
  sourceText: string,
  customLimits: Partial<RecipeLimits> = {}
): ParseResult<unknown> {
  const limits = { ...DEFAULT_RECIPE_LIMITS, ...customLimits };
  const bytes = new TextEncoder().encode(sourceText).byteLength;
  if (bytes > limits.maxBytes) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          "RECIPE_LIMIT_EXCEEDED",
          "$",
          `Recipe is ${bytes} bytes; the limit is ${limits.maxBytes}`,
          { details: { bytes, limit: limits.maxBytes } }
        )
      ]
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(sourceText) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("INVALID_JSON", "$", "Recipe is not valid JSON", {
          details: { cause: error instanceof Error ? error.message : String(error) }
        })
      ]
    };
  }
  const state: StructureState = { keys: 0, items: 0, diagnostics: [] };
  inspectStructure(value, limits, state);
  return state.diagnostics.length > 0
    ? { ok: false, diagnostics: sortDiagnostics(state.diagnostics) }
    : { ok: true, value, diagnostics: [] };
}

const migration001To010: RecipeMigration = {
  from: "0.0.1",
  to: SCHEMA_VERSION,
  migrate(value) {
    const legacyAssets = Array.isArray(value["assets"]) ? value["assets"] : [];
    return {
      schemaVersion: SCHEMA_VERSION,
      engineVersion: value["engineVersion"] ?? "0.1.0",
      rigFamily: value["rig"] ?? value["rigFamily"],
      equipped: legacyAssets.map((asset) =>
        typeof asset === "string" ? { assetId: asset } : asset
      ),
      palette: value["palette"] ?? {},
      parameters: value["parameters"] ?? {},
      seed: value["seed"] ?? 0,
      ...(value["metadata"] === undefined ? {} : { metadata: value["metadata"] })
    };
  }
};

export const defaultRecipeMigrations: readonly RecipeMigration[] = [migration001To010];

function migrateRecipe(
  input: unknown,
  migrations: readonly RecipeMigration[]
):
  | { ok: true; value: unknown; steps: RecipeMigrationStep[] }
  | { ok: false; diagnostics: Diagnostic[] } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: true, value: input, steps: [] };
  }
  let value = structuredClone(input as Record<string, unknown>);
  const steps: RecipeMigrationStep[] = [];
  for (let count = 0; count < 16; count += 1) {
    const version = value["schemaVersion"];
    if (version === SCHEMA_VERSION) return { ok: true, value, steps };
    if (typeof version !== "string") return { ok: true, value, steps };
    const migration = migrations.find((candidate) => candidate.from === version);
    if (migration === undefined) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            "MIGRATION_FAILED",
            "$.schemaVersion",
            `No migration path from recipe schema ${version} to ${SCHEMA_VERSION}`,
            { details: { received: version, expected: SCHEMA_VERSION } }
          )
        ]
      };
    }
    try {
      value = migration.migrate(value);
      steps.push({ from: migration.from, to: migration.to });
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          diagnostic("MIGRATION_FAILED", "$.schemaVersion", `Migration ${migration.from} → ${migration.to} failed`, {
            details: { cause: error instanceof Error ? error.message : String(error) }
          })
        ]
      };
    }
  }
  return {
    ok: false,
    diagnostics: [diagnostic("MIGRATION_FAILED", "$.schemaVersion", "Recipe migration exceeded 16 steps")]
  };
}

function applyAliases(
  recipe: CharacterRecipe,
  aliases: Readonly<Record<string, string>>
): { recipe: CharacterRecipe; applied: RecipeAlias[]; diagnostics: Diagnostic[] } {
  const applied: RecipeAlias[] = [];
  const diagnostics: Diagnostic[] = [];
  const equipped = recipe.equipped.map((selection, index) => {
    const replacement = aliases[selection.assetId];
    if (replacement === undefined || replacement === selection.assetId) return selection;
    applied.push({ from: selection.assetId, to: replacement });
    diagnostics.push(
      diagnostic(
        "ASSET_ALIAS_APPLIED",
        `$.equipped[${index}].assetId`,
        `Deprecated asset ${selection.assetId} was migrated to ${replacement}`,
        { severity: "warning", assetId: replacement, details: { from: selection.assetId, to: replacement } }
      )
    );
    return { ...selection, assetId: replacement };
  });
  return { recipe: normalizeRecipe({ ...recipe, equipped }), applied, diagnostics };
}

function selectionDiagnostics(
  recipe: CharacterRecipe,
  catalog: AssetCatalog | readonly AssetManifest[] | undefined,
  rig: RigDefinition | undefined
): { diagnostics: Diagnostic[]; assets: readonly AssetManifest[] } {
  if (catalog === undefined || rig === undefined) return { diagnostics: [], assets: [] };
  const resolvedCatalog = isAssetCatalog(catalog) ? catalog : createCatalog(catalog).catalog;
  return {
    diagnostics: validateRecipeSelection(recipe, resolvedCatalog.orderedAssets, rig),
    assets: resolvedCatalog.orderedAssets
  };
}

function previewRecipeFor(
  recipe: CharacterRecipe,
  assets: readonly AssetManifest[],
  diagnostics: Diagnostic[]
): CharacterRecipe {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const equipped = recipe.equipped.filter((selection) => {
    const asset = byId.get(selection.assetId);
    const usable = asset !== undefined && (selection.version === undefined || selection.version === asset.version);
    if (!usable) {
      diagnostics.push(
        diagnostic(
          "BEST_EFFORT_SUBSTITUTION",
          "$.equipped",
          `Best-effort preview omitted unavailable selection ${selection.assetId}`,
          { severity: "warning", assetId: selection.assetId }
        )
      );
    }
    return usable;
  });
  return normalizeRecipe({ ...recipe, equipped });
}

export function importCharacterRecipe(
  sourceText: string,
  options: RecipeImportOptions = {}
): RecipeImportResult {
  const decoded = parseRecipeJson(sourceText, options.limits);
  if (!decoded.ok) return { ok: false, sourceText, diagnostics: decoded.diagnostics };
  const migrated = migrateRecipe(decoded.value, options.migrations ?? defaultRecipeMigrations);
  if (!migrated.ok) return { ok: false, sourceText, diagnostics: migrated.diagnostics };
  const parsed = parseCharacterRecipe(migrated.value);
  if (!parsed.ok) return { ok: false, sourceText, diagnostics: parsed.diagnostics };
  const aliased = applyAliases(parsed.value, options.aliases ?? {});
  const selection = selectionDiagnostics(aliased.recipe, options.catalog, options.rig);
  const diagnostics = sortDiagnostics([...aliased.diagnostics, ...selection.diagnostics]);
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0 && (options.mode ?? "strict") === "strict") {
    return { ok: false, sourceText, diagnostics };
  }
  const previewDiagnostics = [...diagnostics];
  const previewRecipe = errors.length > 0
    ? previewRecipeFor(aliased.recipe, selection.assets, previewDiagnostics)
    : aliased.recipe;
  return {
    ok: true,
    value: {
      sourceText,
      recipe: aliased.recipe,
      previewRecipe,
      canonicalJson: `${canonicalStringify(aliased.recipe)}\n`,
      migrations: migrated.steps,
      aliases: aliased.applied
    },
    diagnostics: sortDiagnostics(previewDiagnostics)
  };
}
