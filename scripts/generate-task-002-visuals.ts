import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createCanvas,
  loadImage,
  type Canvas,
  type SKRSContext2D
} from "@napi-rs/canvas";
import {
  resolveCharacter,
  type RenderRequest
} from "../packages/core/dist/index.js";
import {
  parseAssetManifest,
  parseCharacterRecipe,
  parseRig,
  type AssetManifest,
  type CharacterRecipe,
  type RigDefinition
} from "../packages/schema/dist/index.js";
import {
  renderResolvedScene,
  type CanvasLike,
  type CanvasImageLike
} from "../packages/renderer-canvas/dist/index.js";

const root = process.cwd();
const fragmentRoot = join(root, "fixtures", "visual", "task-002", "fragments");
const thumbnailRoot = join(root, "fixtures", "visual", "task-002", "thumbnails");
const siteRoot = join(root, "site", "validation", "task-002");
const renderRoot = join(siteRoot, "renders");
const sourceCommit =
  process.env["SOURCE_COMMIT"] ??
  execFileSync(
    "git",
    ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "rev-parse", "--short", "HEAD"],
    { cwd: root, encoding: "utf8" }
  ).trim();

const colors = {
  ink: "#18162b",
  skin: "#d79a83",
  skinShadow: "#a86665",
  hair: "#3b335c",
  hairHighlight: "#8878ff",
  shirt: "#4ed7e8",
  shirtShadow: "#278a9c",
  coat: "#6658b5",
  coatShadow: "#423873",
  coral: "#ff7d73",
  crystal: "#79e8ff",
  crystalLight: "#d9fbff",
  pants: "#242744",
  boot: "#302438"
} as const;

async function loadJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, relativePath), "utf8"));
}

async function loadFixtures(): Promise<{
  rig: RigDefinition;
  recipe: CharacterRecipe;
  assets: AssetManifest[];
}> {
  const rigResult = parseRig(await loadJson("fixtures/valid/rig/starter-humanoid.json"));
  const recipeResult = parseCharacterRecipe(
    await loadJson("fixtures/valid/recipes/proof-character.json")
  );
  if (!rigResult.ok || !recipeResult.ok) throw new Error("Contract fixtures failed to parse");
  const filenames = [
    "base-standard.json",
    "body-arm-left-crystal.json",
    "hair-long-wave.json",
    "outerwear-long-coat.json",
    "top-simple-shirt.json"
  ];
  const assets: AssetManifest[] = [];
  for (const filename of filenames) {
    const result = parseAssetManifest(
      await loadJson(`fixtures/valid/assets/${filename}`),
      rigResult.value
    );
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
    assets.push(result.value);
  }
  return { rig: rigResult.value, recipe: recipeResult.value, assets };
}

async function saveCanvas(canvas: Canvas, path: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, await canvas.encode("png"));
}

function outlinedShape(
  context: SKRSContext2D,
  fill: string,
  lineWidth: number,
  draw: () => void
): void {
  context.fillStyle = fill;
  context.strokeStyle = colors.ink;
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  draw();
  context.fill();
  context.stroke();
}

