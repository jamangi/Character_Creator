import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsImport, { type FormatsPlugin } from "ajv-formats";
import assetPackSchema from "./schemas/asset-pack.schema.json" with { type: "json" };
import assetSchema from "./schemas/asset.schema.json" with { type: "json" };
import commonSchema from "./schemas/common.schema.json" with { type: "json" };
import diagnosticSchema from "./schemas/diagnostic.schema.json" with { type: "json" };
import recipeSchema from "./schemas/recipe.schema.json" with { type: "json" };
import rigSchema from "./schemas/rig.schema.json" with { type: "json" };
import { diagnostic, sortDiagnostics } from "./diagnostics.js";
import {
  normalizeAsset,
  normalizeAssetPack,
  normalizeRecipe,
  normalizeRig
} from "./normalize.js";
import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  type AssetManifest,
  type AssetPackManifest,
  type CharacterRecipe,
  type Diagnostic,
  type ParseResult,
  type RigDefinition
} from "./types.js";

export const jsonSchemas = {
  common: commonSchema,
  rig: rigSchema,
  asset: assetSchema,
  assetPack: assetPackSchema,
  recipe: recipeSchema,
  diagnostic: diagnosticSchema
} as const;

function isSafeRelativePath(value: string): boolean {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.includes("%") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return false;
  }
  const segments = value.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== ".."
  );
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
  validateFormats: true
});
const addFormats = addFormatsImport as unknown as FormatsPlugin;
addFormats(ajv);
ajv.addFormat("safe-relative-path", { type: "string", validate: isSafeRelativePath });
for (const schema of Object.values(jsonSchemas)) ajv.addSchema(schema);

const validators = {
  rig: ajv.getSchema(rigSchema.$id) as ValidateFunction<RigDefinition>,
  asset: ajv.getSchema(assetSchema.$id) as ValidateFunction<AssetManifest>,
  assetPack: ajv.getSchema(assetPackSchema.$id) as ValidateFunction<AssetPackManifest>,
  recipe: ajv.getSchema(recipeSchema.$id) as ValidateFunction<CharacterRecipe>,
  diagnostic: ajv.getSchema(diagnosticSchema.$id) as ValidateFunction<Diagnostic>
};

function pointerToJsonPath(pointer: string): string {
  if (pointer === "") return "$";
  return pointer
    .split("/")
    .slice(1)
    .reduce((path, rawSegment) => {
      const segment = rawSegment.replaceAll("~1", "/").replaceAll("~0", "~");
      return /^\d+$/.test(segment)
        ? `${path}[${segment}]`
        : `${path}.${segment.replaceAll(".", "\\.")}`;
    }, "$" as string);
}

function schemaErrorPath(error: ErrorObject): string {
  let path = pointerToJsonPath(error.instancePath);
  if (error.keyword === "required") {
    path += `.${String(error.params["missingProperty"])}`;
  } else if (error.keyword === "additionalProperties") {
    path += `.${String(error.params["additionalProperty"])}`;
  }
  return path;
}

function schemaDiagnostics(errors: ErrorObject[] | null | undefined): Diagnostic[] {
  return sortDiagnostics(
    (errors ?? []).map((error) =>
      diagnostic(
        error.keyword === "format" && error.params["format"] === "safe-relative-path"
          ? "INVALID_SAFE_PATH"
          : "SCHEMA_INVALID",
        schemaErrorPath(error),
        error.message ?? `Failed ${error.keyword} validation`,
        { details: { keyword: error.keyword, params: error.params } }
      )
    )
  );
}

function findUnsafeObjectKey(value: unknown, path = "$", seen = new Set<object>()): Diagnostic[] {
  if (value === null || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const diagnostics: Diagnostic[] = [];
  for (const key of Object.keys(value)) {
    const childPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      diagnostics.push(
        diagnostic("UNSAFE_OBJECT_KEY", childPath, `Object key ${JSON.stringify(key)} is forbidden`)
      );
      continue;
    }
    diagnostics.push(
      ...findUnsafeObjectKey((value as Record<string, unknown>)[key], childPath, seen)
    );
  }
  return diagnostics;
}

