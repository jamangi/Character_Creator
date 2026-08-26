import { diagnostic, type Diagnostic } from "@character-creator/schema";

export interface AtlasFrameInput<T = unknown> {
  key: string;
  width: number;
  height: number;
  value: T;
}

export interface PackedAtlasFrame<T = unknown> extends AtlasFrameInput<T> {
  x: number;
  y: number;
}

export interface PackedAtlas<T = unknown> {
  width: number;
  height: number;
  padding: number;
  frames: PackedAtlasFrame<T>[];
  diagnostics: Diagnostic[];
}

export interface AtlasPackingOptions {
  maxWidth?: number;
  padding?: number;
}

export function packAtlas<T>(
  sourceFrames: readonly AtlasFrameInput<T>[],
  options: AtlasPackingOptions = {}
): PackedAtlas<T> {
  const maxWidth = options.maxWidth ?? 1024;
  const padding = options.padding ?? 1;
  const frames = [...sourceFrames].sort((left, right) => left.key.localeCompare(right.key));
  const diagnostics: Diagnostic[] = [];
  const packed: PackedAtlasFrame<T>[] = [];
  let x = padding;
  let y = padding;
  let rowHeight = 0;
  let usedWidth = 0;
  for (const frame of frames) {
    if (frame.width + padding * 2 > maxWidth || frame.width <= 0 || frame.height <= 0) {
      diagnostics.push(diagnostic(
        "ATLAS_PACK_FAILED",
        `$.frames.${frame.key}`,
        `Frame ${frame.key} cannot fit the ${maxWidth}px atlas width`,
        { details: { width: frame.width, height: frame.height, maxWidth } }
      ));
      continue;
    }
    if (x + frame.width + padding > maxWidth) {
      x = padding;
      y += rowHeight + padding;
      rowHeight = 0;
    }
    packed.push({ ...frame, x, y });
    x += frame.width + padding;
    rowHeight = Math.max(rowHeight, frame.height);
    usedWidth = Math.max(usedWidth, x);
  }
  return {
    width: Math.max(1, Math.min(maxWidth, usedWidth + padding)),
    height: Math.max(1, y + rowHeight + padding),
    padding,
    frames: packed,
    diagnostics
  };
}