function portraitFragment(name: string): Canvas {
  const canvas = createCanvas(256, 256);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 256, 256);

  if (name === "hair-back") {
    outlinedShape(context, colors.hair, 5, () => {
      context.beginPath();
      context.moveTo(70, 48);
      context.bezierCurveTo(28, 91, 42, 221, 82, 248);
      context.bezierCurveTo(99, 226, 108, 206, 128, 205);
      context.bezierCurveTo(151, 206, 166, 230, 186, 248);
      context.bezierCurveTo(217, 203, 225, 91, 184, 47);
      context.bezierCurveTo(155, 18, 99, 18, 70, 48);
      context.closePath();
    });
    context.strokeStyle = colors.hairHighlight;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(65, 82);
    context.bezierCurveTo(49, 133, 65, 190, 82, 218);
    context.moveTo(190, 79);
    context.bezierCurveTo(211, 133, 191, 192, 177, 220);
    context.stroke();
  } else if (name === "base-core") {
    outlinedShape(context, colors.skin, 4, () => {
      context.beginPath();
      context.ellipse(128, 91, 49, 58, 0, 0, Math.PI * 2);
      context.closePath();
    });
    outlinedShape(context, colors.skin, 4, () => {
      context.beginPath();
      context.moveTo(113, 142);
      context.lineTo(108, 165);
      context.bezierCurveTo(74, 170, 59, 205, 55, 256);
      context.lineTo(201, 256);
      context.bezierCurveTo(197, 205, 182, 170, 148, 165);
      context.lineTo(143, 142);
      context.closePath();
    });
    context.fillStyle = colors.ink;
    context.beginPath();
    context.ellipse(111, 92, 6, 8, 0, 0, Math.PI * 2);
    context.ellipse(145, 92, 6, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = colors.skinShadow;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(128, 111, 15, 0.15 * Math.PI, 0.85 * Math.PI);
    context.stroke();
  } else if (name === "shirt") {
    outlinedShape(context, colors.shirt, 4, () => {
      context.beginPath();
      context.moveTo(101, 164);
      context.quadraticCurveTo(128, 181, 155, 164);
      context.lineTo(181, 256);
      context.lineTo(75, 256);
      context.closePath();
    });
    context.fillStyle = colors.shirtShadow;
    context.fillRect(82, 236, 92, 20);
  } else if (name === "coat-tail") {
    outlinedShape(context, colors.coatShadow, 4, () => {
      context.beginPath();
      context.moveTo(75, 177);
      context.lineTo(46, 256);
      context.lineTo(104, 256);
      context.lineTo(128, 192);
      context.lineTo(152, 256);
      context.lineTo(210, 256);
      context.lineTo(181, 177);
      context.closePath();
    });
  } else if (name === "coat-main") {
    outlinedShape(context, colors.coat, 4, () => {
      context.beginPath();
      context.moveTo(99, 162);
      context.lineTo(65, 177);
      context.lineTo(52, 254);
      context.lineTo(86, 256);
      context.lineTo(103, 194);
      context.lineTo(128, 218);
      context.lineTo(153, 194);
      context.lineTo(170, 256);
      context.lineTo(204, 254);
      context.lineTo(191, 177);
      context.lineTo(157, 162);
      context.lineTo(128, 193);
      context.closePath();
    });
    context.strokeStyle = colors.coral;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(99, 164);
    context.lineTo(128, 193);
    context.lineTo(157, 164);
    context.stroke();
  } else if (name === "hair-front") {
    outlinedShape(context, colors.hair, 4, () => {
      context.beginPath();
      context.moveTo(75, 63);
      context.bezierCurveTo(86, 20, 171, 19, 184, 63);
      context.lineTo(173, 103);
      context.lineTo(154, 73);
      context.lineTo(142, 118);
      context.lineTo(124, 70);
      context.lineTo(106, 112);
      context.lineTo(94, 74);
      context.lineTo(81, 105);
      context.closePath();
    });
  } else if (name === "crystal-arm-left") {
    outlinedShape(context, colors.crystal, 4, () => {
      context.beginPath();
      context.moveTo(183, 178);
      context.lineTo(201, 188);
      context.lineTo(222, 236);
      context.lineTo(211, 253);
      context.lineTo(193, 240);
      context.lineTo(174, 195);
      context.closePath();
    });
    context.strokeStyle = colors.crystalLight;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(185, 185);
    context.lineTo(213, 239);
    context.moveTo(197, 188);
    context.lineTo(194, 238);
    context.stroke();
  }
  return canvas;
}

