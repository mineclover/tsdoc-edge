/**
 * Canonical-to-LSP diagnostic boundary helpers.
 * @packageDocumentation
 */

import {
  DiagnosticSeverity,
  type Diagnostic as LanguageServerDiagnostic,
} from 'vscode-languageserver/node';
import type { CanonicalDiagnostic } from '../indexer';

/** Diagnostic information exposed by {@link TsdocEdgeService}. */
export interface DiagnosticInfo {
  /** One-based start line. */
  readonly line: number;
  /** One-based start column when supplied by the producer. */
  readonly startCol?: number;
  /** One-based end line when supplied by the producer. */
  readonly endLine?: number;
  /** One-based end column when supplied by the producer. */
  readonly endCol?: number;
  /** Stable compiler, router, or lint diagnostic code. */
  readonly code?: string | number;
  /** Opaque, immutable metadata used by client CodeActions. */
  readonly data?: unknown;
  /** Human-readable description of the issue. */
  readonly message: string;
  /** LSP severity level. */
  readonly severity: DiagnosticSeverity;
}

/** Preserve canonical diagnostic coordinates and codes at the service boundary. */
export function mapCanonicalDiagnostic(diagnostic: CanonicalDiagnostic): DiagnosticInfo {
  const severityByCategory: Record<CanonicalDiagnostic['severity'], DiagnosticSeverity> = {
    error: DiagnosticSeverity.Error,
    warning: DiagnosticSeverity.Warning,
    info: DiagnosticSeverity.Information,
    hint: DiagnosticSeverity.Hint,
  };
  return {
    line: diagnostic.startLine,
    ...(diagnostic.startCol !== undefined ? { startCol: diagnostic.startCol } : {}),
    ...(diagnostic.endLine !== undefined ? { endLine: diagnostic.endLine } : {}),
    ...(diagnostic.endCol !== undefined ? { endCol: diagnostic.endCol } : {}),
    ...(diagnostic.code !== undefined ? { code: diagnostic.code } : {}),
    message: diagnostic.message,
    severity: severityByCategory[diagnostic.severity],
  };
}

/** Convert one-based service coordinates into a zero-based LSP diagnostic range. */
export function toLanguageServerDiagnostic(
  diagnostic: DiagnosticInfo,
  source = 'tsdoc-edge'
): LanguageServerDiagnostic {
  const startLine = Math.max(0, diagnostic.line - 1);
  const startCharacter = Math.max(0, (diagnostic.startCol ?? 1) - 1);
  const endLine = Math.max(startLine, (diagnostic.endLine ?? diagnostic.line) - 1);
  const explicitEndCharacter =
    diagnostic.endCol !== undefined ? Math.max(0, diagnostic.endCol - 1) : undefined;
  const endCharacter =
    explicitEndCharacter !== undefined
      ? endLine === startLine
        ? Math.max(startCharacter, explicitEndCharacter)
        : explicitEndCharacter
      : Number.MAX_SAFE_INTEGER;

  return {
    severity: diagnostic.severity,
    range: {
      start: { line: startLine, character: startCharacter },
      end: { line: endLine, character: endCharacter },
    },
    message: diagnostic.message,
    source,
    ...(diagnostic.code !== undefined ? { code: diagnostic.code } : {}),
    ...(diagnostic.data !== undefined ? { data: diagnostic.data } : {}),
  };
}
