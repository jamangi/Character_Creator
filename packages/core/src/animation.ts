import {
  diagnostic,
  sortDiagnostics,
  type AssetManifest,
  type CharacterRecipe,
  type ClipId,
  type Diagnostic,
  type Direction,
  type RigDefinition
} from "@character-creator/schema";
import { createCatalog, isAssetCatalog } from "./catalog.js";
import { resolveCharacter } from "./resolver.js";
import type { AssetCatalog, ResolvedScene } from "./types.js";

export interface ResolvedAnimationFrame {
  direction: Direction;
  sourceDirection: Direction;
  clip: ClipId;
  frame: string;
  durationMs: number;
  contacts: string[];
  mirrored: boolean;
  groundLine: number;
  scene: ResolvedScene;
}

export interface ResolvedAnimation {
  clip: ClipId;
  loop: boolean;
  frames: ResolvedAnimationFrame[];
  diagnostics: Diagnostic[];
}

export interface ResolveAnimationInput {
  recipe: CharacterRecipe;
  catalog: AssetCatalog | readonly AssetManifest[];
  rig: RigDefinition;
  clip: ClipId;
  directions?: readonly Direction[];
}

const criticalKinds = new Set<AssetManifest["kind"]>(["base-body", "body-module", "shoes"]);

function hasMotionFragment(
  asset: AssetManifest,
  direction: Direction,
  clip: ClipId,
  frame: string,
  rig: RigDefinition
): boolean {
  const criticalRegions = new Set(rig.regions.filter((region) => region.anatomyCritical).map((region) => region.id));
  const promised = new Set(asset.fragments.filter((fragment) => fragment.selector.profile === "sprite").flatMap((fragment) => fragment.covers).filter((region) => criticalRegions.has(region)));
  const available = new Set(asset.fragments.filter((fragment) =>
    fragment.selector.profile === "sprite" &&
    fragment.selector.view === direction &&
    fragment.selector.clip === clip &&
    fragment.selector.frame === frame
  ).flatMap((fragment) => fragment.covers));
  return promised.size > 0 && [...promised].every((region) => available.has(region));
}

function mirrorSafe(asset: AssetManifest, clip: ClipId, frame: string): boolean {
  return asset.equip.provides.includes("mirror.safe") &&
    asset.fragments.filter((fragment) =>
      fragment.selector.profile === "sprite" &&
      fragment.selector.view === "left" &&
      fragment.selector.clip === clip &&
      fragment.selector.frame === frame
    ).every((fragment) => fragment.mirrorSafe !== false);
}

export function resolveAnimation(input: ResolveAnimationInput): ResolvedAnimation {
  const catalog = isAssetCatalog(input.catalog) ? input.catalog : createCatalog(input.catalog).catalog;
  const clip = input.rig.clips.find((candidate) => candidate.id === input.clip);
  if (clip === undefined) {
    return {
      clip: input.clip,
      loop: false,
      frames: [],
      diagnostics: [diagnostic("UNKNOWN_CLIP", "$.clip", `Unknown clip ${input.clip}`)]
    };
  }
  const selectedAssets = input.recipe.equipped
    .map((selection) => catalog.assets.get(selection.assetId))
    .filter((asset): asset is AssetManifest => asset !== undefined);
  const critical = selectedAssets.filter((asset) => criticalKinds.has(asset.kind));
  const directions = input.directions ?? clip.directions;
  const frames: ResolvedAnimationFrame[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const direction of directions) {
    for (const frame of clip.frames) {
      const missing = critical.filter((asset) => !hasMotionFragment(asset, direction, clip.id, frame.id, input.rig));
      let sourceDirection = direction;
      let mirrored = false;
      if (missing.length > 0 && direction === input.rig.mirroring.to) {
        const canMirror = critical.every((asset) =>
          hasMotionFragment(asset, input.rig.mirroring.from, clip.id, frame.id, input.rig) && mirrorSafe(asset, clip.id, frame.id)
        ) && selectedAssets.every((asset) => mirrorSafe(asset, clip.id, frame.id));
        if (canMirror) {
          sourceDirection = input.rig.mirroring.from;
          mirrored = true;
        } else {
          diagnostics.push(diagnostic(
            "MIRRORING_UNSAFE",
            `$.animation.${clip.id}.${direction}.${frame.id}`,
            `Missing explicit ${direction} art cannot be mirrored safely`,
            { details: { assets: missing.map((asset) => asset.id) } }
          ));
        }
      } else if (missing.length > 0) {
        diagnostics.push(diagnostic(
          "MISSING_MOTION_ARTWORK",
          `$.animation.${clip.id}.${direction}.${frame.id}`,
          `Anatomy-critical motion art is missing for ${missing.map((asset) => asset.id).join(", ")}`,
          { details: { assets: missing.map((asset) => asset.id), direction, clip: clip.id, frame: frame.id } }
        ));
      }
      const scene = resolveCharacter({
        recipe: input.recipe,
        rig: input.rig,
        catalog,
        request: { profile: "sprite", view: sourceDirection, clip: clip.id, frame: frame.id }
      });
      diagnostics.push(...scene.diagnostics);
      frames.push({
        direction,
        sourceDirection,
        clip: clip.id,
        frame: frame.id,
        durationMs: frame.durationMs,
        contacts: [...frame.contacts],
        mirrored,
        groundLine: scene.height - 8,
        scene
      });
    }
  }
  return { clip: clip.id, loop: clip.loop, frames, diagnostics: sortDiagnostics(diagnostics) };
}

export interface FootContactSample {
  id: string;
  groundLine: number;
  contacts: Array<{ anchor: string; y: number }>;
}

export function validateFootContactSamples(
  samples: readonly FootContactSample[],
  tolerance = 1
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const sample of samples) {
    for (const contact of sample.contacts) {
      const drift = Math.abs(contact.y - sample.groundLine);
      if (drift > tolerance) diagnostics.push(diagnostic(
        "FOOT_CONTACT_DRIFT",
        `$.frames.${sample.id}.contacts.${contact.anchor}`,
        `Foot contact drifts ${drift}px from the ground line (tolerance ${tolerance}px)`,
        { details: { drift, tolerance, groundLine: sample.groundLine, y: contact.y } }
      ));
    }
  }
  return sortDiagnostics(diagnostics);
}
