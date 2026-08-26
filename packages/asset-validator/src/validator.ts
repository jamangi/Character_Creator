import {
  ENGINE_VERSION,
  diagnostic,
  validateAssetCatalog,
  type AssetFragment,
  type Diagnostic
} from "@character-creator/schema";
import { resolveCharacter } from "@character-creator/core";
import type {
  FileInspection,
  ValidatePackInput,
  ValidationFinding,
  ValidationLevel,
  ValidationLevelSummary,
  ValidationReport
} from "./types.js";

const levels: ValidationLevel[] = [
  "schema",
  "files",
  "compatibility",
  "coverage",
  "geometry",
  "visual",
  "distribution"
];

function add(
  findings: ValidationFinding[],
  level: ValidationLevel,
  item: Diagnostic
): void {
  findings.push({ level, diagnostic: item });
}

function inspectFile(
  findings: ValidationFinding[],
  path: string,
  inspection: FileInspection | undefined,
  maxBytes: number,
  fragment?: AssetFragment,
  assetId?: string
): void {
  const assetOptions = assetId === undefined ? {} : { assetId };
  if (inspection === undefined || !inspection.exists) {
    add(findings, "files", diagnostic("FILE_MISSING", path, `Required file is missing: ${path}`, assetOptions));
    return;
  }
  if (inspection.decodeError !== undefined) {
    add(findings, "files", diagnostic("FILE_DECODE_FAILED", path, `PNG could not be decoded: ${inspection.decodeError}`, assetOptions));
    return;
  }
  if ((inspection.byteLength ?? 0) > maxBytes) {
    add(findings, "files", diagnostic("BUDGET_EXCEEDED", path, `File exceeds the ${maxBytes}-byte asset budget`, {
      ...assetOptions,
      details: { bytes: inspection.byteLength, limit: maxBytes }
    }));
  }
  if (fragment?.bounds !== undefined &&
      (inspection.width !== fragment.bounds.width || inspection.height !== fragment.bounds.height)) {
    add(findings, "files", diagnostic(
      "IMAGE_DIMENSION_MISMATCH",
      path,
      `PNG dimensions ${inspection.width ?? "?"}×${inspection.height ?? "?"} do not match declared bounds ${fragment.bounds.width}×${fragment.bounds.height}`,
      assetOptions
    ));
  }
  if (inspection.hasAlpha === false) {
    add(findings, "files", diagnostic("IMAGE_ALPHA_MISSING", path, "Drawable PNG has no transparent pixels", assetOptions));
  }
}

function geometryCheck(
  findings: ValidationFinding[],
  input: ValidatePackInput,
  fragment: AssetFragment,
  assetId: string
): void {
  if (fragment.bounds === undefined) return;
  const profile = input.rig.profiles.find((candidate) => candidate.id === fragment.selector.profile);
  const anchor = input.rig.anchors.find((candidate) => candidate.id === fragment.anchor);
  if (profile === undefined || anchor === undefined) return;
  const [offsetX, offsetY] = fragment.offset ?? [0, 0];
  const x = anchor.x + offsetX - fragment.pivot[0] * fragment.bounds.width;
  const y = anchor.y + offsetY - fragment.pivot[1] * fragment.bounds.height;
  if (x < 0 || y < 0 || x + fragment.bounds.width > profile.width || y + fragment.bounds.height > profile.height) {
    add(findings, "geometry", diagnostic(
      "GEOMETRY_OUT_OF_BOUNDS",
      `$.assets.${assetId}.fragments.${fragment.id}.bounds`,
      `Fragment extends outside ${profile.id} canvas`,
      { assetId, details: { x, y, bounds: fragment.bounds, canvas: { width: profile.width, height: profile.height } } }
    ));
  }
}

function summarize(findings: ValidationFinding[]): ValidationLevelSummary[] {
  return levels.map((level) => {
    const subset = findings.filter((finding) => finding.level === level);
    const errors = subset.filter((finding) => finding.diagnostic.severity === "error").length;
    const warnings = subset.filter((finding) => finding.diagnostic.severity === "warning").length;
    const reviewRequired = subset.filter((finding) => finding.diagnostic.severity === "review-required").length;
    return {
      level,
      errors,
      warnings,
      reviewRequired,
      status: errors > 0 ? "fail" : reviewRequired > 0 ? "review" : "pass"
    };
  });
}