function preflight(value: unknown): Diagnostic[] {
  const unsafe = findUnsafeObjectKey(value);
  if (unsafe.length > 0) return sortDiagnostics(unsafe);
  if (
    value !== null &&
    typeof value === "object" &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion !== SCHEMA_VERSION
  ) {
    return [
      diagnostic(
        "UNSUPPORTED_SCHEMA_VERSION",
        "$.schemaVersion",
        `Expected schema version ${SCHEMA_VERSION}`,
        { details: { received: (value as { schemaVersion?: unknown }).schemaVersion } }
      )
    ];
  }
  return [];
}

function runSchema<T>(value: unknown, validator: ValidateFunction<T>): ParseResult<T> {
  const initial = preflight(value);
  if (initial.length > 0) return { ok: false, diagnostics: initial };
  if (!validator(value)) return { ok: false, diagnostics: schemaDiagnostics(validator.errors) };
  return { ok: true, value, diagnostics: [] };
}

function duplicateIdDiagnostics(
  values: readonly { id: string }[],
  path: string
): Diagnostic[] {
  const seen = new Map<string, number>();
  const diagnostics: Diagnostic[] = [];
  values.forEach((value, index) => {
    const previous = seen.get(value.id);
    if (previous !== undefined) {
      diagnostics.push(
        diagnostic(
          "SCHEMA_INVALID",
          `${path}[${index}].id`,
          `Duplicate id ${value.id}; first declared at ${path}[${previous}].id`
        )
      );
    } else {
      seen.set(value.id, index);
    }
  });
  return diagnostics;
}

function rigSemanticDiagnostics(rig: RigDefinition): Diagnostic[] {
  const diagnostics = [
    ...duplicateIdDiagnostics(rig.profiles, "$.profiles"),
    ...duplicateIdDiagnostics(rig.slots, "$.slots"),
    ...duplicateIdDiagnostics(rig.regions, "$.regions"),
    ...duplicateIdDiagnostics(rig.anchors, "$.anchors"),
    ...duplicateIdDiagnostics(rig.expressions, "$.expressions"),
    ...duplicateIdDiagnostics(rig.clips, "$.clips")
  ];
  const slots = new Set(rig.slots.map((slot) => slot.id));
  rig.profiles.forEach((profile, profileIndex) => profile.hiddenSlots?.forEach((slot, slotIndex) => {
    if (!slots.has(slot)) diagnostics.push(diagnostic(
      "UNKNOWN_SLOT",
      `$.profiles[${profileIndex}].hiddenSlots[${slotIndex}]`,
      `Unknown profile-hidden slot ${slot}`
    ));
  }));
  return sortDiagnostics(diagnostics);
}

