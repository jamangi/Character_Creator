import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import type { FileInspection } from "./types.js";

export async function inspectPng(path: string): Promise<FileInspection> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return { exists: false };
  }
  const base = {
    exists: true,
    byteLength: bytes.byteLength,
    sha256: `sha256-${createHash("sha256").update(bytes).digest("hex")}`
  };
  try {
    const png = PNG.sync.read(bytes);
    let hasAlpha = false;
    for (let index = 3; index < png.data.length; index += 4) {
      if (png.data[index] !== 255) { hasAlpha = true; break; }
    }
    return { ...base, width: png.width, height: png.height, hasAlpha };
  } catch (error) {
    return { ...base, decodeError: error instanceof Error ? error.message : String(error) };
  }
}
