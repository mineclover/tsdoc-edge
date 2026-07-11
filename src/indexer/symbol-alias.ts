/**
 * Canonical ↔ legacy symbol alias contract.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASTSymbolExtractor } from '../analyzer/ASTSymbolExtractor';
import type { CanonicalGraphNode, CanonicalProjectGraph, ProjectGraphEvidence } from './contracts';
import { generateLegacyId } from './legacy-id';

export type AliasMatchStrategy = 'exact' | 'position' | 'legacy-projection';

/** Explicit alias between canonical and legacy symbol ids. */
export interface SymbolAliasRecord {
  readonly canonicalId: string;
  readonly legacyId: string;
  readonly matchStrategy: AliasMatchStrategy;
  readonly confidence: number;
  readonly filePath: string;
  readonly evidence?: ProjectGraphEvidence;
}

/** Legacy Build identity that can be projected without guessing. */
export interface LegacySymbolIdentity {
  readonly symbolName: string;
  readonly symbolType: string;
  readonly filePath: string;
}

/**
 * Resolve canonical nodes to identities emitted by the legacy Build extractor.
 *
 * The raw graph calls class fields `variable` and uses unqualified member
 * names, while the legacy lane emits `property` and `Class.member`. Interface
 * signatures, constructors, test-parser symbols, external nodes, and top-level
 * variables cannot be projected without source/runtime knowledge and are
 * deliberately omitted rather than guessed.
 */
export function buildLegacyIdentityMap(
  graph: CanonicalProjectGraph
): ReadonlyMap<string, LegacySymbolIdentity> {
  const nodeKindByQualifiedName = new Map<string, string>();
  const legacyDeclarationKeysByFile = new Map<string, ReadonlySet<string>>();
  const legacyExtractor = new ASTSymbolExtractor();
  for (const node of graph.nodes) {
    const filePath = sourceFileFor(node, graph.rootDir);
    const qualifiedName = node.qualifiedName ?? node.name;
    if (!filePath || !qualifiedName || node.external === true) continue;
    nodeKindByQualifiedName.set(
      scopedNameKey(relativeFile(filePath, graph.rootDir), qualifiedName),
      node.kind.toLowerCase()
    );
  }

  const identities = new Map<string, LegacySymbolIdentity>();
  for (const node of graph.nodes) {
    if (node.external === true) continue;
    const filePath = sourceFileFor(node, graph.rootDir);
    if (!filePath) continue;
    const relative = relativeFile(filePath, graph.rootDir);
    if (relative === '..' || relative.startsWith('../') || !isLegacyImplementationFile(relative)) {
      continue;
    }

    const kind = node.kind.toLowerCase();
    const qualifiedName = node.qualifiedName ?? node.name;
    const leafName = node.name ?? qualifiedName?.split('.').at(-1);
    if (!qualifiedName || !leafName) continue;

    let symbolName: string;
    let symbolType: string;
    if (
      kind === 'class' ||
      kind === 'interface' ||
      kind === 'function' ||
      kind === 'type' ||
      kind === 'enum' ||
      kind === 'constant'
    ) {
      symbolName = leafName;
      symbolType = kind;
    } else if (kind === 'method') {
      if (leafName === '__constructor' || leafName === 'constructor') continue;
      const parent = parentQualifiedName(qualifiedName);
      if (!parent || nodeKindByQualifiedName.get(scopedNameKey(relative, parent)) !== 'class') {
        continue;
      }
      symbolName = legacyMemberName(qualifiedName);
      symbolType = 'method';
    } else if (kind === 'property' || kind === 'variable') {
      const parent = parentQualifiedName(qualifiedName);
      if (!parent || nodeKindByQualifiedName.get(scopedNameKey(relative, parent)) !== 'class') {
        continue;
      }
      symbolName = legacyMemberName(qualifiedName);
      symbolType = 'property';
    } else {
      continue;
    }

    if (
      (symbolType === 'method' || symbolType === 'property') &&
      !hasLegacyExtractorPeer(
        filePath,
        node.evidence?.startLine,
        symbolName,
        symbolType,
        legacyExtractor,
        legacyDeclarationKeysByFile
      )
    ) {
      continue;
    }

    identities.set(node.id, Object.freeze({ symbolName, symbolType, filePath: relative }));
  }
  return identities;
}