function compareSemver(left: string, right: string): number {
  const leftParts = (left.split(/[+-]/)[0] ?? "0.0.0").split(".").slice(0, 3).map(Number);
  const rightParts = (right.split(/[+-]/)[0] ?? "0.0.0").split(".").slice(0, 3).map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function satisfiesSemverRange(version: string, range: string): boolean {
  return range.split(/\s+/).every((comparator) => {
    const match = /^(<=|>=|<|>|=|~|\^)?(.+)$/.exec(comparator);
    if (match === null) return false;
    const operator = match[1] ?? "=";
    const target = match[2];
    if (target === undefined) return false;
    const comparison = compareSemver(version, target);
    if (operator === ">=") return comparison >= 0;
    if (operator === "<=") return comparison <= 0;
    if (operator === ">") return comparison > 0;
    if (operator === "<") return comparison < 0;
    if (operator === "=" || operator === "") return comparison === 0;
    const [major, minor] = target.split(".").map(Number);
    const [versionMajor, versionMinor] = version.split(".").map(Number);
    return operator === "^"
      ? versionMajor === major && comparison >= 0
      : versionMajor === major && versionMinor === minor && comparison >= 0;
  });
}

function assetSemanticDiagnostics(asset: AssetManifest, rig: RigDefinition): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const profiles = new Map(rig.profiles.map((profile) => [profile.id, profile]));
  const slots = new Map(rig.slots.map((slot) => [slot.id, slot]));
  const regions = new Set(rig.regions.map((region) => region.id));
  const anchors = new Set(rig.anchors.map((anchor) => anchor.id));
  const expressions = new Set(rig.expressions.map((expression) => expression.id));
  const clips = new Map(rig.clips.map((clip) => [clip.id, clip]));
  const planes = new Set(rig.planes);
  const masks = new Set(rig.masks);

  if (!asset.compatibility.rigFamilies.includes(rig.id)) {
    diagnostics.push(
      diagnostic(
        "INCOMPATIBLE_RIG",
        "$.compatibility.rigFamilies",
        `Asset ${asset.id} does not support rig ${rig.id}`,
        { assetId: asset.id }
      )
    );
  }
  if (!satisfiesSemverRange(ENGINE_VERSION, asset.compatibility.engine)) {
    diagnostics.push(
      diagnostic(
        "INCOMPATIBLE_ENGINE",
        "$.compatibility.engine",
        `Asset ${asset.id} does not support engine ${ENGINE_VERSION}`,
        { assetId: asset.id, details: { range: asset.compatibility.engine } }
      )
    );
  }

  asset.equip.slots.forEach((slotId, index) => {
    const slot = slots.get(slotId);
    if (slot === undefined) {
      diagnostics.push(
        diagnostic("UNKNOWN_SLOT", `$.equip.slots[${index}]`, `Unknown rig slot ${slotId}`, {
          assetId: asset.id
        })
      );
    } else if (!slot.allowedKinds.includes(asset.kind)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_SLOT",
          `$.equip.slots[${index}]`,
          `Slot ${slotId} does not allow asset kind ${asset.kind}`,
          { assetId: asset.id }
        )
      );
    }
  });

  asset.equip.requires.forEach((requirement, index) => {
    if (requirement.startsWith("anchor:")) {
      const anchor = requirement.slice("anchor:".length);
      if (!anchors.has(anchor)) {
        diagnostics.push(
          diagnostic(
            "UNKNOWN_ANCHOR",
            `$.equip.requires[${index}]`,
            `Unknown rig anchor ${anchor}`,
            { assetId: asset.id }
          )
        );
      }
    }
  });

  asset.effects.forEach((effect, effectIndex) => {
    if (effect.kind === "provide-coverage") {
      effect.regions.forEach((region, regionIndex) => {
        if (!regions.has(region)) {
          diagnostics.push(
            diagnostic(
              "UNKNOWN_REGION",
              `$.effects[${effectIndex}].regions[${regionIndex}]`,
              `Unknown rig region ${region}`,
              { assetId: asset.id }
            )
          );
        }
      });
    }
  });

  asset.fragments.forEach((fragment, fragmentIndex) => {
    const path = `$.fragments[${fragmentIndex}]`;
    const profile = profiles.get(fragment.selector.profile);
    if (profile === undefined) {
      diagnostics.push(
        diagnostic("UNKNOWN_PROFILE", `${path}.selector.profile`, "Unknown render profile", {
          assetId: asset.id
        })
      );
    } else if (
      fragment.selector.view !== undefined &&
      fragment.selector.view !== "*" &&
      !profile.views.includes(fragment.selector.view)
    ) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_VIEW",
          `${path}.selector.view`,
          `View ${fragment.selector.view} is not defined for ${profile.id}`,
          { assetId: asset.id }
        )
      );
    }
    if (!planes.has(fragment.plane)) {
      diagnostics.push(
        diagnostic("UNKNOWN_PLANE", `${path}.plane`, `Unknown semantic plane ${fragment.plane}`, {
          assetId: asset.id
        })
      );
    }
    if (fragment.order < rig.localOrder.min || fragment.order > rig.localOrder.max) {
      diagnostics.push(
        diagnostic(
          "SCHEMA_INVALID",
          `${path}.order`,
          `Local order must be within ${rig.localOrder.min}..${rig.localOrder.max}`,
          { assetId: asset.id }
        )
      );
    }
    if (!anchors.has(fragment.anchor)) {
      diagnostics.push(
        diagnostic("UNKNOWN_ANCHOR", `${path}.anchor`, `Unknown rig anchor ${fragment.anchor}`, {
          assetId: asset.id
        })
      );
    }
    fragment.covers.forEach((region, regionIndex) => {
      if (!regions.has(region)) {
        diagnostics.push(
          diagnostic(
            "UNKNOWN_REGION",
            `${path}.covers[${regionIndex}]`,
            `Unknown rig region ${region}`,
            { assetId: asset.id }
          )
        );
      }
    });
    fragment.paletteRoles.forEach((role, roleIndex) => {
      if (!(role in asset.palette.roles)) {
        diagnostics.push(
          diagnostic(
            "SCHEMA_INVALID",
            `${path}.paletteRoles[${roleIndex}]`,
            `Palette role ${role} is not declared by the asset`,
            { assetId: asset.id }
          )
        );
      }
    });
    fragment.contentSlots?.forEach((slot, slotIndex) => {
      if (!slots.has(slot)) diagnostics.push(
        diagnostic(
          "UNKNOWN_SLOT",
          `${path}.contentSlots[${slotIndex}]`,
          `Unknown fragment content slot ${slot}`,
          { assetId: asset.id }
        )
      );
    });
    fragment.occludesWith?.forEach((mask, maskIndex) => {
      if (!masks.has(mask)) {
        diagnostics.push(
          diagnostic(
            "SCHEMA_INVALID",
            `${path}.occludesWith[${maskIndex}]`,
            `Unknown rig mask ${mask}`,
            { assetId: asset.id }
          )
        );
      }
    });
    if (
      fragment.selector.expression !== undefined &&
      fragment.selector.expression !== "*" &&
      !expressions.has(fragment.selector.expression)
    ) {
      diagnostics.push(
        diagnostic(
          "SCHEMA_INVALID",
          `${path}.selector.expression`,
          `Unknown expression ${fragment.selector.expression}`,
          { assetId: asset.id }
        )
      );
    }
    if (fragment.selector.clip !== undefined) {
      const clip = clips.get(fragment.selector.clip);
      if (clip === undefined) {
        diagnostics.push(
          diagnostic("UNKNOWN_CLIP", `${path}.selector.clip`, "Unknown clip", {
            assetId: asset.id
          })
        );
      } else if (
        fragment.selector.frame !== undefined &&
        fragment.selector.frame !== "*" &&
        !clip.frames.some((frame) => frame.id === fragment.selector.frame)
      ) {
        diagnostics.push(
          diagnostic(
            "UNKNOWN_FRAME",
            `${path}.selector.frame`,
            `Unknown frame ${fragment.selector.frame} for clip ${clip.id}`,
            { assetId: asset.id }
          )
        );
      }
    }
  });

  if (asset.fragments.length > rig.budgets.maxFragmentsPerAsset) {
    diagnostics.push(
      diagnostic(
        "SCHEMA_INVALID",
        "$.fragments",
        `Asset exceeds rig fragment budget of ${rig.budgets.maxFragmentsPerAsset}`,
        { assetId: asset.id }
      )
    );
  }
  diagnostics.push(...duplicateIdDiagnostics(asset.fragments, "$.fragments"));
  return sortDiagnostics(diagnostics);
}

