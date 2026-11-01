/**
 * TypeScript-version-neutral contracts for project graph indexing.
 *
 * Compiler-specific AST objects must not cross this boundary. Graph sources
 * provide JSON-shaped facts and ProjectIndexer assembles the canonical graph.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @context TypeScript-version-neutral data contract boundary between external `@ttsc/graph` producers and `ProjectIndexer`.
 * @functionality Defines canonical source nodes, edges, provenance metadata, indexing requests, and deterministic `CanonicalProjectGraph` revision structures.
 * @packageDocumentation
 */

import type { CanonicalDiagnostic } from './diagnostics-contract';

/**
 * Contract version identifier for canonical project graph payloads.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export const PROJECT_GRAPH_CONTRACT_VERSION = '1.0' as const;

/**
 * Source location supplied by a graph producer.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectGraphEvidence extends Record<string, unknown> {
  file?: string;
  startLine?: number;
  startCol?: number;
  endLine?: number;
  endCol?: number;
}

/**
 * Raw node supplied by a project graph source.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
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

/**
 * Raw edge supplied by a project graph source.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectGraphSourceEdge extends Record<string, unknown> {
  kind: string;
  from: string;
  to: string;
  evidence?: ProjectGraphEvidence;
}

/**
 * Provenance retained with every graph revision.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectGraphProvenance extends Record<string, unknown> {
  adapter: string;
  producer: string;
  /** Stable workspace scope used by cross-plane spec and convention binding. */
  workspaceId?: string;
  /** Stable graph identity namespace within the workspace. */
  graphNamespace?: string;
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
  compilerVersionReported?: boolean;
  /** Producer-owned semantic revision that affects effective-analysis identity. */
  producerDerivedRevisionId?: string;
  /** Router-owned semantic revision that affects effective-analysis identity. */
  routerDerivedRevisionId?: string;
  diagnosticsCollected?: boolean;
  /** Compatibility target, not a claim about tsdoc-edge's local AST runtime. */
  typescriptCompatibilityTarget?: string;
}

/**
 * Unassembled graph facts returned by an adapter.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectGraphInput {
  rootDir: string;
  tsconfigPath: string;
  nodes: ProjectGraphSourceNode[];
  edges: ProjectGraphSourceEdge[];
  provenance: ProjectGraphProvenance;
  /** Optional diagnostics collected by the producer; not part of graph fingerprint. */
  diagnostics?: readonly CanonicalDiagnostic[];
}

/**
 * Request shared by batch and saved-file indexing flows.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectIndexRequest {
  rootDir: string;
  tsconfigPath?: string;
  /** Fresh reads are required while router fingerprints are not content-aware. */
  refresh?: boolean;
  /** Reserved for an LSP overlay source; raw router artifacts cannot represent it. */
  contentOverrides?: ReadonlyMap<string, string>;
}

/**
 * Adapter that supplies whole-project graph facts.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectGraphSource {
  readonly id: string;
  load(request: ProjectIndexRequest): Promise<ProjectGraphInput>;
}

/**
 * Canonical node. The producer id is currently the canonical equality key.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export type CanonicalGraphNode = Readonly<ProjectGraphSourceNode & { sourceId: string }>;

/**
 * Canonical edge with lossless producer kind and evidence.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export type CanonicalGraphEdge = Readonly<ProjectGraphSourceEdge>;

/**
 * Result of assembling one canonical graph revision.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ProjectIndexResult {
  readonly graph: CanonicalProjectGraph;
  readonly diagnostics: readonly CanonicalDiagnostic[];
}

/**
 * Deterministic graph revision consumed by persistence, CLI, and LSP.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface CanonicalProjectGraph {
  readonly contractVersion: typeof PROJECT_GRAPH_CONTRACT_VERSION;
  readonly rootDir: string;
  readonly tsconfigPath: string;
  readonly nodes: readonly CanonicalGraphNode[];
  readonly edges: readonly CanonicalGraphEdge[];
  readonly provenance: Readonly<ProjectGraphProvenance>;
  readonly fingerprint: string;
}
