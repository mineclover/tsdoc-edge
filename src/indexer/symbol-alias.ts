/**
 * Canonical ↔ legacy symbol alias contract.
 * @packageDocumentation
 */

import * as path from 'node:path';
import type {
  CanonicalGraphNode,
  CanonicalProjectGraph,
  ProjectGraphEvidence,
} from './contracts';
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

/** Build deterministic alias rows for one canonical graph revision. */
export function materializeAliases(graph: CanonicalProjectGraph): readonly SymbolAliasRecord[] {
  const records: SymbolAliasRecord[] = [];
  for (const node of graph.nodes) {
    const filePath = sourceFileFor(node, graph.rootDir);
    const name = node.name ?? node.qualifiedName;
    if (!filePath || !name) continue;

    records.push(
      Object.freeze({
        canonicalId: node.id,
        legacyId: generateLegacyId(filePath, name, node.kind),
        matchStrategy: 'legacy-projection' as const,
        confidence: 1,
        filePath: relativeFile(filePath, graph.rootDir),
        ...(node.evidence ? { evidence: node.evidence } : {}),
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

  constructor(aliases: readonly SymbolAliasRecord[]) {
    for (const alias of aliases) {
      this.legacyByCanonical.set(alias.canonicalId, alias.legacyId);
      if (!this.canonicalByLegacy.has(alias.legacyId)) {
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
  const absolute = path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(rootDir, filePath);
  return path.relative(rootDir, absolute).replace(/\\/g, '/');
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