function fullBodyFragment(name: string): Canvas {
  const canvas = createCanvas(256, 384);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 256, 384);

  if (name === "hair-back") {
    outlinedShape(context, colors.hair, 4, () => {
      context.beginPath();
      context.moveTo(93, 30);
      context.bezierCurveTo(54, 58, 60, 187, 91, 214);
      context.lineTo(113, 174);
      context.lineTo(143, 174);
      context.lineTo(165, 214);
      context.bezierCurveTo(197, 172, 200, 59, 163, 30);
      context.bezierCurveTo(145, 15, 111, 15, 93, 30);
      context.closePath();
    });
    context.strokeStyle = colors.hairHighlight;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(82, 64);
    context.quadraticCurveTo(68, 145, 94, 190);
    context.moveTo(174, 64);
    context.quadraticCurveTo(188, 145, 162, 190);
    context.stroke();
  } else if (name === "coat-tail") {
    outlinedShape(context, colors.coatShadow, 4, () => {
      context.beginPath();
      context.moveTo(89, 164);
      context.lineTo(54, 347);
      context.lineTo(105, 321);
      context.lineTo(128, 212);
      context.lineTo(151, 321);
      context.lineTo(202, 347);
      context.lineTo(167, 164);
      context.closePath();
    });
    context.strokeStyle = colors.coral;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(63, 331);
    context.lineTo(103, 310);
    context.moveTo(153, 310);
    context.lineTo(193, 331);
    context.stroke();
  } else if (name === "base-core") {
    outlinedShape(context, colors.skin, 4, () => {
      context.beginPath();
      context.ellipse(128, 75, 38, 46, 0, 0, Math.PI * 2);
      context.closePath();
    });
    outlinedShape(context, colors.skin, 4, () => {
      context.beginPath();
      context.moveTo(103, 118);
      context.lineTo(83, 139);
      context.lineTo(66, 231);
      context.lineTo(83, 238);
      context.lineTo(100, 169);
      context.lineTo(110, 240);
      context.lineTo(101, 347);
      context.lineTo(121, 347);
      context.lineTo(128, 252);
      context.lineTo(135, 347);
      context.lineTo(155, 347);
      context.lineTo(146, 240);
      context.lineTo(153, 127);
      context.closePath();
    });
    context.fillStyle = colors.pants;
    context.beginPath();
    context.moveTo(103, 225);
    context.lineTo(153, 225);
    context.lineTo(158, 344);
    context.lineTo(135, 344);
    context.lineTo(128, 256);
    context.lineTo(121, 344);
    context.lineTo(98, 344);
    context.closePath();
    context.fill();
    context.fillStyle = colors.boot;
    context.fillRect(96, 334, 28, 36);
    context.fillRect(132, 334, 28, 36);
    context.fillStyle = colors.ink;
    context.beginPath();
    context.ellipse(115, 77, 4.5, 6, 0, 0, Math.PI * 2);
    context.ellipse(141, 77, 4.5, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = colors.skinShadow;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(128, 93, 11, 0.15 * Math.PI, 0.85 * Math.PI);
    context.stroke();
  } else if (name === "base-arm-left") {
    outlinedShape(context, colors.skin, 4, () => {
      context.beginPath();
      context.moveTo(153, 128);
      context.lineTo(171, 137);
      context.lineTo(190, 225);
      context.lineTo(174, 233);
      context.lineTo(153, 169);
      context.closePath();
    });
  } else if (name === "shirt") {
    outlinedShape(context, colors.shirt, 4, () => {
      context.beginPath();
      context.moveTo(101, 120);
      context.quadraticCurveTo(128, 136, 155, 120);
      context.lineTo(153, 225);
      context.lineTo(103, 225);
      context.closePath();
    });
    context.fillStyle = colors.shirtShadow;
    context.fillRect(104, 208, 48, 17);
  } else if (name === "coat-main") {
    outlinedShape(context, colors.coat, 4, () => {
      context.beginPath();
      context.moveTo(99, 121);
      context.lineTo(81, 137);
      context.lineTo(64, 225);
      context.lineTo(86, 235);
      context.lineTo(101, 167);
      context.lineTo(107, 258);
      context.lineTo(126, 231);
      context.lineTo(149, 258);
      context.lineTo(155, 166);
      context.lineTo(171, 139);
      context.lineTo(157, 121);
      context.lineTo(128, 153);
      context.closePath();
    });
    context.strokeStyle = colors.coral;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(99, 123);
    context.lineTo(128, 153);
    context.lineTo(157, 123);
    context.moveTo(107, 257);
    context.lineTo(126, 231);
    context.lineTo(149, 257);
    context.stroke();
  } else if (name === "hair-front") {
    outlinedShape(context, colors.hair, 4, () => {
      context.beginPath();
      context.moveTo(89, 54);
      context.bezierCurveTo(96, 16, 159, 15, 168, 53);
      context.lineTo(159, 88);
      context.lineTo(145, 61);
      context.lineTo(136, 103);
      context.lineTo(123, 59);
      context.lineTo(108, 97);
      context.lineTo(100, 62);
      context.lineTo(91, 88);
      context.closePath();
    });
  } else if (name === "crystal-arm-left") {
    outlinedShape(context, colors.crystal, 4, () => {
      context.beginPath();
      context.moveTo(154, 129);
      context.lineTo(171, 135);
      context.lineTo(193, 218);
      context.lineTo(181, 244);
      context.lineTo(167, 226);
      context.lineTo(151, 164);
      context.closePath();
    });
    context.strokeStyle = colors.crystalLight;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(158, 140);
    context.lineTo(185, 224);
    context.moveTo(169, 137);
    context.lineTo(169, 222);
    context.lineTo(190, 218);
    context.stroke();
  }
  return canvas;
}