export function parseRig(value: unknown): ParseResult<RigDefinition> {
  const parsed = runSchema(value, validators.rig);
  if (!parsed.ok) return parsed;
  const diagnostics = rigSemanticDiagnostics(parsed.value);
  return diagnostics.length > 0
    ? { ok: false, diagnostics }
    : { ok: true, value: normalizeRig(parsed.value), diagnostics: [] };
}

export function parseAssetManifest(
  value: unknown,
  rig?: RigDefinition
): ParseResult<AssetManifest> {
  const parsed = runSchema(value, validators.asset);
  if (!parsed.ok) return parsed;
  const diagnostics = rig === undefined ? [] : assetSemanticDiagnostics(parsed.value, rig);
  return diagnostics.length > 0
    ? { ok: false, diagnostics }
    : { ok: true, value: normalizeAsset(parsed.value), diagnostics: [] };
}

export function parseAssetPack(value: unknown): ParseResult<AssetPackManifest> {
  const parsed = runSchema(value, validators.assetPack);
  if (!parsed.ok) return parsed;
  const ids = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  parsed.value.assets.forEach((asset, index) => {
    if (ids.has(asset.id)) {
      diagnostics.push(
        diagnostic(
          "DUPLICATE_ASSET_ID",
          `$.assets[${index}].id`,
          `Duplicate asset id ${asset.id}`
        )
      );
    }
    ids.add(asset.id);
  });
  return diagnostics.length > 0
    ? { ok: false, diagnostics }
    : { ok: true, value: normalizeAssetPack(parsed.value), diagnostics: [] };
}

