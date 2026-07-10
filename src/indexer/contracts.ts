/**
 * TypeScript-version-neutral contracts for project graph indexing.
 *
 * Compiler-specific AST objects must not cross this boundary. Graph sources
 * provide JSON-shaped facts and ProjectIndexer assembles the canonical graph.
 *
 * @packageDocumentation
 */

import type { CanonicalDiagnostic } from './diagnostics-contract';

export const PROJECT_GRAPH_CONTRACT_VERSION = '1.0' as const;

/** Source location supplied by a graph producer. */
export interface ProjectGraphEvidence extends Record<string, unknown> {
  file?: string;
  startLine?: number;
  startCol?: number;
  endLine?: number;
  endCol?: number;
}

/** Raw node supplied by a project graph source. */
export interface ProjectGraphSourceNode extends Record<string, unknown> {
  id: string;
  kind: string;
  name?: string;
  qualifiedName?: string;
  file?: string;
  exported?: boolean;
  external?: boolean;
  evidence?: ProjectGraphEvidence;
}

/** Raw edge supplied by a project graph source. */
export interface ProjectGraphSourceEdge extends Record<string, unknown> {
  kind: string;
  from: string;
  to: string;
  evidence?: ProjectGraphEvidence;
}

/** Provenance retained with every graph revision. */
export interface ProjectGraphProvenance extends Record<string, unknown> {
  adapter: string;
  producer: string;
  producerVersion?: string;
  artifactContractId?: string;
  artifactContractVersion?: string;
  artifactSchema?: string;
  artifactFactPlane?: string;
  artifactCapabilities?: Readonly<Record<string, unknown>>;
  routerName?: string;
  routerVersion?: string;
  /** `null` means the producer did not report the actual compiler version. */
  compilerVersion?: string | null;
  diagnosticsCollected?: boolean;
  /** Compatibility target, not a claim about tsdoc-edge's local AST runtime. */
  typescriptCompatibilityTarget?: string;
}

/** Unassembled graph facts returned by an adapter. */
export interface ProjectGraphInput {
  rootDir: string;
  tsconfigPath: string;
  nodes: ProjectGraphSourceNode[];
  edges: ProjectGraphSourceEdge[];
  provenance: ProjectGraphProvenance;
  /** Optional diagnostics collected by the producer; not part of graph fingerprint. */
  diagnostics?: readonly CanonicalDiagnostic[];
}

/** Request shared by batch and saved-file indexing flows. */
export interface ProjectIndexRequest {
  rootDir: string;
  tsconfigPath?: string;
  /** Fresh reads are required while router fingerprints are not content-aware. */
  refresh?: boolean;
  /** Reserved for an LSP overlay source; raw router artifacts cannot represent it. */
  contentOverrides?: ReadonlyMap<string, string>;
}

/** Adapter that supplies whole-project graph facts. */
export interface ProjectGraphSource {
  readonly id: string;
  load(request: ProjectIndexRequest): Promise<ProjectGraphInput>;
}

/** Canonical node. The producer id is currently the canonical equality key. */
export type CanonicalGraphNode = Readonly<ProjectGraphSourceNode & { sourceId: string }>;

/** Canonical edge with lossless producer kind and evidence. */
export type CanonicalGraphEdge = Readonly<ProjectGraphSourceEdge>;

/** Result of assembling one canonical graph revision. */
export interface ProjectIndexResult {
  readonly graph: CanonicalProjectGraph;
  readonly diagnostics: readonly CanonicalDiagnostic[];
}

/** Deterministic graph revision consumed by persistence, CLI, and LSP. */
export interface CanonicalProjectGraph {
  readonly contractVersion: typeof PROJECT_GRAPH_CONTRACT_VERSION;
  readonly rootDir: string;
  readonly tsconfigPath: string;
  readonly nodes: readonly CanonicalGraphNode[];
  readonly edges: readonly CanonicalGraphEdge[];
  readonly provenance: Readonly<ProjectGraphProvenance>;
  readonly fingerprint: string;
}
