import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile as writeFileOnce } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  parseAssetManifest,
  parseAssetPack,
  parseCharacterRecipe,
  parseRig,
  type AssetEffect,
  type AssetFragment,
  type AssetKind,
  type AssetManifest,
  type CharacterRecipe,
  type Direction,
  type FragmentSelector,
  type RenderProfileId,
  type RigDefinition
} from "../packages/schema/dist/index.js";

const repository = process.cwd();
const packRoot = join(repository, "packages/starter-pack");
const studioRoot = join(repository, "site/studio-data");
const version = "1.0.0";
const author = "Character Creator contributors";
const license = "CC0-1.0";
const expressions = ["neutral", "smirk", "concerned", "focused", "cheerful", "annoyed", "thoughtful", "surprised", "tired", "confident", "determined", "playful"] as const;

async function writeFile(path: string, data: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await writeFileOnce(path, data, encoding);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "UNKNOWN" || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

interface AssetDefinition {
  key: string;
  name: string;
  kind: AssetKind;
  slots: string[];
  tags: string[];
  color: string;
  paletteRole: string;
  plane: string;
  fitTags?: string[];
  requires?: string[];
  conflicts?: string[];
  provides?: string[];
  effects?: AssetEffect[];
  multiPlane?: "hair" | "coat";
  faceChannel?: "head" | "nose" | "eyes" | "brows" | "mouth" | "marking" | "ears";
  mirrorSafe?: boolean;
  shape?: "standard" | "petite" | "broad" | "narrow" | "wide";
}

interface DrawRequest {
  profile: RenderProfileId | "thumbnail";
  view: string;
  expression?: string;
  clip?: string;
  frame?: string;
  part: "main" | "back" | "front" | "core" | "left-arm" | "top" | "bottom" | "all";
}

interface Metrics {
  width: number;
  height: number;
  cx: number;
  headY: number;
  headR: number;
  torsoTop: number;
  torsoWidth: number;
  torsoHeight: number;
  hipY: number;
  ground: number;
  limb: number;
  bob: number;
  stride: number;
}

const definitions: AssetDefinition[] = [
  { key: "base.standard", name: "Standard Body", kind: "base-body", slots: ["base-body"], tags: ["body", "standard"], color: "#B96F56", paletteRole: "skin.base", plane: "body-base", fitTags: ["body:standard-v1"], provides: ["appearance:body", "appearance:eyes", "appearance:mouth", "mirror.safe"], shape: "standard" },
  { key: "base.petite", name: "Petite Body", kind: "base-body", slots: ["base-body"], tags: ["body", "petite"], color: "#C98261", paletteRole: "skin.base", plane: "body-base", fitTags: ["body:petite-v1"], provides: ["appearance:body", "appearance:eyes", "appearance:mouth", "mirror.safe"], shape: "petite" },
  { key: "base.broad", name: "Broad Body", kind: "base-body", slots: ["base-body"], tags: ["body", "broad"], color: "#714330", paletteRole: "skin.base", plane: "body-base", fitTags: ["body:broad-v1"], provides: ["appearance:body", "appearance:eyes", "appearance:mouth", "mirror.safe"], shape: "broad" },
  ...[
    ["head.oval", "Oval Head", "#B96F56", "standard"], ["head.soft-square", "Soft Square Head", "#C98261", "wide"], ["head.round", "Round Head", "#714330", "petite"]
  ].map(([key, name, color, shape]) => ({ key, name, color, shape, kind: "face", slots: ["head"], tags: ["face", "head"], paletteRole: "skin.base", plane: "face-base", faceChannel: "head", provides: ["appearance:head", "mirror.safe"] } as AssetDefinition)),
  ...[
    ["nose.soft", "Soft Nose"], ["nose.bridge", "Defined Bridge"], ["nose.button", "Button Nose"]
  ].map(([key, name]) => ({ key, name, kind: "face", slots: ["nose"], tags: ["face", "nose"], color: "#7A3D46", paletteRole: "skin.shadow", plane: "face-features", faceChannel: "nose", requires: ["appearance:head"], provides: ["appearance:nose", "mirror.safe"] } as AssetDefinition)),
  ...[
    ["eyes.round", "Round Eyes", "#4ED7E8"], ["eyes.almond", "Almond Eyes", "#9C7CFF"], ["eyes.bright", "Bright Eyes", "#F2BD66"], ["eyes.deep", "Deep Eyes", "#75C69D"]
  ].map(([key, name, color]) => ({ key, name, color, kind: "face", slots: ["eyes"], tags: ["face", "eyes"], paletteRole: "eyes.iris", plane: "face-features", faceChannel: "eyes", requires: ["appearance:head"], provides: ["appearance:eyes", "mirror.safe"] } as AssetDefinition)),
  ...[
    ["brows.soft", "Soft Brows"], ["brows.arched", "Arched Brows"], ["brows.straight", "Straight Brows"], ["brows.bold", "Bold Brows"]
  ].map(([key, name]) => ({ key, name, kind: "face", slots: ["brows"], tags: ["face", "brows"], color: "#33253F", paletteRole: "hair.base", plane: "face-features", faceChannel: "brows", requires: ["appearance:head"], provides: ["appearance:brows", "mirror.safe"] } as AssetDefinition)),
  ...[
    ["mouth.soft", "Soft Mouth"], ["mouth.smile", "Warm Smile"], ["mouth.firm", "Firm Mouth"], ["mouth.smirk", "Side Smirk"]
  ].map(([key, name]) => ({ key, name, kind: "face", slots: ["mouth"], tags: ["face", "mouth"], color: "#8B3E5A", paletteRole: "mouth.base", plane: "face-features", faceChannel: "mouth", requires: ["appearance:head"], provides: ["appearance:mouth", "mirror.safe"] } as AssetDefinition)),
  { key: "hair.bald", name: "Bald", kind: "hair", slots: ["hair"], tags: ["hair", "bald"], color: "#00000000", paletteRole: "hair.base", plane: "hair-front", provides: ["appearance:hair", "mirror.safe"] },
  { key: "hair.cropped", name: "Cropped", kind: "hair", slots: ["hair"], tags: ["hair", "short"], color: "#2B2447", paletteRole: "hair.base", plane: "hair-front", provides: ["appearance:hair", "mirror.safe"] },
  { key: "hair.bob", name: "Layered Bob", kind: "hair", slots: ["hair"], tags: ["hair", "bob", "multi-plane"], color: "#674A83", paletteRole: "hair.base", plane: "hair-front", multiPlane: "hair", provides: ["appearance:hair", "mirror.safe"] },
  { key: "hair.long-straight", name: "Long Straight", kind: "hair", slots: ["hair"], tags: ["hair", "long", "multi-plane", "shoulder-crossing"], color: "#28325B", paletteRole: "hair.base", plane: "hair-front", multiPlane: "hair", provides: ["appearance:hair", "mirror.safe"] },
  { key: "hair.long-wavy", name: "Long Wavy", kind: "hair", slots: ["hair"], tags: ["hair", "long", "wavy", "multi-plane", "shoulder-crossing"], color: "#39345E", paletteRole: "hair.base", plane: "hair-front", multiPlane: "hair", provides: ["appearance:hair", "mirror.safe"] },
  { key: "hair.ponytail", name: "High Ponytail", kind: "hair", slots: ["hair"], tags: ["hair", "ponytail", "multi-plane"], color: "#6B3B50", paletteRole: "hair.base", plane: "hair-front", multiPlane: "hair", provides: ["appearance:hair", "mirror.safe"] },
  { key: "hair.coiled", name: "Textured Coils", kind: "hair", slots: ["hair"], tags: ["hair", "coiled", "multi-plane", "shoulder-crossing"], color: "#8A4A2C", paletteRole: "hair.base", plane: "hair-front", multiPlane: "hair", provides: ["appearance:hair", "mirror.safe"], shape: "wide" },
  { key: "hair.asymmetric", name: "Asymmetric Sweep", kind: "hair", slots: ["hair"], tags: ["hair", "asymmetric", "multi-plane"], color: "#123F4D", paletteRole: "hair.base", plane: "hair-front", multiPlane: "hair", provides: ["appearance:hair"], mirrorSafe: false, shape: "narrow" },
  ...[
    ["marking.freckles", "Freckles", "#7D4B3B"], ["marking.scar", "Fine Scar", "#D2A091"], ["marking.liner", "Graphic Liner", "#2D2637"], ["marking.runes", "Fantasy Runes", "#63D5DB"]
  ].map(([key, name, color]) => ({ key, name, color, kind: "face", slots: ["marking"], tags: ["face", "marking"], paletteRole: "marking.base", plane: "face-features", faceChannel: "marking", provides: ["appearance:marking", "mirror.safe"] } as AssetDefinition)),
  ...[
    ["ears.round", "Round Ears"], ["ears.pointed", "Pointed Ears"], ["ears.fae", "Fae Ears"]
  ].map(([key, name]) => ({ key, name, kind: "face", slots: ["ears"], tags: ["face", "ears"], color: "#B96F56", paletteRole: "skin.base", plane: "face-base", faceChannel: "ears", provides: ["appearance:ears", "mirror.safe"] } as AssetDefinition)),
  { key: "top.fitted-shirt", name: "Fitted Shirt", kind: "top", slots: ["top"], tags: ["clothing", "fitted", "recolorable"], color: "#4ED7E8", paletteRole: "garment.primary", plane: "garment-main", provides: ["appearance:top", "mirror.safe"], shape: "narrow" },
  { key: "top.loose-shirt", name: "Loose Shirt", kind: "top", slots: ["top"], tags: ["clothing", "loose", "recolorable"], color: "#D98A6C", paletteRole: "garment.primary", plane: "garment-main", provides: ["appearance:top", "mirror.safe"] },
  { key: "top.sweater", name: "Archive Sweater", kind: "top", slots: ["top"], tags: ["clothing", "sweater", "recolorable"], color: "#D4A73A", paletteRole: "garment.primary", plane: "garment-main", provides: ["appearance:top", "mirror.safe"], shape: "wide" },
  { key: "top.formal-vest", name: "Formal Vest", kind: "top", slots: ["top"], tags: ["clothing", "formal"], color: "#3E315D", paletteRole: "garment.primary", plane: "garment-main", provides: ["appearance:top", "mirror.safe"] },
  { key: "bottom.fitted-pants", name: "Fitted Pants", kind: "bottom", slots: ["bottom"], tags: ["clothing", "fitted", "recolorable"], color: "#332A55", paletteRole: "garment.secondary", plane: "garment-main", provides: ["appearance:bottom", "mirror.safe"], shape: "narrow" },
  { key: "bottom.wide-trousers", name: "Wide Trousers", kind: "bottom", slots: ["bottom"], tags: ["clothing", "wide", "recolorable"], color: "#352F35", paletteRole: "garment.secondary", plane: "garment-main", provides: ["appearance:bottom", "mirror.safe"], shape: "wide" },
  { key: "bottom.shorts", name: "Layered Shorts", kind: "bottom", slots: ["bottom"], tags: ["clothing", "short"], color: "#765247", paletteRole: "garment.secondary", plane: "garment-main", provides: ["appearance:bottom", "mirror.safe"] },
  { key: "outfit.simple", name: "Courier One-piece", kind: "outfit", slots: ["top", "bottom"], tags: ["clothing", "one-piece", "multi-slot"], color: "#DD6E57", paletteRole: "garment.primary", plane: "garment-main", provides: ["appearance:top", "appearance:bottom", "mirror.safe"], shape: "narrow" },
  { key: "outerwear.short-jacket", name: "Short Jacket", kind: "outerwear", slots: ["outerwear"], tags: ["clothing", "jacket", "layered"], color: "#70456F", paletteRole: "garment.secondary", plane: "garment-overlap", provides: ["appearance:outerwear", "mirror.safe"] },
  { key: "outerwear.long-coat", name: "Long Tailed Coat", kind: "outerwear", slots: ["outerwear"], tags: ["clothing", "coat", "multi-plane", "shoulder-crossing"], color: "#244B3C", paletteRole: "garment.secondary", plane: "garment-overlap", multiPlane: "coat", provides: ["appearance:outerwear", "mirror.safe"], shape: "wide" },
  ...([
    ["shoes.low", "Low Shoes", "#513D39", "standard"], ["shoes.boots", "Field Boots", "#654433", "standard"], ["shoes.tall-boots", "Tall Boots", "#30283D", "narrow"], ["shoes.crystal-feet", "Crystal Foot Form", "#61D8E4", "narrow"]
  ] as Array<[string, string, string, AssetDefinition["shape"]]>).map(([key, name, color, shape]) => ({ key, name, color, shape, kind: "shoes", slots: ["shoes"], tags: ["clothing", "shoes", key.includes("crystal") ? "replacement" : "standard"], paletteRole: key.includes("crystal") ? "crystal.base" : "garment.secondary", plane: "garment-overlap", provides: ["appearance:shoes", "mirror.safe"] } as AssetDefinition)),
  { key: "body.crystal-arm", name: "Crystal Left Arm", kind: "body-module", slots: ["body-arm-left"], tags: ["replacement", "crystal", "asymmetric"], color: "#61D8E4", paletteRole: "crystal.base", plane: "body-base", effects: [{ kind: "suppress-tags", targetTags: ["body.arm.left.base"] }, { kind: "provide-coverage", regions: ["body.arm.left.skin"] }], provides: ["appearance:arm.crystal"], mirrorSafe: false },
  { key: "body.vine-arm", name: "Vine Left Arm", kind: "body-module", slots: ["body-arm-left"], tags: ["replacement", "vine", "asymmetric"], color: "#5A8B55", paletteRole: "accent.base", plane: "body-base", effects: [{ kind: "suppress-tags", targetTags: ["body.arm.left.base"] }, { kind: "provide-coverage", regions: ["body.arm.left.skin"] }], provides: ["appearance:arm.vine"], mirrorSafe: false },
  { key: "accessory.brim-hat", name: "Archivist Hat", kind: "accessory", slots: ["hat"], tags: ["accessory", "hat", "suppression"], color: "#54314D", paletteRole: "accent.base", plane: "accessory-front", requires: ["appearance:hair"], effects: [{ kind: "suppress-tags", targetTags: ["hair.crown"] }], provides: ["appearance:hat", "mirror.safe"] },
  { key: "accessory.glasses", name: "Round Glasses", kind: "accessory", slots: ["face-accessory"], tags: ["accessory", "glasses"], color: "#D0A34A", paletteRole: "accent.base", plane: "accessory-front", requires: ["appearance:eyes"], provides: ["appearance:glasses", "mirror.safe"] },
  { key: "accessory.earrings", name: "Drop Earrings", kind: "accessory", slots: ["ear-accessory"], tags: ["accessory", "earrings"], color: "#E8B955", paletteRole: "accent.base", plane: "accessory-front", requires: ["appearance:ears"], provides: ["appearance:earrings", "mirror.safe"] },
  { key: "accessory.scarf", name: "Patterned Scarf", kind: "accessory", slots: ["neck-accessory"], tags: ["accessory", "scarf", "conflict"], color: "#70456F", paletteRole: "accent.base", plane: "accessory-front", conflicts: ["asset:starter.outerwear.long-coat"], provides: ["appearance:scarf", "mirror.safe"] },
  { key: "accessory.sketchbook", name: "Sketchbook", kind: "accessory", slots: ["handheld"], tags: ["accessory", "handheld"], color: "#805842", paletteRole: "accent.base", plane: "foreground", requires: ["anchor:hand.left.grip"], provides: ["appearance:handheld"], mirrorSafe: false },
  { key: "accessory.wings", name: "Moth Wings", kind: "accessory", slots: ["back-accessory"], tags: ["accessory", "back", "wings"], color: "#9E8458", paletteRole: "accent.base", plane: "accessory-back", provides: ["appearance:back", "mirror.safe"], shape: "wide" },
  { key: "accessory.backpack", name: "Field Backpack", kind: "accessory", slots: ["back-accessory"], tags: ["accessory", "backpack"], color: "#76513C", paletteRole: "accent.base", plane: "accessory-back", conflicts: ["asset:starter.accessory.wings"], provides: ["appearance:back", "mirror.safe"] },
  { key: "accessory.communicator", name: "One-sided Communicator", kind: "accessory", slots: ["ear-accessory"], tags: ["accessory", "asymmetric", "no-mirror"], color: "#E3AC54", paletteRole: "accent.base", plane: "accessory-front", provides: ["appearance:communicator"], mirrorSafe: false },
  { key: "accessory.utility-harness", name: "Utility Harness", kind: "accessory", slots: ["waist-accessory", "handheld"], tags: ["accessory", "multi-slot"], color: "#5C443A", paletteRole: "accent.base", plane: "garment-overlap", provides: ["appearance:harness", "mirror.safe"] },
  { key: "accessory.pendant", name: "Scarf Pendant", kind: "accessory", slots: ["charm"], tags: ["accessory", "dependency"], color: "#62DDE1", paletteRole: "accent.base", plane: "accessory-front", requires: ["asset:starter.accessory.scarf"], provides: ["appearance:pendant", "mirror.safe"] }
];

function hash(value: string): string {
  return `sha256-${createHash("sha256").update(value).digest("hex")}`;
}

function id(definition: AssetDefinition): string {
  return `starter.${definition.key}`;
}

function safeKey(definition: AssetDefinition): string {
  return definition.key.replaceAll(".", "-");
}

function metrics(request: DrawRequest, shape: AssetDefinition["shape"]): Metrics {
  const phase = request.frame?.includes("left") ? -1 : request.frame?.includes("right") ? 1 : 0;
  const flight = request.frame?.includes("flight") ? -2 : 0;
  if (request.profile === "portrait") return { width: 256, height: 256, cx: 128, headY: 76, headR: 46, torsoTop: 126, torsoWidth: shape === "wide" ? 126 : shape === "narrow" ? 86 : 106, torsoHeight: 118, hipY: 220, ground: 252, limb: 18, bob: 0, stride: 0 };
  if (request.profile === "full-body") return { width: 256, height: 384, cx: 128, headY: 68, headR: shape === "petite" ? 34 : 37, torsoTop: 106, torsoWidth: shape === "broad" || shape === "wide" ? 112 : shape === "petite" || shape === "narrow" ? 72 : 88, torsoHeight: shape === "petite" ? 104 : 124, hipY: shape === "petite" ? 204 : 226, ground: 364, limb: shape === "broad" ? 18 : 14, bob: 0, stride: 0 };
  const torsoWidth = shape === "broad" || shape === "wide" ? 34 : shape === "petite" || shape === "narrow" ? 23 : 28;
  return { width: 96, height: 96, cx: 48, headY: 21 + flight, headR: shape === "petite" ? 11 : 12, torsoTop: 34 + flight, torsoWidth, torsoHeight: 27, hipY: 59 + flight, ground: 88, limb: shape === "broad" ? 6 : 5, bob: flight, stride: phase * (request.clip === "run" ? 5 : request.clip === "walk" ? 3 : 0) };
}

function roundedRect(context: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function fillStroke(context: SKRSContext2D, color: string, lineWidth: number): void {
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "#2A2035";
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  context.stroke();
}

function ellipse(context: SKRSContext2D, x: number, y: number, rx: number, ry: number, color: string, lineWidth: number): void {
  context.beginPath();
  context.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  fillStroke(context, color, lineWidth);
}

function line(context: SKRSContext2D, points: Array<[number, number]>, color: string, width: number): void {
  const first = points[0];
  if (first === undefined) return;
  context.beginPath();
  context.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) context.lineTo(point[0], point[1]);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

function drawBody(context: SKRSContext2D, definition: AssetDefinition, request: DrawRequest, part: DrawRequest["part"]): void {
  const m = metrics(request, definition.shape);
  const lineWidth = request.profile === "sprite" || request.profile === "thumbnail" ? 2 : 4;
  const scale = request.profile === "portrait" ? 1.25 : request.profile === "sprite" || request.profile === "thumbnail" ? .42 : 1;
  const leftX = m.cx - m.torsoWidth / 2 - m.limb * .45;
  const rightX = m.cx + m.torsoWidth / 2 + m.limb * .45;
  if (part === "core" || part === "all") {
    ellipse(context, m.cx, m.headY, m.headR, m.headR * (definition.shape === "wide" ? .9 : 1.02), definition.color, lineWidth);
    roundedRect(context, m.cx - m.torsoWidth / 2, m.torsoTop, m.torsoWidth, m.torsoHeight, 18 * scale);
    fillStroke(context, definition.color, lineWidth);
    line(context, [[rightX, m.torsoTop + 12 * scale], [rightX + 10 * scale, m.hipY - 14 * scale]], definition.color, m.limb);
    if (request.profile !== "portrait") {
      const legTop = m.hipY - 3 * scale;
      line(context, [[m.cx - m.torsoWidth * .22, legTop], [m.cx - m.torsoWidth * .22 - m.stride, m.ground - 6 * scale]], definition.color, m.limb * 1.15);
      line(context, [[m.cx + m.torsoWidth * .22, legTop], [m.cx + m.torsoWidth * .22 + m.stride, m.ground - 6 * scale]], definition.color, m.limb * 1.15);
    }
    if (request.view !== "back") {
      ellipse(context, m.cx - m.headR * .35, m.headY - 2 * scale, 2.6 * scale, 3 * scale, "#2A2035", 0);
      ellipse(context, m.cx + m.headR * .35, m.headY - 2 * scale, 2.6 * scale, 3 * scale, "#2A2035", 0);
      line(context, [[m.cx - 6 * scale, m.headY + m.headR * .35], [m.cx + 7 * scale, m.headY + m.headR * .35]], "#8B3E5A", 2 * scale);
    }
  }
  if (part === "left-arm" || part === "all") {
    line(context, [[leftX, m.torsoTop + 12 * scale], [leftX - 10 * scale, m.hipY - 14 * scale]], definition.color, m.limb);
  }
}

function drawLayer(context: SKRSContext2D, definition: AssetDefinition, request: DrawRequest): void {
  const m = metrics(request, definition.shape);
  const sprite = request.profile === "sprite" || request.profile === "thumbnail";
  const s = request.profile === "portrait" ? 1.25 : sprite ? .42 : 1;
  const lw = sprite ? 2 : 4;
  if (definition.kind === "base-body") { drawBody(context, definition, request, request.part); return; }
  if (definition.kind === "body-module") {
    const x = m.cx - m.torsoWidth / 2 - m.limb * .45;
    line(context, [[x, m.torsoTop + 10 * s], [x - 12 * s, m.hipY - 12 * s]], definition.color, m.limb * 1.15);
    for (let index = 0; index < 3; index += 1) line(context, [[x - 4 * s, m.torsoTop + (20 + index * 20) * s], [x - 15 * s, m.torsoTop + (28 + index * 20) * s]], "#D7FBFF", Math.max(1, 2 * s));
    return;
  }
  if (definition.kind === "hair") {
    if (definition.key === "hair.bald") return;
    const wide = definition.shape === "wide" ? 1.35 : 1;
    if (request.part === "back") {
      ellipse(context, m.cx, m.headY + m.headR * .45, m.headR * 1.18 * wide, m.headR * (definition.key.includes("long") || definition.key.includes("coiled") ? 1.85 : 1.2), definition.color, lw);
      if (definition.key.includes("ponytail")) ellipse(context, m.cx + m.headR * 1.15, m.headY + m.headR * .7, m.headR * .5, m.headR, definition.color, lw);
      return;
    }
    context.beginPath();
    context.arc(m.cx, m.headY - m.headR * .05, m.headR * 1.08 * wide, Math.PI, Math.PI * 2);
    context.quadraticCurveTo(m.cx + m.headR * .25, m.headY + m.headR * .25, m.cx - m.headR * .95, m.headY + m.headR * .45);
    context.closePath();
    fillStroke(context, definition.color, lw);
    return;
  }
  if (definition.faceChannel !== undefined) {
    if (request.view === "back") return;
    const expression = request.expression ?? "neutral";
    const eyeY = m.headY - 3 * s;
    if (definition.faceChannel === "head") { ellipse(context, m.cx, m.headY, m.headR * (definition.shape === "wide" ? 1.05 : .98), m.headR, definition.color, lw); return; }
    if (definition.faceChannel === "nose") { line(context, [[m.cx, eyeY], [m.cx - 2 * s, m.headY + 9 * s], [m.cx + 3 * s, m.headY + 10 * s]], definition.color, Math.max(1.2, 2 * s)); return; }
    if (definition.faceChannel === "eyes") {
      const closed = expression === "tired" || expression === "annoyed";
      const surprised = expression === "surprised";
      for (const side of [-1, 1]) {
        if (closed) line(context, [[m.cx + side * 18 * s - 5 * s, eyeY], [m.cx + side * 18 * s + 5 * s, eyeY]], "#2A2035", 2 * s);
        else ellipse(context, m.cx + side * 18 * s, eyeY, surprised ? 6 * s : 5 * s, surprised ? 7 * s : 4 * s, definition.color, Math.max(1, 1.4 * s));
      }
      return;
    }
    if (definition.faceChannel === "brows") {
      const tilt = expression === "concerned" ? -3 : expression === "determined" || expression === "annoyed" ? 3 : 0;
      for (const side of [-1, 1]) line(context, [[m.cx + side * 24 * s, eyeY - 12 * s + tilt * side * s], [m.cx + side * 12 * s, eyeY - 14 * s - tilt * side * s]], definition.color, 3 * s);
      return;
    }
    if (definition.faceChannel === "mouth") {
      const open = expression === "surprised";
      if (open) ellipse(context, m.cx, m.headY + 22 * s, 5 * s, 7 * s, definition.color, 1 * s);
      else {
        const expressionCurves: Record<string, [number, number, number]> = {
          smirk: [23, 24, 18],
          cheerful: [20, 28, 20],
          confident: [21, 26, 20],
          playful: [19, 27, 22],
          thoughtful: [23, 21, 23],
          concerned: [25, 20, 25],
          annoyed: [24, 20, 24],
          tired: [23, 21, 23],
          determined: [23, 21, 23]
        };
        const neutralCurves: Record<string, [number, number, number]> = {
          "mouth.soft": [22, 24, 22],
          "mouth.smile": [20, 28, 20],
          "mouth.firm": [22, 22, 22],
          "mouth.smirk": [23, 24, 18]
        };
        const curve = expression === "neutral" || expression === "*"
          ? neutralCurves[definition.key] ?? [22, 22, 22]
          : expressionCurves[expression] ?? [22, 22, 22];
        line(context, [[m.cx - 10 * s, m.headY + curve[0] * s], [m.cx, m.headY + curve[1] * s], [m.cx + 10 * s, m.headY + curve[2] * s]], definition.color, 2.5 * s);
      }
      return;
    }
    if (definition.faceChannel === "marking") {
      if (definition.key.includes("freckles")) for (const side of [-1, 1]) for (let n = 0; n < 3; n += 1) ellipse(context, m.cx + side * (10 + n * 4) * s, m.headY + (9 + n % 2 * 3) * s, 1.2 * s, 1.2 * s, definition.color, 0);
      else if (definition.key.includes("scar")) line(context, [[m.cx + 14 * s, m.headY - 10 * s], [m.cx + 22 * s, m.headY + 17 * s]], definition.color, 2 * s);
      else line(context, [[m.cx - 28 * s, eyeY - 1 * s], [m.cx - 12 * s, eyeY - 5 * s]], definition.color, 2.5 * s);
      return;
    }
    if (definition.faceChannel === "ears") {
      for (const side of [-1, 1]) {
        context.beginPath();
        context.moveTo(m.cx + side * m.headR * .82, m.headY);
        context.lineTo(m.cx + side * m.headR * (definition.key.includes("fae") ? 1.55 : definition.key.includes("pointed") ? 1.3 : 1.05), m.headY - 4 * s);
        context.lineTo(m.cx + side * m.headR * .9, m.headY + 14 * s);
        context.closePath();
        fillStroke(context, definition.color, lw);
      }
      return;
    }
  }
  if (definition.kind === "top" || definition.kind === "outfit") {
    const width = m.torsoWidth * (definition.shape === "wide" ? 1.12 : definition.shape === "narrow" ? .9 : 1);
    if (request.part !== "bottom") {
      roundedRect(context, m.cx - width / 2, m.torsoTop + 3 * s, width, m.torsoHeight * .76, 12 * s);
      fillStroke(context, definition.color, lw);
    }
    if (definition.kind === "outfit" && request.part !== "top") {
      line(context, [[m.cx - width * .25, m.hipY], [m.cx - width * .25 - m.stride, m.ground - 7 * s]], definition.color, m.limb * 1.45);
      line(context, [[m.cx + width * .25, m.hipY], [m.cx + width * .25 + m.stride, m.ground - 7 * s]], definition.color, m.limb * 1.45);
    }
    return;
  }
  if (definition.kind === "bottom") {
    const legWidth = m.limb * (definition.shape === "wide" ? 1.8 : 1.35);
    const end = definition.key.includes("shorts") ? m.hipY + (m.ground - m.hipY) * .35 : m.ground - 8 * s;
    line(context, [[m.cx - m.torsoWidth * .22, m.hipY], [m.cx - m.torsoWidth * .22 - m.stride, end]], definition.color, legWidth);
    line(context, [[m.cx + m.torsoWidth * .22, m.hipY], [m.cx + m.torsoWidth * .22 + m.stride, end]], definition.color, legWidth);
    return;
  }
  if (definition.kind === "outerwear") {
    if (request.part === "back") {
      context.beginPath();
      context.moveTo(m.cx - m.torsoWidth * .55, m.torsoTop + 10 * s);
      context.lineTo(m.cx - m.torsoWidth * .85, m.ground - 15 * s);
      context.lineTo(m.cx, m.hipY + 20 * s);
      context.lineTo(m.cx + m.torsoWidth * .85, m.ground - 15 * s);
      context.lineTo(m.cx + m.torsoWidth * .55, m.torsoTop + 10 * s);
      context.closePath(); fillStroke(context, definition.color, lw); return;
    }
    const coatLength = definition.key.includes("long") ? m.torsoHeight * .9 : m.torsoHeight * .55;
    roundedRect(context, m.cx - m.torsoWidth * .62, m.torsoTop, m.torsoWidth * 1.24, coatLength, 10 * s); fillStroke(context, definition.color, lw);
    context.globalCompositeOperation = "destination-out";
    context.fillRect(m.cx - m.torsoWidth * .18, m.torsoTop - 2, m.torsoWidth * .36, coatLength + 4);
    context.globalCompositeOperation = "source-over";
    return;
  }
  if (definition.kind === "shoes") {
    const tall = definition.key.includes("tall") ? 34 * s : definition.key.includes("crystal") ? 28 * s : definition.key.includes("boots") ? 22 * s : 12 * s;
    for (const side of [-1, 1]) {
      const x = m.cx + side * m.torsoWidth * .23 + side * m.stride;
      roundedRect(context, x - 10 * s, m.ground - tall, 22 * s, tall, definition.key.includes("crystal") ? 2 : 6 * s); fillStroke(context, definition.color, lw);
    }
    return;
  }
  if (definition.kind === "accessory") {
    if (definition.key.includes("wings")) {
      for (const side of [-1, 1]) { context.beginPath(); context.moveTo(m.cx + side * 22 * s, m.torsoTop + 25 * s); context.quadraticCurveTo(m.cx + side * 100 * s, m.torsoTop + 5 * s, m.cx + side * 78 * s, m.hipY + 25 * s); context.quadraticCurveTo(m.cx + side * 38 * s, m.hipY, m.cx + side * 22 * s, m.torsoTop + 25 * s); fillStroke(context, definition.color, lw); } return;
    }
    if (definition.key.includes("backpack")) { roundedRect(context, m.cx - m.torsoWidth * .65, m.torsoTop + 15 * s, m.torsoWidth * 1.3, m.torsoHeight * .68, 12 * s); fillStroke(context, definition.color, lw); return; }
    if (definition.key.includes("hat")) { ellipse(context, m.cx, m.headY - m.headR * .75, m.headR * 1.4, m.headR * .28, definition.color, lw); roundedRect(context, m.cx - m.headR * .7, m.headY - m.headR * 1.4, m.headR * 1.4, m.headR * .75, 12 * s); fillStroke(context, definition.color, lw); return; }
    if (definition.key.includes("glasses")) { for (const side of [-1, 1]) ellipse(context, m.cx + side * 17 * s, m.headY - 2 * s, 12 * s, 10 * s, "#00000000", 2.5 * s); line(context, [[m.cx - 5 * s, m.headY - 2 * s], [m.cx + 5 * s, m.headY - 2 * s]], definition.color, 2.5 * s); return; }
    if (definition.key.includes("earrings")) { for (const side of [-1, 1]) ellipse(context, m.cx + side * (m.headR + 4 * s), m.headY + 13 * s, 3 * s, 7 * s, definition.color, 1 * s); return; }
    if (definition.key.includes("communicator")) { roundedRect(context, m.cx + m.headR * .8, m.headY - 12 * s, 8 * s, 24 * s, 4 * s); fillStroke(context, definition.color, lw); return; }
    if (definition.key.includes("scarf")) { roundedRect(context, m.cx - m.torsoWidth * .38, m.torsoTop - 5 * s, m.torsoWidth * .76, 24 * s, 10 * s); fillStroke(context, definition.color, lw); return; }
    if (definition.key.includes("sketchbook")) { roundedRect(context, m.cx - m.torsoWidth * .8, m.hipY - 35 * s, 28 * s, 40 * s, 3 * s); fillStroke(context, definition.color, lw); return; }
    if (definition.key.includes("harness")) { line(context, [[m.cx - m.torsoWidth * .48, m.hipY - 10 * s], [m.cx + m.torsoWidth * .48, m.hipY - 10 * s]], definition.color, 8 * s); return; }
    if (definition.key.includes("pendant")) { line(context, [[m.cx, m.torsoTop + 6 * s], [m.cx, m.torsoTop + 34 * s]], definition.color, 2 * s); ellipse(context, m.cx, m.torsoTop + 38 * s, 5 * s, 7 * s, definition.color, 1 * s); }
  }
}

async function emitPng(relativePath: string, width: number, height: number, draw: (context: SKRSContext2D) => void): Promise<void> {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  draw(context);
  const bytes = canvas.toBuffer("image/png");
  for (const root of [packRoot, studioRoot]) {
    const destination = join(root, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
}

function dimensions(profile: RenderProfileId | "thumbnail"): [number, number] {
  if (profile === "portrait") return [256, 256];
  if (profile === "full-body") return [256, 384];
  return [96, 96];
}

function fragment(
  definition: AssetDefinition,
  fragmentId: string,
  selector: FragmentSelector,
  source: string,
  plane: string,
  tags: string[],
  covers: string[] = [],
  contentSlots: string[] = definition.slots,
  motionGroup?: string
): AssetFragment {
  const [width, height] = dimensions(selector.profile);
  const result: AssetFragment = {
    id: fragmentId,
    selector,
    source,
    plane,
    order: 0,
    anchor: "canvas.origin",
    pivot: [0, 0],
    paletteRoles: [definition.paletteRole],
    contentSlots,
    ...(motionGroup === undefined ? {} : { motionGroup }),
    covers,
    suppresses: [],
    tags,
    bounds: { x: 0, y: 0, width, height }
  };
  if (definition.mirrorSafe !== undefined) result.mirrorSafe = definition.mirrorSafe;
  return result;
}

async function emitFragmentImage(
  definition: AssetDefinition,
  name: string,
  request: DrawRequest
): Promise<string> {
  const [width, height] = dimensions(request.profile);
  const source = `images/${safeKey(definition)}/${name}.png`;
  await emitPng(source, width, height, (context) => drawLayer(context, definition, request));
  return source;
}

async function buildAsset(definition: AssetDefinition, rig: RigDefinition): Promise<AssetManifest> {
  const fragments: AssetFragment[] = [];
  const views = {
    portrait: ["front"],
    "full-body": rig.profiles.find((profile) => profile.id === "full-body")?.views ?? ["front"],
    sprite: rig.profiles.find((profile) => profile.id === "sprite")?.views ?? ["front"]
  } as const;
  const baseTags = [`asset.${safeKey(definition)}`];

  const addGeneral = async (
    profile: RenderProfileId,
    view: string,
    expression = "*",
    motion?: { clip: NonNullable<FragmentSelector["clip"]>; frame: string }
  ): Promise<void> => {
    const selector: FragmentSelector = motion === undefined
      ? { profile, view, expression }
      : { profile, view, clip: motion.clip, frame: motion.frame };
    const suffix = motion === undefined
      ? `${profile}-${view}-${expression.replace("*", "any")}`
      : `${profile}-${motion.clip}-${view}-${motion.frame}`;
    if (definition.kind === "outfit") {
      for (const part of ["top", "bottom"] as const) {
        const source = await emitFragmentImage(definition, `${suffix}-${part}`, { profile, view, expression, ...(motion === undefined ? {} : motion), part });
        fragments.push(fragment(definition, `${suffix}.${part}`, selector, source, definition.plane, [...baseTags, `outfit.${part}`], [], [part], profile === "sprite" ? part : undefined));
      }
      return;
    }
    if (definition.multiPlane !== undefined) {
      const backPlane = definition.multiPlane === "hair" ? "hair-back" : "garment-behind-body";
      const frontPlane = definition.multiPlane === "hair" ? "hair-front" : "garment-overlap";
      const back = await emitFragmentImage(definition, `${suffix}-back`, { profile, view, expression, ...(motion === undefined ? {} : motion), part: "back" });
      const front = await emitFragmentImage(definition, `${suffix}-front`, { profile, view, expression, ...(motion === undefined ? {} : motion), part: "front" });
      fragments.push(fragment(definition, `${suffix}.back`, selector, back, backPlane, [...baseTags, definition.multiPlane === "hair" ? "hair.back" : "coat.tail"], [], definition.slots, profile === "sprite" ? "back" : undefined));
      fragments.push(fragment(definition, `${suffix}.front`, selector, front, frontPlane, [...baseTags, definition.multiPlane === "hair" ? "hair.crown" : "coat.front"], [], definition.slots, profile === "sprite" ? "front" : undefined));
    } else {
      const source = await emitFragmentImage(definition, suffix, { profile, view, expression, ...(motion === undefined ? {} : motion), part: "main" });
      fragments.push(fragment(definition, suffix, selector, source, definition.plane, baseTags, [], definition.slots, profile === "sprite" ? "main" : undefined));
    }
  };

  if (definition.kind === "base-body") {
    const portraitCore = await emitFragmentImage(definition, "portrait-front-core", { profile: "portrait", view: "front", expression: "*", part: "core" });
    fragments.push(fragment(definition, "portrait.front.core", { profile: "portrait", view: "front", expression: "*" }, portraitCore, "body-base", ["body.head.base", "body.torso.base", "face.base"], ["body.head.skin", "body.torso.skin", "face.eyes", "face.mouth"]));
    for (const view of views["full-body"]) {
      const core = await emitFragmentImage(definition, `full-body-${view}-core`, { profile: "full-body", view, expression: "*", part: "core" });
      const arm = await emitFragmentImage(definition, `full-body-${view}-left-arm`, { profile: "full-body", view, expression: "*", part: "left-arm" });
      fragments.push(fragment(definition, `full-body.${view}.core`, { profile: "full-body", view, expression: "*" }, core, "body-base", ["body.head.base", "body.torso.base", "body.arm.right.base", "body.legs.base"], ["body.head.skin", "body.torso.skin", "body.arm.right.skin", "body.leg.left.skin", "body.leg.right.skin"]));
      fragments.push(fragment(definition, `full-body.${view}.left-arm`, { profile: "full-body", view, expression: "*" }, arm, "body-base", ["body.arm.left.base"], ["body.arm.left.skin"]));
    }
    for (const clip of rig.clips) for (const view of clip.directions) for (const frameInfo of clip.frames) {
      const request = { profile: "sprite" as const, view, clip: clip.id, frame: frameInfo.id, part: "core" as const };
      const core = await emitFragmentImage(definition, `sprite-${clip.id}-${view}-${frameInfo.id}-core`, request);
      const arm = await emitFragmentImage(definition, `sprite-${clip.id}-${view}-${frameInfo.id}-left-arm`, { ...request, part: "left-arm" });
      fragments.push(fragment(definition, `sprite.${clip.id}.${view}.${frameInfo.id}.core`, { profile: "sprite", view, clip: clip.id, frame: frameInfo.id }, core, "body-base", ["body.head.base", "body.torso.base", "body.arm.right.base", "body.legs.base"], ["body.head.skin", "body.torso.skin", "body.arm.right.skin", "body.leg.left.skin", "body.leg.right.skin"], definition.slots, "core"));
      fragments.push(fragment(definition, `sprite.${clip.id}.${view}.${frameInfo.id}.left-arm`, { profile: "sprite", view, clip: clip.id, frame: frameInfo.id }, arm, "body-base", ["body.arm.left.base"], ["body.arm.left.skin"], definition.slots, "left-arm"));
    }
  } else if (definition.kind === "body-module") {
    await addGeneral("portrait", "front");
    for (const view of views["full-body"]) {
      const source = await emitFragmentImage(definition, `full-body-${view}`, { profile: "full-body", view, part: "main" });
      fragments.push(fragment(definition, `full-body.${view}`, { profile: "full-body", view, expression: "*" }, source, definition.plane, [...baseTags, "body.arm.left.replacement"], ["body.arm.left.skin"]));
    }
    for (const clip of rig.clips) for (const view of clip.directions) for (const frameInfo of clip.frames) {
      const source = await emitFragmentImage(definition, `sprite-${clip.id}-${view}-${frameInfo.id}`, { profile: "sprite", view, clip: clip.id, frame: frameInfo.id, part: "main" });
      fragments.push(fragment(definition, `sprite.${clip.id}.${view}.${frameInfo.id}`, { profile: "sprite", view, clip: clip.id, frame: frameInfo.id }, source, definition.plane, [...baseTags, "body.arm.left.replacement"], ["body.arm.left.skin"], definition.slots, "main"));
    }
  } else if (definition.kind === "shoes") {
    for (const view of views["full-body"]) {
      const source = await emitFragmentImage(definition, `full-body-${view}`, { profile: "full-body", view, part: "main" });
      fragments.push(fragment(definition, `full-body.${view}`, { profile: "full-body", view, expression: "*" }, source, definition.plane, baseTags, ["body.leg.left.skin", "body.leg.right.skin"]));
    }
    for (const clip of rig.clips) for (const view of clip.directions) for (const frameInfo of clip.frames) {
      const source = await emitFragmentImage(definition, `sprite-${clip.id}-${view}-${frameInfo.id}`, { profile: "sprite", view, clip: clip.id, frame: frameInfo.id, part: "main" });
      fragments.push(fragment(definition, `sprite.${clip.id}.${view}.${frameInfo.id}`, { profile: "sprite", view, clip: clip.id, frame: frameInfo.id }, source, definition.plane, baseTags, ["body.leg.left.skin", "body.leg.right.skin"], definition.slots, "main"));
    }
  } else {
    const expressionAware = definition.faceChannel === "eyes" || definition.faceChannel === "brows" || definition.faceChannel === "mouth";
    if (expressionAware) for (const expression of expressions) await addGeneral("portrait", "front", expression);
    else await addGeneral("portrait", "front");
    for (const view of views["full-body"]) await addGeneral("full-body", view);
    for (const clip of rig.clips) for (const view of clip.directions) for (const frameInfo of clip.frames) {
      await addGeneral("sprite", view, "*", { clip: clip.id, frame: frameInfo.id });
    }
  }

  const thumbnail = `thumbnails/${safeKey(definition)}.png`;
  await emitPng(thumbnail, 96, 96, (context) => drawLayer(context, definition, { profile: "thumbnail", view: "front", expression: "cheerful", clip: "idle", frame: "center", part: definition.multiPlane === undefined ? "all" : "front" }));
  const manifest: AssetManifest = {
    schemaVersion: SCHEMA_VERSION,
    id: id(definition),
    version,
    kind: definition.kind,
    display: { name: definition.name, tags: definition.tags, thumbnail },
    compatibility: { rigFamilies: [rig.id], engine: ">=0.1.0 <1.0.0", fitTags: definition.fitTags ?? ["body:shared-v1"] },
    equip: {
      slots: definition.slots,
      exclusiveGroup: definition.slots.join("."),
      requires: definition.requires ?? [],
      conflicts: definition.conflicts ?? [],
      provides: [...(definition.provides ?? []), ...(definition.mirrorSafe === false ? [] : definition.provides?.includes("mirror.safe") ? [] : ["mirror.safe"])]
    },
    palette: { roles: { [definition.paletteRole]: { default: definition.color === "#00000000" ? "#2A2035" : definition.color, mode: "replace" } } },
    effects: definition.effects ?? [],
    fragments,
    fallbacks: [],
    provenance: { authors: [author], license, source: null, contentHash: hash(`${id(definition)}@${version}`) }
  };
  const parsed = parseAssetManifest(manifest, rig);
  if (!parsed.ok) throw new Error(`${manifest.id}: ${JSON.stringify(parsed.diagnostics, null, 2)}`);
  return parsed.value;
}

function selection(assetId: string, variant?: string): { assetId: string; version: string; variant?: string } {
  return variant === undefined ? { assetId, version } : { assetId, version, variant };
}

function recipe(name: string, seed: number, assetIds: string[], palette: Record<string, string>): CharacterRecipe {
  const value: CharacterRecipe = {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    rigFamily: "starter-humanoid@1",
    equipped: assetIds.map((assetId) => selection(assetId)),
    palette,
    parameters: { expression: "neutral" },
    seed,
    metadata: { name }
  };
  const parsed = parseCharacterRecipe(value);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics, null, 2));
  return parsed.value;
}

const sourceRig = parseRig(JSON.parse(await readFile(join(repository, "fixtures/valid/rig/starter-humanoid.json"), "utf8")) as unknown);
if (!sourceRig.ok) throw new Error(JSON.stringify(sourceRig.diagnostics, null, 2));
const rig = structuredClone(sourceRig.value);
const fullBody = rig.profiles.find((profile) => profile.id === "full-body");
if (fullBody !== undefined) fullBody.views = ["front", "back", "left", "right"];
const portrait = rig.profiles.find((profile) => profile.id === "portrait");
if (portrait !== undefined) portrait.hiddenSlots = ["bottom", "shoes"];
const sprite = rig.profiles.find((profile) => profile.id === "sprite");
if (sprite !== undefined) {
  sprite.views = ["front"];
  sprite.hiddenSlots = ["mouth"];
}
rig.clips = rig.clips
  .filter((clip) => clip.id === "idle" || clip.id === "walk" || clip.id === "run")
  .map((clip) => ({ ...clip, directions: ["front"] }));
rig.slots = [
  { id: "base-body", exclusive: true, allowedKinds: ["base-body"] },
  { id: "body-arm-left", exclusive: true, allowedKinds: ["body-module"] },
  { id: "head", exclusive: true, allowedKinds: ["face"] },
  { id: "nose", exclusive: true, allowedKinds: ["face"] },
  { id: "eyes", exclusive: true, allowedKinds: ["face"] },
  { id: "brows", exclusive: true, allowedKinds: ["face"] },
  { id: "mouth", exclusive: true, allowedKinds: ["face"] },
  { id: "marking", exclusive: true, allowedKinds: ["face"] },
  { id: "ears", exclusive: true, allowedKinds: ["face"] },
  { id: "hair", exclusive: true, allowedKinds: ["hair"] },
  { id: "top", exclusive: true, allowedKinds: ["top", "outfit"] },
  { id: "bottom", exclusive: true, allowedKinds: ["bottom", "outfit"] },
  { id: "outerwear", exclusive: true, allowedKinds: ["outerwear"] },
  { id: "shoes", exclusive: true, allowedKinds: ["shoes"] },
  { id: "hat", exclusive: true, allowedKinds: ["accessory"] },
  { id: "face-accessory", exclusive: true, allowedKinds: ["accessory"] },
  { id: "ear-accessory", exclusive: true, allowedKinds: ["accessory"] },
  { id: "neck-accessory", exclusive: true, allowedKinds: ["accessory"] },
  { id: "handheld", exclusive: true, allowedKinds: ["accessory"] },
  { id: "back-accessory", exclusive: true, allowedKinds: ["accessory"] },
  { id: "waist-accessory", exclusive: true, allowedKinds: ["accessory"] },
  { id: "charm", exclusive: true, allowedKinds: ["accessory"] }
];
const checkedRig = parseRig(rig);
if (!checkedRig.ok) throw new Error(JSON.stringify(checkedRig.diagnostics, null, 2));

for (const generatedPath of [
  join(packRoot, "assets"),
  join(packRoot, "images"),
  join(packRoot, "recipes"),
  join(packRoot, "thumbnails"),
  studioRoot
]) await rm(generatedPath, { recursive: true, force: true });
await mkdir(join(packRoot, "assets"), { recursive: true });
await mkdir(join(packRoot, "recipes"), { recursive: true });
await mkdir(studioRoot, { recursive: true });
const assets: AssetManifest[] = [];
for (const definition of definitions) {
  const asset = await buildAsset(definition, checkedRig.value);
  assets.push(asset);
  await writeFile(join(packRoot, "assets", `${safeKey(definition)}.json`), `${JSON.stringify(asset, null, 2)}\n`, "utf8");
}

const heroRecipes = [
  { id: "everyday-layered", name: "Everyday Layered", recipe: recipe("Everyday Layered", 1001, ["starter.base.standard", "starter.head.oval", "starter.nose.soft", "starter.eyes.round", "starter.brows.arched", "starter.mouth.soft", "starter.ears.round", "starter.hair.long-wavy", "starter.top.fitted-shirt", "starter.bottom.fitted-pants", "starter.outerwear.short-jacket", "starter.shoes.boots", "starter.accessory.glasses", "starter.accessory.sketchbook"], { "skin.base": "#B96F56", "hair.base": "#39345E", "garment.primary": "#4ED7E8", "garment.secondary": "#70456F", "accent.base": "#D0A34A" }) },
  { id: "silhouette-replacement", name: "Silhouette Replacement", recipe: recipe("Silhouette Replacement", 2002, ["starter.base.petite", "starter.head.soft-square", "starter.nose.bridge", "starter.eyes.almond", "starter.brows.straight", "starter.mouth.smirk", "starter.ears.pointed", "starter.hair.asymmetric", "starter.outfit.simple", "starter.outerwear.short-jacket", "starter.shoes.crystal-feet", "starter.body.crystal-arm", "starter.accessory.communicator"], { "skin.base": "#C98261", "hair.base": "#123F4D", "garment.primary": "#DD6E57", "garment.secondary": "#30283D", "crystal.base": "#61D8E4", "accent.base": "#E3AC54" }) },
  { id: "occlusion-stress", name: "Occlusion Stress", recipe: recipe("Occlusion Stress", 3003, ["starter.base.broad", "starter.head.round", "starter.nose.button", "starter.eyes.deep", "starter.brows.bold", "starter.mouth.smile", "starter.ears.fae", "starter.hair.coiled", "starter.top.sweater", "starter.bottom.wide-trousers", "starter.outerwear.long-coat", "starter.shoes.low", "starter.accessory.brim-hat", "starter.accessory.wings"], { "skin.base": "#714330", "hair.base": "#8A4A2C", "garment.primary": "#D4A73A", "garment.secondary": "#244B3C", "accent.base": "#54314D" }) }
];

const bodyProfiles = [
  { id: "standard", name: "Standard", recipe: recipe("Standard Profile", 11, ["starter.base.standard", "starter.head.oval", "starter.nose.soft", "starter.eyes.round", "starter.brows.soft", "starter.mouth.soft", "starter.ears.round", "starter.hair.cropped", "starter.top.fitted-shirt", "starter.bottom.fitted-pants", "starter.shoes.low"], { "skin.base": "#B96F56" }) },
  { id: "petite", name: "Petite", recipe: recipe("Petite Profile", 12, ["starter.base.petite", "starter.head.soft-square", "starter.nose.button", "starter.eyes.almond", "starter.brows.arched", "starter.mouth.smile", "starter.ears.pointed", "starter.hair.bob", "starter.outfit.simple", "starter.shoes.tall-boots"], { "skin.base": "#C98261" }) },
  { id: "broad", name: "Broad", recipe: recipe("Broad Profile", 13, ["starter.base.broad", "starter.head.round", "starter.nose.bridge", "starter.eyes.deep", "starter.brows.bold", "starter.mouth.firm", "starter.ears.fae", "starter.hair.coiled", "starter.top.sweater", "starter.bottom.wide-trousers", "starter.shoes.boots"], { "skin.base": "#714330" }) }
];

for (const hero of heroRecipes) await writeFile(join(packRoot, "recipes", `${hero.id}.json`), `${JSON.stringify(hero.recipe, null, 2)}\n`, "utf8");
const pack = {
  schemaVersion: SCHEMA_VERSION,
  id: "starter.character-creator",
  version,
  engine: ">=0.1.0 <1.0.0",
  rigFamilies: [checkedRig.value.id],
  assets: assets.map((asset) => ({ id: asset.id, manifest: `assets/${asset.id.slice("starter.".length).replaceAll(".", "-")}.json`, contentHash: asset.provenance.contentHash })),
  provenance: { authors: [author], license, source: null }
};
const parsedPack = parseAssetPack(pack);
if (!parsedPack.ok) throw new Error(JSON.stringify(parsedPack.diagnostics, null, 2));
const palettes = {
  skinTones: ["#F6D2B8", "#E9B995", "#D99A72", "#C98261", "#B96F56", "#96543F", "#714330", "#4A2A24"],
  notes: "Highlights move 12% toward warm ivory; shadows move 18% toward dark violet without hue-clipping."
};
const catalog = { rig: checkedRig.value, assets, heroRecipes, bodyProfiles, palettes };
await writeFile(join(packRoot, "rig.json"), `${JSON.stringify(checkedRig.value, null, 2)}\n`, "utf8");
await writeFile(join(packRoot, "pack.json"), `${JSON.stringify(parsedPack.value, null, 2)}\n`, "utf8");
await writeFile(join(packRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
await writeFile(join(packRoot, "palettes.json"), `${JSON.stringify(palettes, null, 2)}\n`, "utf8");
await writeFile(join(studioRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated ${assets.length} assets, ${heroRecipes.length} heroes, ${expressions.length} expressions, and ${rig.clips.reduce((total, clip) => total + clip.frames.length * clip.directions.length, 0)} directional animation requests.`);
