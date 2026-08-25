import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  diagnostic,
  normalizeRecipe,
  sortDiagnostics,
  validateRecipeSelection,
  type AssetFragment,
  type AssetManifest,
  type CharacterRecipe,
  type Diagnostic,
  type RigDefinition
} from "@character-creator/schema";
import { createCatalog, isAssetCatalog } from "./catalog.js";
import type {
  AssetCatalog,
  RenderProvenance,
  RenderRequest,
  ResolveCharacterInput,
  ResolvedDrawItem,
  ResolvedRenderRequest,
  ResolvedScene
} from "./types.js";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(",")}}`;
}

function fingerprint(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function resolveRequest(
  request: RenderRequest,
  rig: RigDefinition
): { request: ResolvedRenderRequest; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const profile = rig.profiles.find((candidate) => candidate.id === request.profile);
  const fallbackProfile = rig.profiles[0];
  if (profile === undefined) {
    diagnostics.push(
      diagnostic("UNKNOWN_PROFILE", "$.request.profile", `Unknown profile ${request.profile}`)
    );
  }
  const selectedProfile = profile ?? fallbackProfile;
  if (selectedProfile === undefined) throw new Error("A validated rig must define a profile");
  const view = request.view ?? selectedProfile.views[0] ?? "front";
  if (!selectedProfile.views.includes(view)) {
    diagnostics.push(
      diagnostic(
        "UNKNOWN_VIEW",
        "$.request.view",
        `View ${view} is not defined for ${selectedProfile.id}`
      )
    );
  }

  const resolved: ResolvedRenderRequest = {
    profile: request.profile,
    view,
    expression: request.expression ?? "neutral"
  };
  if (request.variant !== undefined) resolved.variant = request.variant;

  if (request.profile === "sprite") {
    const clipId = request.clip ?? "idle";
    const clip = rig.clips.find((candidate) => candidate.id === clipId);
    if (clip === undefined) {
      diagnostics.push(diagnostic("UNKNOWN_CLIP", "$.request.clip", `Unknown clip ${clipId}`));
    }
    const frame = request.frame ?? clip?.frames[0]?.id ?? "center";
    if (clip !== undefined && !clip.frames.some((candidate) => candidate.id === frame)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_FRAME",
          "$.request.frame",
          `Unknown frame ${frame} for clip ${clip.id}`
        )
      );
    }
    resolved.clip = clipId;
    resolved.frame = frame;
  } else if (request.clip !== undefined || request.frame !== undefined) {
    diagnostics.push(
      diagnostic(
        "UNKNOWN_CLIP",
        "$.request.clip",
        `Clip/frame selectors are only valid for sprite requests`
      )
    );
  }
  return { request: resolved, diagnostics };
}

type SelectorAxis = "view" | "expression" | "clip" | "frame" | "variant";

function fallbackDistance(
  axis: SelectorAxis,
  from: string,
  to: string,
  asset: AssetManifest,
  rig: RigDefinition
): number | undefined {
  const fallbacks = [...rig.fallbacks, ...asset.fallbacks].filter(
    (fallback) =>
      fallback.axis === axis &&
      fallback.allowedFor.includes(asset.kind) &&
      !fallback.forbiddenFor.includes(asset.kind)
  );
  const queue: Array<{ value: string; distance: number }> = [{ value: from, distance: 0 }];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || visited.has(current.value)) continue;
    visited.add(current.value);
    if (current.value === to) return current.distance;
    if (current.distance >= 16) continue;
    for (const fallback of fallbacks) {
      if (fallback.from === current.value) {
        queue.push({ value: fallback.to, distance: current.distance + 1 });
      }
    }
  }
  return undefined;
}

function selectorFieldScore(
  axis: SelectorAxis,
  selector: string | undefined,
  requested: string | undefined,
  asset: AssetManifest,
  rig: RigDefinition
): number | undefined {
  if (selector === undefined || selector === "*") return 0;
  if (requested === undefined) return undefined;
  if (selector === requested) return 100;
  const distance = fallbackDistance(axis, requested, selector, asset, rig);
  return distance === undefined ? undefined : 50 - distance;
}

function selectorScore(
  fragment: AssetFragment,
  request: ResolvedRenderRequest,
  asset: AssetManifest,
  rig: RigDefinition
): number | undefined {
  if (fragment.selector.profile !== request.profile) return undefined;
  const scores = [
    selectorFieldScore("view", fragment.selector.view, request.view, asset, rig),
    selectorFieldScore(
      "expression",
      fragment.selector.expression,
      request.expression,
      asset,
      rig
    ),
    selectorFieldScore("clip", fragment.selector.clip, request.clip, asset, rig),
    selectorFieldScore("frame", fragment.selector.frame, request.frame, asset, rig),
    selectorFieldScore("variant", fragment.selector.variant, request.variant, asset, rig)
  ];
  if (scores.some((score) => score === undefined)) return undefined;
  return (scores as number[]).reduce((total, score) => total + score, 0);
}

function fragmentLogicalKey(fragment: AssetFragment): string {
  const tags = [...fragment.tags].sort().join("|");
  return `${fragment.plane}:${tags || fragment.id}`;
}

function selectFragments(
  asset: AssetManifest,
  request: ResolvedRenderRequest,
  rig: RigDefinition
): { fragments: AssetFragment[]; diagnostics: Diagnostic[] } {
  const scores = new Map<AssetFragment, number>();
  for (const fragment of asset.fragments) {
    const score = selectorScore(fragment, request, asset, rig);
    if (score !== undefined) scores.set(fragment, score);
  }
  const matching = [...scores.keys()];
  const groups = new Map<string, AssetFragment[]>();
  for (const fragment of matching) {
    const key = fragmentLogicalKey(fragment);
    const group = groups.get(key) ?? [];
    group.push(fragment);
    groups.set(key, group);
  }

  const selected: AssetFragment[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const group of groups.values()) {
    const ranked = [...group].sort(
      (left, right) =>
        (scores.get(right) ?? 0) - (scores.get(left) ?? 0) ||
        left.id.localeCompare(right.id)
    );
    const first = ranked[0];
    if (first === undefined) continue;
    const bestScore = scores.get(first) ?? 0;
    const tied = ranked.filter((fragment) => (scores.get(fragment) ?? 0) === bestScore);
    if (tied.length > 1) {
      diagnostics.push(
        diagnostic(
          "AMBIGUOUS_FRAGMENT",
          "$",
          `Asset ${asset.id} has equally specific fragments: ${tied
            .map((fragment) => fragment.id)
            .join(", ")}`,
          { assetId: asset.id, details: { fragments: tied.map((fragment) => fragment.id) } }
        )
      );
      continue;
    }
    selected.push(first);
  }
  return { fragments: selected, diagnostics };
}

function validateRequirementsAndConflicts(
  equipped: readonly AssetManifest[],
  rig: RigDefinition
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const equippedIds = new Set(equipped.map((asset) => asset.id));
  const capabilities = new Set<string>(
    rig.anchors.map((anchor) => `anchor:${anchor.id}`)
  );
  for (const asset of equipped) {
    for (const capability of asset.equip.provides) capabilities.add(capability);
  }

  for (const asset of equipped) {
    for (const requirement of asset.equip.requires) {
      const satisfied = requirement.startsWith("asset:")
        ? equippedIds.has(requirement.slice("asset:".length))
        : capabilities.has(requirement);
      if (!satisfied) {
        diagnostics.push(
          diagnostic(
            "MISSING_REQUIREMENT",
            "$.equipped",
            `Asset ${asset.id} requires ${requirement}`,
            { assetId: asset.id, details: { requirement } }
          )
        );
      }
    }
  }

  const emittedConflicts = new Set<string>();
  for (const asset of equipped) {
    for (const conflict of asset.equip.conflicts) {
      const target = conflict.startsWith("asset:")
        ? conflict.slice("asset:".length)
        : conflict;
      const active = conflict.startsWith("asset:")
        ? equippedIds.has(target)
        : capabilities.has(conflict);
      if (!active) continue;
      const key = [asset.id, target].sort().join("|");
      if (emittedConflicts.has(key)) continue;
      emittedConflicts.add(key);
      diagnostics.push(
        diagnostic(
          "ASSET_CONFLICT",
          "$.equipped",
          `Asset ${asset.id} conflicts with ${target}`,
          { assetId: asset.id, details: { conflict } }
        )
      );
    }
  }
  return diagnostics;
}

function buildProvenance(
  recipe: CharacterRecipe,
  rig: RigDefinition,
  request: ResolvedRenderRequest,
  equipped: readonly AssetManifest[]
): RenderProvenance {
  return {
    engineVersion: ENGINE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    rig: { id: rig.id, version: rig.version },
    recipeFingerprint: fingerprint(recipe),
    request,
    assets: [...equipped]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((asset) => ({
        id: asset.id,
        version: asset.version,
        contentHash: asset.provenance.contentHash
      }))
  };
}

function emptyScene(
  rig: RigDefinition,
  request: ResolvedRenderRequest,
  diagnostics: Diagnostic[],
  recipe: CharacterRecipe,
  equipped: readonly AssetManifest[]
): ResolvedScene {
  const profile = rig.profiles.find((candidate) => candidate.id === request.profile) ?? rig.profiles[0];
  if (profile === undefined) throw new Error("A validated rig must define a profile");
  return {
    width: profile.width,
    height: profile.height,
    sampling: profile.sampling,
    request,
    drawList: [],
    diagnostics: sortDiagnostics(diagnostics),
    provenance: buildProvenance(recipe, rig, request, equipped)
  };
}

export function resolveCharacter(input: ResolveCharacterInput): ResolvedScene {
  const recipe = normalizeRecipe(input.recipe);
  let catalog: AssetCatalog;
  const diagnostics: Diagnostic[] = [];
  if (isAssetCatalog(input.catalog)) {
    catalog = input.catalog;
  } else {
    const result = createCatalog(input.catalog);
    catalog = result.catalog;
    diagnostics.push(...result.diagnostics);
  }

  const requestResult = resolveRequest(input.request, input.rig);
  diagnostics.push(...requestResult.diagnostics);
  if (recipe.engineVersion !== ENGINE_VERSION) {
    diagnostics.push(
      diagnostic(
        "INCOMPATIBLE_ENGINE",
        "$.engineVersion",
        `Recipe targets engine ${recipe.engineVersion}; this engine is ${ENGINE_VERSION}`
      )
    );
  }
  diagnostics.push(
    ...validateRecipeSelection(recipe, catalog.orderedAssets, input.rig)
  );

  const equipped = recipe.equipped
    .map((selection) => catalog.assets.get(selection.assetId))
    .filter((asset): asset is AssetManifest => asset !== undefined);
  diagnostics.push(...validateRequirementsAndConflicts(equipped, input.rig));

  if (diagnostics.some((item) => item.severity === "error")) {
    return emptyScene(
      input.rig,
      requestResult.request,
      diagnostics,
      recipe,
      equipped
    );
  }

  const selected: Array<{ asset: AssetManifest; fragment: AssetFragment }> = [];
  for (const asset of equipped) {
    const selection = selectFragments(asset, requestResult.request, input.rig);
    diagnostics.push(...selection.diagnostics);
    for (const fragment of selection.fragments) selected.push({ asset, fragment });
  }

  const knownTags = new Set(
    equipped.flatMap((asset) => asset.fragments.flatMap((fragment) => fragment.tags))
  );
  const suppressedTags = new Set<string>();
  for (const asset of equipped) {
    for (const effect of asset.effects) {
      if (effect.kind !== "suppress-tags") continue;
      for (const tag of effect.targetTags) {
        if (!knownTags.has(tag)) {
          diagnostics.push(
            diagnostic(
              "INVALID_SUPPRESSION",
              "$.equipped",
              `Asset ${asset.id} suppresses unknown fragment tag ${tag}`,
              { assetId: asset.id, details: { tag } }
            )
          );
        }
        suppressedTags.add(tag);
      }
    }
  }
  for (const { fragment } of selected) {
    for (const tag of fragment.suppresses) suppressedTags.add(tag);
  }

  const visible = selected.filter(
    ({ fragment }) => !fragment.tags.some((tag) => suppressedTags.has(tag))
  );
  const profile = input.rig.profiles.find(
    (candidate) => candidate.id === requestResult.request.profile
  );
  if (profile === undefined) {
    return emptyScene(
      input.rig,
      requestResult.request,
      diagnostics,
      recipe,
      equipped
    );
  }
  const coverage = new Set(visible.flatMap(({ fragment }) => fragment.covers));
  const missing = profile.requiredCoverage.filter((region) => !coverage.has(region));
  for (const region of missing) {
    diagnostics.push(
      diagnostic(
        "MISSING_COVERAGE",
        "$.equipped",
        `Required coverage ${region} is missing for ${profile.id}/${requestResult.request.view}`,
        { details: { region, request: requestResult.request } }
      )
    );
  }

  const planeIndex = new Map(input.rig.planes.map((plane, index) => [plane, index]));
  const anchors = new Map(input.rig.anchors.map((anchor) => [anchor.id, anchor]));
  const drawList: ResolvedDrawItem[] = visible
    .map(({ asset, fragment }) => {
      const anchor = anchors.get(fragment.anchor);
      if (anchor === undefined) {
        diagnostics.push(
          diagnostic(
            "UNKNOWN_ANCHOR",
            "$",
            `Unknown anchor ${fragment.anchor} during resolution`,
            { assetId: asset.id }
          )
        );
      }
      const palette = Object.fromEntries(
        fragment.paletteRoles.map((role) => [
          role,
          recipe.palette[role] ?? asset.palette.roles[role]?.default ?? "#00000000"
        ])
      );
      return {
        assetId: asset.id,
        assetVersion: asset.version,
        fragmentId: fragment.id,
        source: fragment.source,
        plane: fragment.plane,
        planeIndex: planeIndex.get(fragment.plane) ?? Number.MAX_SAFE_INTEGER,
        order: fragment.order,
        anchor: { x: anchor?.x ?? 0, y: anchor?.y ?? 0 },
        offset: fragment.offset ?? [0, 0],
        pivot: fragment.pivot,
        palette,
        tags: [...fragment.tags],
        covers: [...fragment.covers],
        selector: fragment.selector
      } satisfies ResolvedDrawItem;
    })
    .sort(
      (left, right) =>
        left.planeIndex - right.planeIndex ||
        left.order - right.order ||
        left.assetId.localeCompare(right.assetId) ||
        left.fragmentId.localeCompare(right.fragmentId)
    );

  return {
    width: profile.width,
    height: profile.height,
    sampling: profile.sampling,
    request: requestResult.request,
    drawList,
    diagnostics: sortDiagnostics(diagnostics),
    provenance: buildProvenance(recipe, input.rig, requestResult.request, equipped)
  };
}
