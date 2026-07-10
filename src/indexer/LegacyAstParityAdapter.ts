/**
 * Legacy AST extractor parity against canonical graph revisions.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { IncrementalBuilder } from '../lsp/incremental-builder';
import type { CanonicalGraphNode, CanonicalProjectGraph } from './contracts';
import { generateLegacyId } from './legacy-id';
import { materializeAliases } from './symbol-alias';

export interface LegacyParityMismatch {
  readonly filePath: string;
  readonly canonicalId: string;
  readonly legacyId: string;
  readonly reason: string;
}

export interface LegacyParityResult {
  readonly matched: number;
  readonly mismatches: readonly LegacyParityMismatch[];
}

/**
 * Verify that TS5 syntax extraction and legacy-id projection agree with a
 * canonical revision for supported top-level declarations.
 */
export function verifyLegacyAstParity(
  graph: CanonicalProjectGraph,
  rootDir: string,
  filePaths?: readonly string[]
): LegacyParityResult {
  const aliases = materializeAliases(graph);
  const aliasByCanonical = new Map(aliases.map((alias) => [alias.canonicalId, alias]));
  const builder = new IncrementalBuilder(rootDir, null);
  const files =
    filePaths ??
    [
      ...new Set(
        graph.nodes
          .filter((node) => node.external !== true)
          .map((node) => node.file ?? node.evidence?.file)
          .filter((file): file is string => typeof file === 'string')
      ),
    ];

  const mismatches: LegacyParityMismatch[] = [];
  let matched = 0;

  for (const relativeFile of files) {
    const absoluteFile = path.isAbsolute(relativeFile)
      ? path.resolve(relativeFile)
      : path.resolve(rootDir, relativeFile);
    if (!fs.existsSync(absoluteFile)) continue;

    const extracted = builder.extractFile(absoluteFile);
    const savedNodes = graph.nodes.filter((node) => nodeMatchesFile(node, absoluteFile, relativeFile, rootDir));

    for (const node of savedNodes) {
      const alias = aliasByCanonical.get(node.id);
      if (!alias) continue;

      const peer = findExtractedPeer(extracted.symbols, node, absoluteFile, rootDir);
      if (!peer) {
        mismatches.push({
          filePath: relativeFile.replace(/\\/g, '/'),
          canonicalId: node.id,
          legacyId: alias.legacyId,
          reason: 'syntax extractor did not find a matching declaration',
        });
        continue;
      }

      const projectedLegacyId = generateLegacyId(absoluteFile, peer.name, peer.type);
      if (projectedLegacyId !== alias.legacyId) {
        mismatches.push({
          filePath: relativeFile.replace(/\\/g, '/'),
          canonicalId: node.id,
          legacyId: alias.legacyId,
          reason: `legacy projection mismatch: expected ${alias.legacyId}, got ${projectedLegacyId}`,
        });
        continue;
      }

      matched++;
    }
  }

  return { matched, mismatches: Object.freeze(mismatches) };
}

function findExtractedPeer(
  symbols: ReturnType<IncrementalBuilder['extractFile']>['symbols'],
  node: CanonicalGraphNode,
  absoluteFile: string,
  rootDir: string
) {
  const nodeName = node.name ?? node.qualifiedName;
  if (!nodeName) return null;

  const candidates = symbols.filter((symbol) => {
    if (symbol.type.toLocaleLowerCase() !== node.kind.toLocaleLowerCase()) return false;
    if (symbol.name !== nodeName && symbol.name !== nodeName.split('.').at(-1)) return false;
    return containsNode(node, symbol.line, symbol.column, symbol.endLine, symbol.endColumn);
  });

  candidates.sort(
    (left, right) =>
      rangeSize(left) - rangeSize(right) ||
      right.line - left.line ||
      left.name.localeCompare(right.name)
  );
  return candidates[0] ?? null;
}

function containsNode(
  node: CanonicalGraphNode,
  line: number,
  column: number,
  endLine: number,
  endColumn: number
): boolean {
  const evidence = node.evidence;
  if (!evidence?.startLine) return false;
  const startLine = evidence.startLine;
  const nodeEndLine = evidence.endLine ?? startLine;
  if (line < startLine || endLine > nodeEndLine) return false;
  if (line === startLine && evidence.startCol !== undefined && column < evidence.startCol) return false;
  if (endLine === nodeEndLine && evidence.endCol !== undefined && endColumn > evidence.endCol) return false;
  return true;
}

function rangeSize(symbol: { line: number; column: number; endLine: number; endColumn: number }): number {
  return (symbol.endLine - symbol.line) * 1_000_000 + (symbol.endColumn - symbol.column);
}

function nodeMatchesFile(
  node: CanonicalGraphNode,
  absoluteFile: string,
  relativeFile: string,
  rootDir: string
): boolean {
  const source = node.file ?? node.evidence?.file;
  if (!source) return false;
  const normalized = source.replace(/\\/g, '/');
  if (normalized === relativeFile.replace(/\\/g, '/')) return true;
  const absoluteNodeFile = path.isAbsolute(source) ? path.resolve(source) : path.resolve(rootDir, source);
  return absoluteNodeFile === absoluteFile;
}
