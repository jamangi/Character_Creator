import { createCanvas, loadImage } from "@napi-rs/canvas";

export interface ContactSheetItem {
  label: string;
  source: string;
}

export async function createContactSheet(items: readonly ContactSheetItem[]): Promise<Buffer> {
  const cellWidth = 288;
  const cellHeight = 332;
  const columns = Math.min(4, Math.max(1, items.length));
  const rows = Math.ceil(items.length / columns);
  const canvas = createCanvas(columns * cellWidth, rows * cellHeight);
  const context = canvas.getContext("2d");
  context.fillStyle = "#0c0b13";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "16px sans-serif";
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    context.fillStyle = "#171421";
    context.fillRect(x + 8, y + 8, cellWidth - 16, cellHeight - 16);
    context.fillStyle = "#f4efff";
    context.fillText(item.label, x + 20, y + 30, cellWidth - 40);
    const image = await loadImage(item.source);
    const scale = Math.min((cellWidth - 40) / image.width, (cellHeight - 72) / image.height, 1);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, x + (cellWidth - image.width * scale) / 2, y + 48, image.width * scale, image.height * scale);
  }
  return canvas.toBuffer("image/png");
}
