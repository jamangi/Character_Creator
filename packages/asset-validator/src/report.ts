import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ValidationReport } from "./types.js";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function reportHtml(report: ValidationReport): string {
  const levelRows = report.levels.map((level) => `<tr><th>${level.level}</th><td data-status="${level.status}">${level.status}</td><td>${level.errors}</td><td>${level.warnings}</td><td>${level.reviewRequired}</td></tr>`).join("");
  const findings = report.findings.length === 0
    ? "<p>No findings.</p>"
    : `<ol>${report.findings.map((finding) => `<li class="${finding.diagnostic.severity}"><strong>${finding.level} · ${finding.diagnostic.code}</strong><code>${escapeHtml(finding.diagnostic.path)}</code><p>${escapeHtml(finding.diagnostic.message)}</p></li>`).join("")}</ol>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.pack.id)} validator report</title><style>:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#0c0b13;color:#f4efff}body{max-width:72rem;margin:auto;padding:2rem}a{color:#7ee9ff}.summary{display:flex;gap:1rem;flex-wrap:wrap}.summary b,td,th{padding:.65rem 1rem;border:1px solid #403757}table{border-collapse:collapse;width:100%;margin:2rem 0}th{text-align:left}td[data-status=pass]{color:#83efb2}td[data-status=fail]{color:#ff879d}td[data-status=review]{color:#ffd479}ol{padding:0;list-style:none;display:grid;gap:1rem}li{padding:1rem;border:1px solid #403757;border-left:.35rem solid #ffd479;border-radius:.5rem;background:#171421}li.error{border-left-color:#ff647f}li.warning{border-left-color:#7ee9ff}code{display:block;color:#b8afc8;margin-top:.35rem}</style></head><body><p>Character Creator · seven-level validation</p><h1>${escapeHtml(report.pack.id)} <small>${escapeHtml(report.pack.version)}</small></h1><div class="summary"><b>${report.summary.errors} errors</b><b>${report.summary.warnings} warnings</b><b>${report.summary.reviewRequired} review-required</b></div><table><thead><tr><th>Level</th><th>Status</th><th>Errors</th><th>Warnings</th><th>Review</th></tr></thead><tbody>${levelRows}</tbody></table><h2>Findings</h2>${findings}<p>Generated ${escapeHtml(report.generatedAt)} · engine ${escapeHtml(report.engineVersion)}</p></body></html>`;
}

export async function writeValidationReport(report: ValidationReport, outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(join(outputDirectory, "index.html"), reportHtml(report), "utf8");
}