export function parseCharacterRecipe(value: unknown): ParseResult<CharacterRecipe> {
  const parsed = runSchema(value, validators.recipe);
  return parsed.ok
    ? { ok: true, value: normalizeRecipe(parsed.value), diagnostics: [] }
    : parsed;
}

export function validateDiagnostic(value: unknown): ParseResult<Diagnostic> {
  return runSchema(value, validators.diagnostic);
}

export function validateAssetCatalog(
  assets: readonly AssetManifest[],
  rig: RigDefinition
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byId = new Map<string, AssetManifest>();
  assets.forEach((asset, index) => {
    if (byId.has(asset.id)) {
      diagnostics.push(
        diagnostic(
          "DUPLICATE_ASSET_ID",
          `$[${index}].id`,
          `Duplicate asset id ${asset.id}`,
          { assetId: asset.id }
        )
      );
    } else {
      byId.set(asset.id, asset);
    }
    diagnostics.push(
      ...assetSemanticDiagnostics(asset, rig).map((item) => ({
        ...item,
        path: `$[${index}]${item.path.slice(1)}`
      }))
    );
  });

  const graph = new Map<string, string[]>();
  for (const asset of assets) {
    graph.set(
      asset.id,
      asset.equip.requires
        .filter((requirement) => requirement.startsWith("asset:"))
        .map((requirement) => requirement.slice("asset:".length))
        .filter((id) => byId.has(id))
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const emitted = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = [...new Set(cycle)].sort().join("|");
      if (!emitted.has(key)) {
        diagnostics.push(
          diagnostic("DEPENDENCY_CYCLE", "$", `Asset dependency cycle: ${cycle.join(" -> ")}`, {
            assetId: id,
            details: { cycle }
          })
        );
        emitted.add(key);
      }
      return;
    }
    visiting.add(id);
    stack.push(id);
    for (const dependency of graph.get(id) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return sortDiagnostics(diagnostics);
}

export function validateRecipeSelection(
  recipe: CharacterRecipe,
  assets: readonly AssetManifest[],
  rig: RigDefinition
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (recipe.rigFamily !== rig.id) {
    diagnostics.push(
      diagnostic(
        "INCOMPATIBLE_RIG",
        "$.rigFamily",
        `Recipe targets ${recipe.rigFamily}, expected ${rig.id}`
      )
    );
  }
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const equipped = recipe.equipped
    .map((selection, index) => ({ selection, index, asset: byId.get(selection.assetId) }))
    .filter(
      (item): item is typeof item & { asset: AssetManifest } => {
        if (item.asset !== undefined) return true;
        diagnostics.push(
          diagnostic(
            "ASSET_NOT_FOUND",
            `$.equipped[${item.index}].assetId`,
            `Unknown asset ${item.selection.assetId}`,
            { assetId: item.selection.assetId }
          )
        );
        return false;
      }
    );
  for (const { selection, index, asset } of equipped) {
    if (selection.version !== undefined && selection.version !== asset.version) {
      diagnostics.push(
        diagnostic(
          "ASSET_NOT_FOUND",
          `$.equipped[${index}].version`,
          `Asset ${asset.id}@${selection.version} is unavailable; catalog has ${asset.version}`,
          { assetId: asset.id, details: { requested: selection.version, available: asset.version } }
        )
      );
    }
  }

  const slotOwners = new Map<string, AssetManifest[]>();
  for (const { asset } of equipped) {
    for (const slot of asset.equip.slots) {
      const owners = slotOwners.get(slot) ?? [];
      owners.push(asset);
      slotOwners.set(slot, owners);
    }
  }
  for (const slot of rig.slots.filter((candidate) => candidate.exclusive)) {
    const owners = slotOwners.get(slot.id) ?? [];
    if (owners.length > 1) {
      diagnostics.push(
        diagnostic(
          "AMBIGUOUS_SLOT",
          "$.equipped",
          `Exclusive slot ${slot.id} has multiple owners: ${owners.map((asset) => asset.id).join(", ")}`,
          { details: { slot: slot.id, assets: owners.map((asset) => asset.id) } }
        )
      );
    }
  }
  return sortDiagnostics(diagnostics);
}
