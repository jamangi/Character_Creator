import { diagnostic, sortDiagnostics } from "@character-creator/schema";
import type { ResolvedScene } from "@character-creator/core";
import type { CanvasRendererOptions, CanvasRenderResult } from "./types.js";

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
  for (const item of scene.drawList) {
    try {
      let image = cache.get(item.source);
      if (image === undefined) {
        image = await options.loadImage(item.source);
        cache.set(item.source, image);
      }
      const x = item.anchor.x + item.offset[0] - item.pivot[0] * image.width;
      const y = item.anchor.y + item.offset[1] - item.pivot[1] * image.height;
      context.save();
      context.translate(x, y);
      context.drawImage(image, 0, 0);
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

