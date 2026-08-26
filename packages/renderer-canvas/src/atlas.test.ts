import { describe, expect, it } from "vitest";
import { packAtlas } from "./atlas.js";

describe("deterministic atlas packing", () => {
  it("packs independently of input order with stable coordinates", () => {
    const frames = [
      { key: "walk.front.2", width: 96, height: 96, value: 2 },
      { key: "idle.front.0", width: 96, height: 96, value: 0 },
      { key: "walk.front.1", width: 96, height: 96, value: 1 }
    ];
    expect(packAtlas(frames, { maxWidth: 200 })).toEqual(packAtlas([...frames].reverse(), { maxWidth: 200 }));
  });

  it("reports frames wider than the configured atlas", () => {
    const result = packAtlas([{ key: "too-wide", width: 300, height: 96, value: null }], { maxWidth: 256 });
    expect(result.frames).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe("ATLAS_PACK_FAILED");
  });
});