function spriteFragment(name: string): Canvas {
  const canvas = createCanvas(96, 96);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 96, 96);
  const rect = (x: number, y: number, width: number, height: number, fill: string) => {
    context.fillStyle = colors.ink;
    context.fillRect(x - 2, y - 2, width + 4, height + 4);
    context.fillStyle = fill;
    context.fillRect(x, y, width, height);
  };

  if (name === "hair-back") {
    rect(25, 13, 46, 49, colors.hair);
    context.fillStyle = colors.hairHighlight;
    context.fillRect(29, 18, 4, 38);
    context.fillRect(63, 18, 4, 38);
  } else if (name === "coat-tail") {
    context.fillStyle = colors.ink;
    context.beginPath();
    context.moveTo(27, 45);
    context.lineTo(15, 88);
    context.lineTo(41, 76);
    context.lineTo(48, 52);
    context.lineTo(55, 76);
    context.lineTo(81, 88);
    context.lineTo(69, 45);
    context.closePath();
    context.fill();
    context.fillStyle = colors.coatShadow;
    context.beginPath();
    context.moveTo(29, 47);
    context.lineTo(19, 83);
    context.lineTo(39, 73);
    context.lineTo(48, 55);
    context.lineTo(57, 73);
    context.lineTo(77, 83);
    context.lineTo(67, 47);
    context.closePath();
    context.fill();
  } else if (name === "base-core") {
    rect(35, 18, 26, 26, colors.skin);
    rect(35, 44, 26, 27, colors.skin);
    rect(24, 46, 12, 31, colors.skin);
    rect(36, 68, 10, 22, colors.pants);
    rect(51, 68, 10, 22, colors.pants);
    context.fillStyle = colors.ink;
    context.fillRect(41, 28, 3, 3);
    context.fillRect(52, 28, 3, 3);
    context.fillStyle = colors.coral;
    context.fillRect(45, 36, 7, 2);
  } else if (name === "base-arm-left") {
    rect(61, 46, 12, 31, colors.skin);
  } else if (name === "shirt") {
    rect(36, 45, 24, 22, colors.shirt);
    context.fillStyle = colors.shirtShadow;
    context.fillRect(36, 62, 24, 5);
  } else if (name === "coat-main") {
    context.fillStyle = colors.coat;
    context.fillRect(27, 45, 10, 32);
    context.fillRect(60, 45, 10, 32);
    context.fillRect(37, 45, 7, 26);
    context.fillRect(53, 45, 7, 26);
    context.fillStyle = colors.coral;
    context.fillRect(37, 45, 3, 26);
    context.fillRect(57, 45, 3, 26);
  } else if (name === "hair-front") {
    context.fillStyle = colors.hair;
    context.fillRect(31, 14, 34, 13);
    context.fillRect(32, 25, 8, 12);
    context.fillRect(46, 23, 7, 15);
    context.fillRect(58, 25, 7, 12);
  } else if (name === "crystal-arm-left") {
    context.fillStyle = colors.ink;
    context.beginPath();
    context.moveTo(62, 45);
    context.lineTo(73, 49);
    context.lineTo(78, 72);
    context.lineTo(68, 82);
    context.lineTo(61, 70);
    context.closePath();
    context.fill();
    context.fillStyle = colors.crystal;
    context.beginPath();
    context.moveTo(64, 48);
    context.lineTo(71, 51);
    context.lineTo(75, 71);
    context.lineTo(68, 78);
    context.lineTo(64, 69);
    context.closePath();
    context.fill();
    context.strokeStyle = colors.crystalLight;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(65, 52);
    context.lineTo(73, 70);
    context.lineTo(66, 69);
    context.stroke();
  }
  return canvas;
}

