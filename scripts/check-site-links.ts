import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = process.cwd();
const site = join(root, "site");

async function filesBelow(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(child));
    else if (entry.isFile()) result.push(child);
  }
  return result;
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

const failures: Array<{ page: string; reference: string; resolved: string }> = [];
for (const page of (await filesBelow(site)).filter((path) => extname(path) === ".html")) {
  const html = await readFile(page, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1] ?? "";
    if (reference === "" || reference.startsWith("#") || /^[a-z]+:/i.test(reference) || reference.startsWith("//")) continue;
    const pathname = reference.split(/[?#]/, 1)[0] ?? "";
    let target = normalize(resolve(dirname(page), pathname));
    if (!target.toLocaleLowerCase().startsWith(site.toLocaleLowerCase())) continue;
    if (pathname.endsWith("/")) target = join(target, "index.html");
    if (!await exists(target)) failures.push({ page: relative(site, page).replaceAll("\\", "/"), reference, resolved: relative(site, target).replaceAll("\\", "/") });
  }
}
if (failures.length > 0) throw new Error(`Broken internal Pages links:\n${JSON.stringify(failures, null, 2)}`);
console.log(`Internal Pages link check passed across ${(await filesBelow(site)).filter((path) => extname(path) === ".html").length} HTML pages.`);
