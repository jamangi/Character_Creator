import { diagnostic, sortDiagnostics } from "@character-creator/schema";
import type { ResolvedScene } from "@character-creator/core";
import type { CanvasRendererOptions, CanvasRenderResult } from "./types.js";

type PaletteBinding = ResolvedScene["drawList"][number]["palette"][number];

function channels(color: string): [number, number, number] {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16)
  ];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function applyPaletteMode(
  source: [number, number, number],
  authored: [number, number, number],
  target: [number, number, number],
  mode: PaletteBinding["mode"]
): [number, number, number] {
  if (mode === "replace") return target;
  if (mode === "multiply") return source.map((value, index) => {
    const base = authored[index] ?? 0;
    const next = target[index] ?? 0;
    return clamp(base === 0 ? next : value * next / base);
  }) as [number, number, number];
  return source.map((value, index) => {
    const base = authored[index] ?? 255;
    const next = target[index] ?? 255;
    return clamp(base === 255 ? next : 255 - (255 - value) * (255 - next) / (255 - base));
  }) as [number, number, number];
}

function recolor(
  image: Awaited<ReturnType<CanvasRendererOptions["loadImage"]>>,
  bindings: readonly PaletteBinding[],
  options: CanvasRendererOptions
) {
  const canvas = options.createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Palette canvas did not provide a 2D rendering context");
  context.clearRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height);
  const prepared = bindings.map((binding) => ({
    ...binding,
    sourceChannels: channels(binding.source),
    valueChannels: channels(binding.value)
  }));
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    if ((pixels.data[offset + 3] ?? 0) === 0) continue;
    for (const binding of prepared) {
      if (pixels.data[offset] !== binding.sourceChannels[0] ||
          pixels.data[offset + 1] !== binding.sourceChannels[1] ||
          pixels.data[offset + 2] !== binding.sourceChannels[2]) continue;
      const next = applyPaletteMode(
        [pixels.data[offset] ?? 0, pixels.data[offset + 1] ?? 0, pixels.data[offset + 2] ?? 0],
        binding.sourceChannels,
        binding.valueChannels,
        binding.mode
      );
      pixels.data[offset] = next[0];
      pixels.data[offset + 1] = next[1];
      pixels.data[offset + 2] = next[2];
      break;
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export async function renderResolvedScene(
  scene: ResolvedScene,
  options: CanvasRendererOptions
): Promise<CanvasRenderResult> {
  const diagnostics = [...scene.diagnostics];
  options.canvas.width = scene.width;
  options.canvas.height = scene.height;
  const context = options.canvas.getContext("2d");
  if (context === null) {
    diagnostics.push(
      diagnostic("RENDER_FAILED", "$", "Canvas did not provide a 2D rendering context")
    );
    return { canvas: options.canvas, scene, diagnostics: sortDiagnostics(diagnostics) };
  }

  context.clearRect(0, 0, scene.width, scene.height);
  context.imageSmoothingEnabled = scene.sampling === "smooth";
  if (diagnostics.some((item) => item.severity === "error")) {
    return { canvas: options.canvas, scene, diagnostics: sortDiagnostics(diagnostics) };
  }

  const cache = new Map<string, Awaited<ReturnType<CanvasRendererOptions["loadImage"]>>>();
  const paletteCache = new Map<string, ReturnType<CanvasRendererOptions["createCanvas"]>>();
  for (const item of scene.drawList) {
    try {
      let image = cache.get(item.source);
      if (image === undefined) {
        image = await options.loadImage(item.source);
        cache.set(item.source, image);
      }
      const paletteKey = `${item.source}|${JSON.stringify(item.palette)}`;
      let drawable = paletteCache.get(paletteKey);
      if (drawable === undefined) {
        drawable = recolor(image, item.palette, options);
        paletteCache.set(paletteKey, drawable);
      }
      const x = item.anchor.x + item.offset[0] - item.pivot[0] * drawable.width;
      const y = item.anchor.y + item.offset[1] - item.pivot[1] * drawable.height;
      context.save();
      context.translate(x, y);
      context.drawImage(drawable, 0, 0);
      context.restore();
    } catch (error) {
      diagnostics.push(
        diagnostic(
          "RENDER_FAILED",
          "$",
          `Failed to render ${item.assetId}/${item.fragmentId}`,
          {
            assetId: item.assetId,
            details: {
              source: item.source,
              cause: error instanceof Error ? error.message : String(error)
            }
          }
        )
      );
    }
  }

  return { canvas: options.canvas, scene, diagnostics: sortDiagnostics(diagnostics) };
}