/** Build deterministic, collision-safe alias rows for one canonical graph revision. */
export function materializeAliases(graph: CanonicalProjectGraph): readonly SymbolAliasRecord[] {
  const identities = buildLegacyIdentityMap(graph);
  const candidates: Array<{
    readonly node: CanonicalGraphNode;
    readonly identity: LegacySymbolIdentity;
    readonly baseLegacyId: string;
  }> = [];
  for (const node of graph.nodes) {
    const identity = identities.get(node.id);
    if (!identity) continue;
    candidates.push({
      node,
      identity,
      baseLegacyId: generateLegacyId(identity.filePath, identity.symbolName, identity.symbolType),
    });
  }

  // Legacy Build keeps the first base id and suffixes later collisions with
  // the declaration line. Canonical node order is identity order rather than
  // source order, so reconstruct the deterministic full-build traversal here.
  candidates.sort(compareAliasCandidates);
  const baseCounts = new Map<string, number>();
  const projected = candidates.map((candidate) => {
    const previous = baseCounts.get(candidate.baseLegacyId) ?? 0;
    baseCounts.set(candidate.baseLegacyId, previous + 1);
    if (previous === 0) return { candidate, legacyId: candidate.baseLegacyId };
    const line = candidate.node.evidence?.startLine;
    return {
      candidate,
      legacyId:
        typeof line === 'number' && Number.isInteger(line) && line > 0
          ? `${candidate.baseLegacyId}-L${line}`
          : null,
    };
  });
  const projectedCounts = new Map<string, number>();
  for (const { legacyId } of projected) {
    if (legacyId) projectedCounts.set(legacyId, (projectedCounts.get(legacyId) ?? 0) + 1);
  }

  const records: SymbolAliasRecord[] = [];
  for (const { candidate, legacyId } of projected) {
    // Two declarations that still collapse after the line suffix are
    // ambiguous. Omit every claimant instead of assigning one arbitrarily.
    if (!legacyId || projectedCounts.get(legacyId) !== 1) continue;
    records.push(
      Object.freeze({
        canonicalId: candidate.node.id,
        legacyId,
        matchStrategy: 'legacy-projection' as const,
        confidence: 1,
        filePath: candidate.identity.filePath,
        ...(candidate.node.evidence ? { evidence: candidate.node.evidence } : {}),
      })
    );
  }
  return Object.freeze(
    records.sort(
      (left, right) =>
        compareText(left.canonicalId, right.canonicalId) ||
        compareText(left.legacyId, right.legacyId)
    )
  );
}

/** In-memory alias resolver for one revision. */
export class InMemoryAliasResolver {
  private readonly legacyByCanonical = new Map<string, string>();
  private readonly canonicalByLegacy = new Map<string, string>();
  private readonly ambiguousCanonicalIds = new Set<string>();
  private readonly ambiguousLegacyIds = new Set<string>();

  constructor(aliases: readonly SymbolAliasRecord[]) {
    for (const alias of aliases) {
      if (this.ambiguousCanonicalIds.has(alias.canonicalId)) {
        // Already known ambiguous.
      } else if (this.legacyByCanonical.has(alias.canonicalId)) {
        this.legacyByCanonical.delete(alias.canonicalId);
        this.ambiguousCanonicalIds.add(alias.canonicalId);
      } else {
        this.legacyByCanonical.set(alias.canonicalId, alias.legacyId);
      }

      if (this.ambiguousLegacyIds.has(alias.legacyId)) {
        // Already known ambiguous.
      } else if (this.canonicalByLegacy.has(alias.legacyId)) {
        this.canonicalByLegacy.delete(alias.legacyId);
        this.ambiguousLegacyIds.add(alias.legacyId);
      } else {
        this.canonicalByLegacy.set(alias.legacyId, alias.canonicalId);
      }
    }
  }

  canonicalToLegacy(canonicalId: string): string | null {
    return this.legacyByCanonical.get(canonicalId) ?? null;
  }

  legacyToCanonical(legacyId: string): string | null {
    return this.canonicalByLegacy.get(legacyId) ?? null;
  }

