/**
 * Legacy AST extractor parity against canonical graph revisions.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASTSymbolExtractor, type ExtractedSymbol } from '../analyzer/ASTSymbolExtractor';
import type { CanonicalGraphNode, CanonicalProjectGraph } from './contracts';
import { generateLegacyId } from './legacy-id';
import {
  buildLegacyIdentityMap,
  type LegacySymbolIdentity,
  materializeAliases,
} from './symbol-alias';

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
 * canonical revision for declarations with an unambiguous legacy identity.
 */
export function verifyLegacyAstParity(
  graph: CanonicalProjectGraph,
  rootDir: string,
  filePaths?: readonly string[]
): LegacyParityResult {
  const aliases = materializeAliases(graph);
  const aliasByCanonical = new Map(aliases.map((alias) => [alias.canonicalId, alias]));
  const identities = buildLegacyIdentityMap(graph);
  const files = canonicalFiles(graph).sort(compareText);
  const selectedFiles = filePaths
    ? new Set(filePaths.map((file) => normalizedRelativeFile(file, rootDir)))
    : null;
  const projectedByFile = extractLegacyProjection(files, rootDir);

  const mismatches: LegacyParityMismatch[] = [];
  let matched = 0;

  for (const relativeFile of files) {
    const normalizedFile = normalizedRelativeFile(relativeFile, rootDir);
    if (selectedFiles && !selectedFiles.has(normalizedFile)) continue;
    const absoluteFile = path.isAbsolute(relativeFile)
      ? path.resolve(relativeFile)
      : path.resolve(rootDir, relativeFile);
    if (!fs.existsSync(absoluteFile)) continue;

    const extracted = projectedByFile.get(normalizedFile) ?? [];
    const savedNodes = graph.nodes.filter(
      (node) =>
        identities.has(node.id) && nodeMatchesFile(node, absoluteFile, relativeFile, rootDir)
    );

    for (const node of savedNodes) {
      const identity = identities.get(node.id);
      if (!identity) continue;
      const alias = aliasByCanonical.get(node.id);
      if (!alias) {
        mismatches.push({
          filePath: normalizedFile,
          canonicalId: node.id,
          legacyId: generateLegacyId(identity.filePath, identity.symbolName, identity.symbolType),
          reason: 'legacy projection is ambiguous or lacks a stable collision suffix',
        });
        continue;
      }

      const peer = findExtractedPeer(extracted, node, identity);
      if (!peer) {
        mismatches.push({
          filePath: normalizedFile,
          canonicalId: node.id,
          legacyId: alias.legacyId,
          reason: 'syntax extractor did not find a matching declaration',
        });
        continue;
      }

      if (peer.legacyId !== alias.legacyId) {
        mismatches.push({
          filePath: normalizedFile,
          canonicalId: node.id,
          legacyId: alias.legacyId,
          reason: `legacy projection mismatch: expected ${alias.legacyId}, got ${peer.legacyId}`,
        });
        continue;
      }

      matched++;
    }
  }

  return { matched, mismatches: Object.freeze(mismatches) };
}

interface ProjectedLegacySymbol {
  readonly symbol: ExtractedSymbol;
  readonly legacyId: string;
}

function findExtractedPeer(
  symbols: readonly ProjectedLegacySymbol[],
  node: CanonicalGraphNode,
  identity: LegacySymbolIdentity
): ProjectedLegacySymbol | null {
  const candidates = symbols.filter(
    ({ symbol }) =>
      symbol.type.toLowerCase() === identity.symbolType &&
      symbol.name === identity.symbolName &&
      symbol.line === node.evidence?.startLine
  );
  return candidates.length === 1 ? candidates[0] : null;
}

function extractLegacyProjection(
  files: readonly string[],
  rootDir: string
): ReadonlyMap<string, readonly ProjectedLegacySymbol[]> {
  const extractor = new ASTSymbolExtractor();
  const seenIds = new Set<string>();
  const projection = new Map<string, readonly ProjectedLegacySymbol[]>();
  for (const file of files) {
    const absoluteFile = path.isAbsolute(file) ? path.resolve(file) : path.resolve(rootDir, file);
    if (!fs.existsSync(absoluteFile)) continue;
    const extracted = extractor.extract(absoluteFile, fs.readFileSync(absoluteFile, 'utf8'));
    const symbols: ProjectedLegacySymbol[] = [];
    for (const symbol of extracted.symbols) {
      const base = generateLegacyId(absoluteFile, symbol.name, symbol.type);
      const legacyId = seenIds.has(base) ? `${base}-L${symbol.line}` : base;
      if (seenIds.has(legacyId)) continue;
      seenIds.add(legacyId);
      symbols.push({ symbol, legacyId });
    }
    projection.set(normalizedRelativeFile(file, rootDir), symbols);
  }
  return projection;
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
  const absoluteNodeFile = path.isAbsolute(source)
    ? path.resolve(source)
    : path.resolve(rootDir, source);
  return absoluteNodeFile === absoluteFile;
}

function canonicalFiles(graph: CanonicalProjectGraph): string[] {
  return [
    ...new Set(
      graph.nodes
        .filter((node) => node.external !== true)
        .map((node) => node.file ?? node.evidence?.file)
        .filter((file): file is string => typeof file === 'string')
        .map((file) => normalizedRelativeFile(file, graph.rootDir))
        .filter(
          (file) =>
            file !== '..' && !file.startsWith('../') && !/\.(?:test|spec)\.tsx?$/i.test(file)
        )
    ),
  ];
}

function normalizedRelativeFile(filePath: string, rootDir: string): string {
  const absolute = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(rootDir, filePath);
  return path.relative(rootDir, absolute).replace(/\\/g, '/');
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
