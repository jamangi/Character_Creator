import type {
  AssetManifest,
  AssetPackManifest,
  CharacterRecipe,
  RigDefinition
} from "./types.js";

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sortedRecord<T>(record: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
  );
}

export function normalizeRecipe(recipe: CharacterRecipe): CharacterRecipe {
  const normalized: CharacterRecipe = {
    ...recipe,
    equipped: [...recipe.equipped].sort((left, right) =>
      left.assetId.localeCompare(right.assetId) ||
      (left.version ?? "").localeCompare(right.version ?? "") ||
      (left.variant ?? "").localeCompare(right.variant ?? "")
    ),
    palette: sortedRecord(recipe.palette),
    parameters: sortedRecord(recipe.parameters)
  };
  if (recipe.metadata !== undefined) normalized.metadata = sortedRecord(recipe.metadata);
  if (recipe.extensions !== undefined) normalized.extensions = sortedRecord(recipe.extensions);
  return normalized;
}

export function normalizeRig(rig: RigDefinition): RigDefinition {
  return {
    ...rig,
    profiles: [...rig.profiles].sort((a, b) => a.id.localeCompare(b.id)),
    planes: [...rig.planes],
    slots: [...rig.slots].sort((a, b) => a.id.localeCompare(b.id)),
    regions: [...rig.regions].sort((a, b) => a.id.localeCompare(b.id)),
    anchors: [...rig.anchors].sort((a, b) => a.id.localeCompare(b.id)),
    expressions: [...rig.expressions].sort((a, b) => a.id.localeCompare(b.id)),
    clips: [...rig.clips].sort((a, b) => a.id.localeCompare(b.id)),
    fallbacks: [...rig.fallbacks].sort((a, b) =>
      a.axis.localeCompare(b.axis) || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
    ),
    masks: sortedUnique(rig.masks)
  };
}

export function normalizeAsset(asset: AssetManifest): AssetManifest {
  return {
    ...asset,
    display: { ...asset.display, tags: sortedUnique(asset.display.tags) },
    compatibility: {
      ...asset.compatibility,
      rigFamilies: sortedUnique(asset.compatibility.rigFamilies),
      fitTags: sortedUnique(asset.compatibility.fitTags)
    },
    equip: {
      ...asset.equip,
      slots: sortedUnique(asset.equip.slots),
      requires: sortedUnique(asset.equip.requires),
      conflicts: sortedUnique(asset.equip.conflicts),
      provides: sortedUnique(asset.equip.provides)
    },
    palette: { roles: sortedRecord(asset.palette.roles) },
    fragments: [...asset.fragments].sort((a, b) => a.id.localeCompare(b.id)),
    fallbacks: [...asset.fallbacks].sort((a, b) =>
      a.axis.localeCompare(b.axis) || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
    )
  };
}

export function normalizeAssetPack(pack: AssetPackManifest): AssetPackManifest {
  return {
    ...pack,
    rigFamilies: sortedUnique(pack.rigFamilies),
    assets: [...pack.assets].sort((a, b) => a.id.localeCompare(b.id))
  };
}