function spriteLeftFragment(name: string): Canvas {
  const canvas = createCanvas(96, 96);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const front = spriteFragment(name);
  context.drawImage(front, 17, 0, 62, 96);
  if (name === "base-core") {
    context.fillStyle = colors.skin;
    context.fillRect(42, 20, 16, 22);
    context.fillRect(56, 29, 5, 6);
    context.fillStyle = colors.ink;
    context.fillRect(52, 28, 3, 3);
    context.fillStyle = colors.coral;
    context.fillRect(54, 37, 5, 2);
  }
  if (name === "hair-back") {
    context.fillStyle = colors.ink;
    context.beginPath();
    context.moveTo(56, 24);
    context.lineTo(78, 29);
    context.lineTo(75, 40);
    context.lineTo(56, 36);
    context.closePath();
    context.fill();
    context.fillStyle = colors.hair;
    context.beginPath();
    context.moveTo(58, 27);
    context.lineTo(74, 31);
    context.lineTo(72, 36);
    context.lineTo(58, 34);
    context.closePath();
    context.fill();
    context.fillStyle = colors.hairHighlight;
    context.fillRect(69, 31, 3, 5);
  }
  if (name === "coat-tail") {
    context.fillStyle = colors.ink;
    context.beginPath();
    context.moveTo(55, 51);
    context.lineTo(83, 82);
    context.lineTo(55, 74);
    context.closePath();
    context.fill();
    context.fillStyle = colors.coatShadow;
    context.beginPath();
    context.moveTo(57, 54);
    context.lineTo(78, 78);
    context.lineTo(57, 71);
    context.closePath();
    context.fill();
  }
  return canvas;
}

async function generateFragments(): Promise<void> {
  const names = [
    "hair-back",
    "base-core",
    "shirt",
    "coat-tail",
    "coat-main",
    "hair-front",
    "crystal-arm-left"
  ];
  for (const name of names) {
    await saveCanvas(portraitFragment(name), join(fragmentRoot, "portrait", `${name}.png`));
    await saveCanvas(spriteFragment(name), join(fragmentRoot, "sprite", `${name}.png`));
    await saveCanvas(spriteLeftFragment(name), join(fragmentRoot, "sprite-left", `${name}.png`));
    await saveCanvas(fullBodyFragment(name), join(fragmentRoot, "full-body", `${name}.png`));
  }
  await saveCanvas(
    fullBodyFragment("base-arm-left"),
    join(fragmentRoot, "full-body", "base-arm-left.png")
  );
  await saveCanvas(
    spriteFragment("base-arm-left"),
    join(fragmentRoot, "sprite", "base-arm-left.png")
  );
  await saveCanvas(
    spriteLeftFragment("base-arm-left"),
    join(fragmentRoot, "sprite-left", "base-arm-left.png")
  );
}

async function renderProof(
  rig: RigDefinition,
  recipe: CharacterRecipe,
  assets: AssetManifest[],
  request: RenderRequest,
  outputName: string
): Promise<Canvas> {
  const scene = resolveCharacter({ recipe, rig, catalog: assets, request });
  const errors = scene.diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0) throw new Error(JSON.stringify(errors, null, 2));
  const canvas = createCanvas(scene.width, scene.height);
  const result = await renderResolvedScene(scene, {
    canvas: canvas as unknown as CanvasLike,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as CanvasLike,
    loadImage: async (source) =>
      (await loadImage(join(root, source))) as unknown as CanvasImageLike
  });
  if (result.diagnostics.some((item) => item.severity === "error")) {
    throw new Error(JSON.stringify(result.diagnostics, null, 2));
  }
  await saveCanvas(canvas, join(renderRoot, `${outputName}.png`));
  return canvas;
}

