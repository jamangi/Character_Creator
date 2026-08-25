import type { Diagnostic, DiagnosticCode, DiagnosticSeverity } from "./types.js";

export function diagnostic(
  code: DiagnosticCode,
  path: string,
  message: string,
  options: {
    severity?: DiagnosticSeverity;
    assetId?: string;
    details?: Record<string, unknown>;
  } = {}
): Diagnostic {
  const result: Diagnostic = {
    code,
    severity: options.severity ?? "error",
    path,
    message
  };
  if (options.assetId !== undefined) result.assetId = options.assetId;
  if (options.details !== undefined) result.details = options.details;
  return result;
}

export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((left, right) =>
    left.path.localeCompare(right.path) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

