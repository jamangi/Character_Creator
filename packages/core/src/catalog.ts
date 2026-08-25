import {
  diagnostic,
  sortDiagnostics,
  type AssetManifest,
  type Diagnostic
} from "@character-creator/schema";
import type { AssetCatalog } from "./types.js";

export interface CatalogResult {
  catalog: AssetCatalog;
  diagnostics: Diagnostic[];
}

export function createCatalog(assets: readonly AssetManifest[]): CatalogResult {
  const orderedAssets = [...assets].sort((left, right) =>
    left.id.localeCompare(right.id) || left.version.localeCompare(right.version)
  );
  const indexed = new Map<string, AssetManifest>();
  const diagnostics: Diagnostic[] = [];
  for (const asset of orderedAssets) {
    if (indexed.has(asset.id)) {
      diagnostics.push(
        diagnostic("DUPLICATE_ASSET_ID", "$", `Duplicate catalog asset ${asset.id}`, {
          assetId: asset.id
        })
      );
      continue;
    }
    indexed.set(asset.id, asset);
  }
  return {
    catalog: { assets: indexed, orderedAssets: [...indexed.values()] },
    diagnostics: sortDiagnostics(diagnostics)
  };
}

export function isAssetCatalog(value: AssetCatalog | readonly AssetManifest[]): value is AssetCatalog {
  return !Array.isArray(value);
}