async function compositeIsolated(
  outputName: string,
  sources: string[],
  width: number,
  height: number
): Promise<Canvas> {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  for (const source of sources) context.drawImage(await loadImage(join(root, source)), 0, 0);
  await saveCanvas(canvas, join(renderRoot, `${outputName}.png`));
  return canvas;
}

function drawChecker(context: SKRSContext2D, x: number, y: number, width: number, height: number): void {
  const size = 12;
  for (let row = 0; row < Math.ceil(height / size); row += 1) {
    for (let column = 0; column < Math.ceil(width / size); column += 1) {
      context.fillStyle = (row + column) % 2 === 0 ? "#242139" : "#1b182c";
      context.fillRect(x + column * size, y + row * size, size, size);
    }
  }
}

async function contactSheet(
  panels: Array<{ label: string; image: Canvas; scale?: number }>,
  recipe: CharacterRecipe,
  assets: AssetManifest[]
): Promise<void> {
  const canvas = createCanvas(1320, 900);
  const context = canvas.getContext("2d");
  context.fillStyle = "#0d0b17";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f6f0e7";
  context.font = "700 34px sans-serif";
  context.fillText("TASK-002 · Composition vertical slice", 48, 56);
  context.fillStyle = "#aaa6b8";
  context.font = "18px sans-serif";
  context.fillText(
    `${recipe.metadata?.["name"] ?? "Proof recipe"} · ${assets.length} assets · engine 0.1.0`,
    48,
    88
  );

  const positions = [
    [48, 130, 278, 410],
    [350, 130, 278, 410],
    [652, 130, 278, 410],
    [954, 130, 278, 410],
    [48, 590, 380, 245],
    [470, 590, 380, 245],
    [892, 590, 340, 245]
  ] as const;

  panels.forEach((panel, index) => {
    const position = positions[index];
    if (position === undefined) return;
    const [x, y, width, height] = position;
    context.fillStyle = "#171426";
    context.strokeStyle = "#34304a";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, width, height, 16);
    context.fill();
    context.stroke();
    context.save();
    context.beginPath();
    context.roundRect(x + 14, y + 48, width - 28, height - 64, 10);
    context.clip();
    drawChecker(context, x + 14, y + 48, width - 28, height - 64);
    const availableWidth = width - 42;
    const availableHeight = height - 82;
    const scale = panel.scale ?? Math.min(
      availableWidth / panel.image.width,
      availableHeight / panel.image.height
    );
    const drawWidth = panel.image.width * scale;
    const drawHeight = panel.image.height * scale;
    context.imageSmoothingEnabled = panel.image.width > 256;
    context.drawImage(
      panel.image,
      x + (width - drawWidth) / 2,
      y + 55 + (availableHeight - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    context.restore();
    context.fillStyle = "#4ed7e8";
    context.font = "700 15px sans-serif";
    context.fillText(panel.label, x + 16, y + 30);
  });
  await saveCanvas(canvas, join(siteRoot, "contact-sheet.png"));
}

async function createThumbnails(): Promise<void> {
  const mappings: Array<[string, string[]]> = [
    ["base-standard", ["base-core"]],
    ["arm-crystal", ["crystal-arm-left"]],
    ["hair-long-wave", ["hair-back", "hair-front"]],
    ["outerwear-long-coat", ["coat-tail", "coat-main"]],
    ["top-simple-shirt", ["shirt"]]
  ];
  for (const [name, fragmentNames] of mappings) {
    const canvas = createCanvas(128, 128);
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 128, 128);
    for (const fragmentName of fragmentNames) {
      const image = await loadImage(join(fragmentRoot, "portrait", `${fragmentName}.png`));
      context.drawImage(image, 0, 0, 128, 128);
    }
    await saveCanvas(canvas, join(thumbnailRoot, `${name}.png`));
  }
}

