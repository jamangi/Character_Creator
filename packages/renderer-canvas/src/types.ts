import type { Diagnostic } from "@character-creator/schema";
import type { ResolvedScene } from "@character-creator/core";

export interface CanvasImageLike {
  readonly width: number;
  readonly height: number;
}

export interface CanvasImageDataLike {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface Canvas2DContextLike {
  imageSmoothingEnabled: boolean;
  clearRect(x: number, y: number, width: number, height: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  drawImage(image: CanvasImageLike, dx: number, dy: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): CanvasImageDataLike;
  putImageData(imageData: CanvasImageDataLike, dx: number, dy: number): void;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: "2d"): Canvas2DContextLike | null;
}

export interface CanvasRendererOptions {
  canvas: CanvasLike;
  createCanvas(width: number, height: number): CanvasLike;
  loadImage(source: string): Promise<CanvasImageLike>;
}

export interface CanvasRenderResult {
  canvas: CanvasLike;
  scene: ResolvedScene;
  diagnostics: Diagnostic[];
}
