/**
 * Legacy symbol id projection (`filename-type-name`).
 * @packageDocumentation
 */

import * as path from 'node:path';

/**
 * Generate the legacy symbol id used by Build enrichment and alias materialization.
 *
 * Format: `filename-type-symbolname`
 */
export function generateLegacyId(filePath: string, symbolName: string, symbolType: string): string {
  const fileBase = path
    .basename(filePath, path.extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  const normalizedSymbolName = symbolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${fileBase}-${normalizeLegacyKind(symbolType)}-${normalizedSymbolName}`
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Normalize syntax-extractor kinds to the legacy id vocabulary. */
export function normalizeLegacyKind(kind: string): string {
  return kind.toLowerCase();
}
