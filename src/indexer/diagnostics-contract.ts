/**
 * Canonical diagnostics plane contract (separate from node/edge facts).
 * @packageDocumentation
 */

export const CANONICAL_DIAGNOSTICS_CONTRACT_VERSION = '1.0' as const;

export type CanonicalDiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export type CanonicalDiagnosticCategory = 'compiler' | 'router' | 'graph-integrity' | 'impact';

/** One diagnostic stored with a canonical graph revision. */
export interface CanonicalDiagnostic {
  readonly id: string;
  readonly code?: string | number;
  readonly category: CanonicalDiagnosticCategory;
  readonly severity: CanonicalDiagnosticSeverity;
  readonly message: string;
  readonly file?: string;
  readonly startLine: number;
  readonly startCol?: number;
  readonly endLine?: number;
  readonly endCol?: number;
  readonly relatedNodeIds?: readonly string[];
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

/** Normalize router dump diagnostics into the canonical plane. */
export function normalizeRouterDiagnostics(
  values: readonly unknown[],
  _options: { rootDir: string } = { rootDir: process.cwd() }
): readonly CanonicalDiagnostic[] {
  const diagnostics: CanonicalDiagnostic[] = [];
  values.forEach((value, index) => {
    const record = asRecord(value, `diagnostics[${index}]`);
    const message = requireString(record.message, `diagnostics[${index}].message`);
    const severity = normalizeSeverity(record.severity, `diagnostics[${index}].severity`);
    const startLine = requirePositiveLine(
      record.startLine ?? record.line,
      `diagnostics[${index}].startLine`
    );
    const file = optionalString(record.file ?? record.filePath);
    const code = optionalDiagnosticCode(record.code, `diagnostics[${index}].code`);
    const relatedNodeIds = mergeRelatedNodeIds(record.relatedNodeIds, record.node);
    const id = optionalString(record.id) ?? stableDiagnosticId({ message, file, startLine, index });

    diagnostics.push(
      Object.freeze({
        id,
        ...(code !== undefined ? { code } : {}),
        category: normalizeCategory(record.category),
        severity,
        message,
        ...(file ? { file } : {}),
        startLine,
        ...(optionalPositiveInt(record.startCol ?? record.column) !== undefined
          ? { startCol: optionalPositiveInt(record.startCol ?? record.column) }
          : {}),
        ...(optionalPositiveInt(record.endLine) !== undefined
          ? { endLine: optionalPositiveInt(record.endLine) }
          : {}),
        ...(optionalPositiveInt(record.endCol) !== undefined
          ? { endCol: optionalPositiveInt(record.endCol) }
          : {}),
        ...(relatedNodeIds ? { relatedNodeIds } : {}),
        ...(copyUnknownFields(record) ? { producerFields: copyUnknownFields(record) } : {}),
      })
    );
  });

  return Object.freeze(
    diagnostics.sort(
      (left, right) =>
        compareText(left.file ?? '', right.file ?? '') ||
        left.startLine - right.startLine ||
        compareText(left.id, right.id)
    )
  );
}

function stableDiagnosticId(parts: {
  message: string;
  file?: string;
  startLine: number;
  index: number;
}): string {
  return `router-diagnostic:${parts.file ?? '<unknown>'}:${parts.startLine}:${parts.index}:${parts.message}`;
}

function normalizeSeverity(value: unknown, field: string): CanonicalDiagnosticSeverity {
  if (value === undefined) return 'error';
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'error' || lower === 'warning' || lower === 'info' || lower === 'hint') {
      return lower;
    }
  }
  if (typeof value === 'number') {
    if (value <= 1) return 'error';
    if (value === 2) return 'warning';
    if (value === 3) return 'info';
    return 'hint';
  }
  throw new Error(`${field} must be a supported diagnostic severity`);
}

function optionalDiagnosticCode(value: unknown, field: string): string | number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && value.trim() !== '') return value;
  throw new Error(`${field} must be a non-negative integer or non-empty string`);
}

function mergeRelatedNodeIds(
  relatedNodeIds: unknown,
  producerNode: unknown
): readonly string[] | undefined {
  const explicit = optionalStringArray(relatedNodeIds) ?? [];
  const node = optionalString(producerNode);
  const merged = [...new Set(node ? [...explicit, node] : explicit)].sort(compareText);
  return merged.length > 0 ? Object.freeze(merged) : undefined;
}

function normalizeCategory(value: unknown): CanonicalDiagnosticCategory {
  if (
    value === 'compiler' ||
    value === 'router' ||
    value === 'graph-integrity' ||
    value === 'impact'
  ) {
    return value;
  }
  return 'compiler';
}

function copyUnknownFields(record: Record<string, unknown>): Record<string, unknown> | undefined {
  const reserved = new Set([
    'id',
    'code',
    'category',
    'severity',
    'message',
    'file',
    'filePath',
    'startLine',
    'line',
    'startCol',
    'column',
    'endLine',
    'endCol',
    'relatedNodeIds',
    'node',
  ]);
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!reserved.has(key)) copy[key] = value;
  }
  return Object.keys(copy).length > 0 ? Object.freeze(copy) : undefined;
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function requirePositiveLine(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a one-based line number`);
  }
  return value;
}

function optionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error('Diagnostic coordinate must be a positive integer');
  }
  return value;
}

function optionalStringArray(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error('relatedNodeIds must be an array of strings');
  }
  return Object.freeze([...value]);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