async function createReferencePreview(): Promise<void> {
  const source = await loadImage(
    join(root, "fixtures", "visual", "task-002", "reference", "proof-character-concept.png")
  );
  const canvas = createCanvas(512, 768);
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0, 512, 768);
  await saveCanvas(canvas, join(siteRoot, "reference-concept.png"));
}

async function writeMetadata(
  rig: RigDefinition,
  recipe: CharacterRecipe,
  assets: AssetManifest[]
): Promise<void> {
  const provenance = {
    task: "TASK-002",
    generatedAt: "2026-08-25",
    sourceCommit,
    engineVersion: "0.1.0",
    schemaVersion: "0.1.0",
    rig: { id: rig.id, version: rig.version },
    recipe: recipe.metadata?.["name"] ?? "Vertical Slice Hero",
    recipeHash: createHash("sha256").update(JSON.stringify(recipe)).digest("hex"),
    assets: assets.map((asset) => ({ id: asset.id, version: asset.version })),
    outputs: [
      { file: "renders/portrait-front.png", profile: "portrait", view: "front" },
      { file: "renders/full-body-front.png", profile: "full-body", view: "front" },
      { file: "renders/sprite-front-idle-center.png", profile: "sprite", view: "front", clip: "idle", frame: "center" },
      { file: "renders/sprite-left-idle-center.png", profile: "sprite", view: "left", clip: "idle", frame: "center" }
    ],
    knownLimitations: [
      "Proof artwork is intentionally small and geometric rather than production catalog art.",
      "Task 002 proves idle sprite resolution only; complete clips belong to Task 006.",
      "Palette metadata resolves into draw items; mask-based recoloring is deferred to the validator/starter-pack work."
    ]
  };
  await writeFile(join(siteRoot, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
}

async function main(): Promise<void> {
  await mkdir(renderRoot, { recursive: true });
  await generateFragments();
  await createThumbnails();
  await createReferencePreview();
  const { rig, recipe, assets } = await loadFixtures();
  const portrait = await renderProof(
    rig,
    recipe,
    assets,
    { profile: "portrait", view: "front", expression: "neutral" },
    "portrait-front"
  );
  const fullBody = await renderProof(
    rig,
    recipe,
    assets,
    { profile: "full-body", view: "front", expression: "neutral" },
    "full-body-front"
  );
  const spriteFront = await renderProof(
    rig,
    recipe,
    assets,
    { profile: "sprite", view: "front", clip: "idle", frame: "center" },
    "sprite-front-idle-center"
  );
  const spriteLeft = await renderProof(
    rig,
    recipe,
    assets,
    { profile: "sprite", view: "left", clip: "idle", frame: "center" },
    "sprite-left-idle-center"
  );
  const hair = await compositeIsolated(
    "isolated-hair",
    [
      "fixtures/visual/task-002/fragments/full-body/hair-back.png",
      "fixtures/visual/task-002/fragments/full-body/hair-front.png"
    ],
    256,
    384
  );
  const coat = await compositeIsolated(
    "isolated-coat",
    [
      "fixtures/visual/task-002/fragments/full-body/coat-tail.png",
      "fixtures/visual/task-002/fragments/full-body/coat-main.png"
    ],
    256,
    384
  );
  const replacement = await compositeIsolated(
    "isolated-replacement",
    ["fixtures/visual/task-002/fragments/full-body/crystal-arm-left.png"],
    256,
    384
  );
  await contactSheet(
    [
      { label: "PORTRAIT · front · neutral", image: portrait },
      { label: "FULL-BODY · front · neutral", image: fullBody },
      { label: "SPRITE · front · idle.center", image: spriteFront, scale: 3 },
      { label: "SPRITE · left · idle.center", image: spriteLeft, scale: 3 },
      { label: "ISOLATED · two-plane hair", image: hair },
      { label: "ISOLATED · tailed coat", image: coat },
      { label: "ISOLATED · left-arm replacement", image: replacement }
    ],
    recipe,
    assets
  );
  await writeMetadata(rig, recipe, assets);
}

await main();