export function validatePack(input: ValidatePackInput): ValidationReport {
  const findings: ValidationFinding[] = [];
  for (const item of input.schemaDiagnostics ?? []) add(findings, "schema", item);

  const packAssets = new Map(input.pack.assets.map((entry) => [entry.id, entry]));
  for (const asset of input.assets) {
    inspectFile(findings, asset.display.thumbnail, input.files.get(asset.display.thumbnail), input.rig.budgets.maxAssetBytes, undefined, asset.id);
    for (const fragment of asset.fragments) {
      inspectFile(findings, fragment.source, input.files.get(fragment.source), input.rig.budgets.maxAssetBytes, fragment, asset.id);
      geometryCheck(findings, input, fragment, asset.id);
    }
    const packEntry = packAssets.get(asset.id);
    if (packEntry !== undefined && packEntry.contentHash !== asset.provenance.contentHash) {
      add(findings, "files", diagnostic(
        "CONTENT_HASH_MISMATCH",
        `$.assets.${asset.id}.contentHash`,
        "Pack and asset content hashes disagree",
        { assetId: asset.id, details: { pack: packEntry.contentHash, asset: asset.provenance.contentHash } }
      ));
    }
    if (asset.provenance.authors.length === 0 || asset.provenance.license.trim() === "") {
      add(findings, "distribution", diagnostic(
        "DISTRIBUTION_METADATA_MISSING",
        `$.assets.${asset.id}.provenance`,
        "Asset needs an author and a license",
        { assetId: asset.id }
      ));
    }
  }

  for (const item of validateAssetCatalog(input.assets, input.rig)) add(findings, "compatibility", item);

  for (const clip of input.rig.clips) {
    for (const frame of clip.frames) {
      for (const contact of frame.contacts) {
        if (!input.rig.anchors.some((anchor) => anchor.id === contact)) {
          add(findings, "geometry", diagnostic(
            "GROUND_CONTACT_INVALID",
            `$.clips.${clip.id}.frames.${frame.id}.contacts`,
            `Ground contact ${contact} is not a rig anchor`,
            { details: { clip: clip.id, frame: frame.id, contact } }
          ));
        }
      }
    }
  }

  for (const renderCase of input.renderCases ?? []) {
    for (const request of renderCase.requests) {
      const scene = resolveCharacter({ recipe: renderCase.recipe, rig: input.rig, catalog: input.assets, request });
      for (const item of scene.diagnostics) add(findings, "coverage", item);
      if (request.profile === "sprite" && request.view === input.rig.mirroring.to) {
        const equippedIds = new Set(renderCase.recipe.equipped.map((selection) => selection.assetId));
        const unsafeAsset = input.assets.find((asset) =>
          equippedIds.has(asset.id) &&
          !asset.fragments.some((fragment) =>
            fragment.selector.profile === "sprite" && fragment.selector.view === input.rig.mirroring.to
          ) &&
          asset.fragments.some((fragment) =>
            fragment.selector.profile === "sprite" && fragment.mirrorSafe === false
          )
        );
        const unsafeFragment = unsafeAsset?.fragments.find((fragment) =>
          fragment.selector.profile === "sprite" && fragment.mirrorSafe === false
        );
        if (unsafeAsset !== undefined && unsafeFragment !== undefined) {
          add(findings, "compatibility", diagnostic(
            "MIRRORING_UNSAFE",
            `$.renderCases.${renderCase.id}`,
            `Right-facing request cannot mirror asymmetric fragment ${unsafeAsset.id}/${unsafeFragment.id}`,
            { assetId: unsafeAsset.id }
          ));
        }
      }
    }
  }

  if (!input.noVisual) {
    add(findings, "visual", diagnostic(
      "VISUAL_REVIEW_REQUIRED",
      "$",
      "Automated checks passed to the visual-review boundary; inspect labeled contact sheets",
      { severity: "review-required" }
    ));
  }

  const ordered = findings.sort((left, right) =>
    levels.indexOf(left.level) - levels.indexOf(right.level) ||
    left.diagnostic.path.localeCompare(right.diagnostic.path) ||
    left.diagnostic.code.localeCompare(right.diagnostic.code) ||
    left.diagnostic.message.localeCompare(right.diagnostic.message)
  );
  const summaries = summarize(ordered);
  const allDiagnostics = ordered.map((finding) => finding.diagnostic);
  return {
    reportVersion: "0.1.0",
    engineVersion: ENGINE_VERSION,
    pack: { id: input.pack.id, version: input.pack.version },
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    summary: {
      errors: allDiagnostics.filter((item) => item.severity === "error").length,
      warnings: allDiagnostics.filter((item) => item.severity === "warning").length,
      reviewRequired: allDiagnostics.filter((item) => item.severity === "review-required").length
    },
    levels: summaries,
    findings: ordered
  };
}
