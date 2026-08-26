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
  const sourcePalette = recipe.palette;
  const palette = { ...sourcePalette };
  const inherit = (role: string, value: string | undefined): void => {
    if (value !== undefined && sourcePalette[role] === undefined) palette[role] = value;
  };

  // Schema 0.1 recipes used three broad color roles. Retain those keys for a
  // source-preserving round trip while projecting them into the stable,
  // independently addressable role vocabulary introduced by Tasks 019/020.
  inherit("garment.top", sourcePalette["garment.primary"]);
  inherit("garment.outfit", sourcePalette["garment.primary"]);
  inherit("garment.bottom", sourcePalette["garment.secondary"]);
  inherit("garment.outerwear", sourcePalette["garment.secondary"]);
  inherit("garment.shoes", sourcePalette["crystal.base"] ?? sourcePalette["garment.secondary"]);
  for (const role of ["accessory.hat", "accessory.face", "accessory.ear", "accessory.neck", "accessory.handheld", "accessory.back", "accessory.waist", "accessory.charm"]) {
    inherit(role, sourcePalette["accent.base"]);
  }
  const legacyArm = sourcePalette["crystal.base"] ?? sourcePalette["accent.base"] ?? sourcePalette["skin.base"];
  inherit("body.arm.left", legacyArm);
  inherit("body.arm.right", legacyArm);

  const normalized: CharacterRecipe = {
    ...recipe,
    equipped: [...recipe.equipped].sort((left, right) =>
      left.assetId.localeCompare(right.assetId) ||
      (left.version ?? "").localeCompare(right.version ?? "") ||
      (left.variant ?? "").localeCompare(right.variant ?? "")
    ),
    palette: sortedRecord(palette),
    parameters: sortedRecord(recipe.parameters)
  };
  if (recipe.metadata !== undefined) normalized.metadata = sortedRecord(recipe.metadata);
  if (recipe.extensions !== undefined) normalized.extensions = sortedRecord(recipe.extensions);
  return normalized;
}

export function normalizeRig(rig: RigDefinition): RigDefinition {
  return {
    ...rig,
    profiles: rig.profiles.map((profile) => ({
      ...profile,
      ...(profile.hiddenSlots === undefined ? {} : { hiddenSlots: sortedUnique(profile.hiddenSlots) })
    })).sort((a, b) => a.id.localeCompare(b.id)),
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
    fragments: asset.fragments.map((fragment) => ({
      ...fragment,
      ...(fragment.contentSlots === undefined ? {} : { contentSlots: sortedUnique(fragment.contentSlots) })
    })).sort((a, b) => a.id.localeCompare(b.id)),
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