  resolveAtPosition(
    graph: CanonicalProjectGraph,
    filePath: string,
    line: number,
    kind?: string
  ): SymbolAliasRecord | null {
    const absolute = path.resolve(filePath);
    const relative = path.relative(graph.rootDir, absolute).replace(/\\/g, '/');
    const candidates = graph.nodes.filter((node) => {
      const nodeFile = sourceFileFor(node, graph.rootDir);
      if (!nodeFile) return false;
      const nodeRelative = relativeFile(nodeFile, graph.rootDir);
      if (nodeRelative !== relative && path.resolve(nodeFile) !== absolute) return false;
      if (kind && node.kind.toLocaleLowerCase() !== kind.toLocaleLowerCase()) return false;
      const start = node.evidence?.startLine ?? 1;
      const end = node.evidence?.endLine ?? start;
      return line >= start && line <= end;
    });
    if (candidates.length !== 1) return null;
    const node = candidates[0];
    const legacyId = this.canonicalToLegacy(node.id);
    if (!legacyId) return null;
    return {
      canonicalId: node.id,
      legacyId,
      matchStrategy: 'position',
      confidence: 0.9,
      filePath: relative,
      evidence: node.evidence,
    };
  }
}

function sourceFileFor(node: CanonicalGraphNode, rootDir: string): string | undefined {
  const file = node.file ?? node.evidence?.file;
  if (!file) return undefined;
  return path.isAbsolute(file) ? path.normalize(file) : path.resolve(rootDir, file);
}

function relativeFile(filePath: string, rootDir: string): string {
  const absolute = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(rootDir, filePath);
  return path.relative(rootDir, absolute).replace(/\\/g, '/');
}

function scopedNameKey(filePath: string, qualifiedName: string): string {
  return `${filePath}\u0000${qualifiedName}`;
}

function parentQualifiedName(qualifiedName: string): string | null {
  const separator = qualifiedName.lastIndexOf('.');
  return separator > 0 ? qualifiedName.slice(0, separator) : null;
}

function legacyMemberName(qualifiedName: string): string {
  return qualifiedName.split('.').slice(-2).join('.');
}

function isLegacyImplementationFile(filePath: string): boolean {
  return /\.ts$/i.test(filePath) && !/\.(?:test|spec)\.ts$/i.test(filePath);
}

function hasLegacyExtractorPeer(
  filePath: string,
  startLine: number | undefined,
  symbolName: string,
  symbolType: string,
  extractor: ASTSymbolExtractor,
  declarationKeysByFile: Map<string, ReadonlySet<string>>
): boolean {
  // A detached node cannot prove that the legacy extractor emits this member;
  // omit the alias instead of projecting a potentially nonexistent target.
  if (!fs.existsSync(filePath)) return false;
  if (startLine === undefined) return false;

  let declarationKeys = declarationKeysByFile.get(filePath);
  if (!declarationKeys) {
    try {
      const extracted = extractor.extract(filePath, fs.readFileSync(filePath, 'utf8'));
      declarationKeys = new Set(
        extracted.symbols.map((symbol) =>
          legacyDeclarationKey(symbol.line, symbol.name, symbol.type)
        )
      );
    } catch {
      declarationKeys = new Set();
    }
    declarationKeysByFile.set(filePath, declarationKeys);
  }

  return declarationKeys.has(legacyDeclarationKey(startLine, symbolName, symbolType));
}

function legacyDeclarationKey(line: number, name: string, type: string): string {
  return `${line}\u0000${type.toLowerCase()}\u0000${name}`;
}

function compareAliasCandidates(
  left: { node: CanonicalGraphNode; identity: LegacySymbolIdentity },
  right: { node: CanonicalGraphNode; identity: LegacySymbolIdentity }
): number {
  return (
    compareText(left.identity.filePath, right.identity.filePath) ||
    (left.node.evidence?.startLine ?? Number.MAX_SAFE_INTEGER) -
      (right.node.evidence?.startLine ?? Number.MAX_SAFE_INTEGER) ||
    (left.node.evidence?.startCol ?? Number.MAX_SAFE_INTEGER) -
      (right.node.evidence?.startCol ?? Number.MAX_SAFE_INTEGER) ||
    compareText(left.node.id, right.node.id)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
