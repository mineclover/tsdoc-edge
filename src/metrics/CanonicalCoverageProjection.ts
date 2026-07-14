/**
 * File-attributed projection from execution reports to canonical graph nodes.
 *
 * @packageDocumentation
 * @doc [[Coverage Metrics Contract]]
 */

import * as path from 'node:path';
import type { CanonicalGraphNode, CanonicalProjectGraph } from '../indexer/contracts';
import type { DocQualityScore } from '../types/analysis';
import {
  type CoverageFunctionEvidence,
  type CoverageMetricFileResult,
  type CoverageMetricResult,
  type CoverageSourceIdentity,
  createCoverageMetricResult,
} from './CoverageMetricContract';

/** Minimal report shape required by the projection boundary. */
export interface CanonicalCoverageProjectionInput {
  readonly reportId: string;
  readonly source: CoverageSourceIdentity;
  readonly fileMetrics: readonly CoverageMetricFileResult[];
}

export interface CanonicalCoverageProjectionOptions {
  /** Exact saved canonical graph revision selected by the caller. */
  readonly graphRevisionId: string;
  /** Confidence assigned to file-to-node attribution. */
  readonly confidence?: number;
}

/** One metric attributed to a node because the node belongs to the covered file. */
export interface CanonicalCoverageObservation {
  readonly canonicalNodeId: string;
  readonly filePath: string;
  readonly mappingKind: 'file-attributed';
  readonly metric: CoverageMetricResult;
}

/** Projection result with explicit graph identity and unmatched report files. */
export interface CanonicalCoverageProjection {
  readonly reportId: string;
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly matchedFiles: readonly string[];
  readonly unmatchedFiles: readonly string[];
  readonly observations: readonly CanonicalCoverageObservation[];
}

/** One direct function-range observation attributed to a canonical node. */
export interface CanonicalFunctionCoverageObservation {
  readonly canonicalNodeId: string;
  readonly filePath: string;
  readonly functionName: string;
  readonly startLine: number;
  readonly endLine?: number;
  readonly mappingKind: 'symbol-range';
  readonly metric: CoverageMetricResult;
}

/** Direct function projection with explicit ambiguity/unmatched reporting. */
export interface CanonicalFunctionCoverageProjection {
  readonly reportId: string;
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly matchedFunctions: readonly string[];
  readonly unmatchedFunctions: readonly string[];
  readonly observations: readonly CanonicalFunctionCoverageObservation[];
}

/** Relationship evidence used to project inferred test-symbol coverage. */
export interface CanonicalTestCoverageRelation {
  readonly fromSymbols: readonly string[];
  readonly toSymbols: readonly string[];
  readonly confidence: number;
}

/** Input for the legacy test relationship adapter. */
export interface CanonicalTestCoverageProjectionInput {
  readonly reportId: string;
  readonly source: CoverageSourceIdentity;
  readonly totalTestCases: number;
  readonly relationships: readonly CanonicalTestCoverageRelation[];
  /** Persisted canonical-to-legacy aliases used by the legacy relationship lane. */
  readonly aliases?: readonly { canonicalId: string; legacyId: string }[];
}

/** One canonical node's inferred test-symbol coverage. */
export interface CanonicalTestCoverageObservation {
  readonly canonicalNodeId: string;
  readonly mappingKind: 'test-relation';
  readonly metric: CoverageMetricResult;
}

/** Canonical projection of relationship-based test-symbol coverage. */
export interface CanonicalTestCoverageProjection {
  readonly reportId: string;
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly matchedSymbols: readonly string[];
  readonly uncoveredSymbols: readonly string[];
  readonly unmatchedRelationTargets: readonly string[];
  readonly observations: readonly CanonicalTestCoverageObservation[];
}

/** Input for projecting documentation analyzer scores to canonical nodes. */
export interface CanonicalDocumentationCoverageProjectionInput {
  readonly reportId: string;
  readonly source: CoverageSourceIdentity;
  readonly scores: readonly DocQualityScore[];
}

/** One canonical node's documentation-symbol coverage. */
export interface CanonicalDocumentationCoverageObservation {
  readonly canonicalNodeId: string;
  readonly symbolName: string;
  readonly line: number;
  readonly mappingKind: 'symbol-name';
  readonly metric: CoverageMetricResult;
}

/** Canonical projection of documentation analyzer scores. */
export interface CanonicalDocumentationCoverageProjection {
  readonly reportId: string;
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly matchedScores: readonly string[];
  readonly unmatchedScores: readonly string[];
  readonly unmatchedNodes: readonly string[];
  readonly observations: readonly CanonicalDocumentationCoverageObservation[];
}

/**
 * Attribute file-level execution metrics to canonical nodes in the same file.
 *
 * This is intentionally `inferred` and `report-only`: Istanbul locations do not
 * prove that every symbol in a file executed. A later symbol-range projection
 * may promote individual observations to direct evidence.
 */
export function projectCoverageReportToCanonicalNodes(
  report: CanonicalCoverageProjectionInput,
  graph: CanonicalProjectGraph,
  options: CanonicalCoverageProjectionOptions
): CanonicalCoverageProjection {
  if (!report.reportId.trim()) throw new Error('Coverage projection reportId must be non-empty');
  if (!options.graphRevisionId.trim()) {
    throw new Error('Coverage projection graphRevisionId must be non-empty');
  }

  const nodesByFile = indexNodesByFile(graph);
  const matchedFiles: string[] = [];
  const unmatchedFiles: string[] = [];
  const observations: CanonicalCoverageObservation[] = [];
  const confidence = options.confidence ?? 0.5;

  for (const fileMetric of report.fileMetrics) {
    const normalizedFile = resolveFile(graph.rootDir, fileMetric.filePath);
    const nodes = nodesByFile.get(normalizedFile) ?? [];
    if (nodes.length === 0) {
      unmatchedFiles.push(fileMetric.filePath);
      continue;
    }

    matchedFiles.push(fileMetric.filePath);
    for (const node of nodes) {
      for (const metric of fileMetric.metrics) {
        observations.push({
          canonicalNodeId: node.id,
          filePath: fileMetric.filePath,
          mappingKind: 'file-attributed',
          metric: createCoverageMetricResult(
            metric.source,
            metric.metricId,
            metric.value.numerator,
            metric.value.denominator,
            { status: 'inferred', confidence, gate: 'report-only' }
          ),
        });
      }
    }
  }

  return {
    reportId: report.reportId,
    graphRevisionId: options.graphRevisionId,
    graphFingerprint: graph.fingerprint,
    matchedFiles: [...new Set(matchedFiles)].sort(),
    unmatchedFiles: [...new Set(unmatchedFiles)].sort(),
    observations: observations.sort((left, right) => {
      const nodeOrder = left.canonicalNodeId.localeCompare(right.canonicalNodeId);
      if (nodeOrder !== 0) return nodeOrder;
      return left.metric.metricId.localeCompare(right.metric.metricId);
    }),
  };
}

/**
 * Project Istanbul function declaration ranges to canonical nodes.
 *
 * A unique source-file, range, and name match is required before evidence is
 * promoted to `direct`; ambiguous or missing matches remain unmatched.
 */
export function projectCoverageFunctionsToCanonicalNodes(
  report: CanonicalCoverageProjectionInput,
  graph: CanonicalProjectGraph,
  options: CanonicalCoverageProjectionOptions
): CanonicalFunctionCoverageProjection {
  if (!report.reportId.trim()) throw new Error('Coverage projection reportId must be non-empty');
  if (!options.graphRevisionId.trim()) {
    throw new Error('Coverage projection graphRevisionId must be non-empty');
  }

  const nodesByFile = indexNodesByFile(graph);
  const matchedFunctions: string[] = [];
  const unmatchedFunctions: string[] = [];
  const observations: CanonicalFunctionCoverageObservation[] = [];

  for (const fileMetric of report.fileMetrics) {
    const nodes = nodesByFile.get(resolveFile(graph.rootDir, fileMetric.filePath)) ?? [];
    for (const fn of fileMetric.functions ?? []) {
      const functionKey = `${fileMetric.filePath}:${fn.name}:${fn.startLine}`;
      const candidates = selectFunctionCandidates(nodes, fn);
      if (candidates.length !== 1) {
        unmatchedFunctions.push(functionKey);
        continue;
      }

      const node = candidates[0];
      matchedFunctions.push(functionKey);
      observations.push({
        canonicalNodeId: node.id,
        filePath: fileMetric.filePath,
        functionName: fn.name,
        startLine: fn.startLine,
        ...(fn.endLine === undefined ? {} : { endLine: fn.endLine }),
        mappingKind: 'symbol-range',
        metric: createCoverageMetricResult(
          report.source,
          'execution.function',
          fn.covered ? 1 : 0,
          1,
          { status: 'direct', confidence: 1, gate: 'report-only' }
        ),
      });
    }
  }

  return {
    reportId: report.reportId,
    graphRevisionId: options.graphRevisionId,
    graphFingerprint: graph.fingerprint,
    matchedFunctions: [...new Set(matchedFunctions)].sort(),
    unmatchedFunctions: [...new Set(unmatchedFunctions)].sort(),
    observations: observations.sort((left, right) => {
      const nodeOrder = left.canonicalNodeId.localeCompare(right.canonicalNodeId);
      if (nodeOrder !== 0) return nodeOrder;
      return left.startLine - right.startLine;
    }),
  };
}

/**
 * Project inferred test relationships to every implementation node in a graph.
 *
 * The denominator is the total number of extracted test cases. A relationship
 * is evidence that a test case targets a node, not proof that the test passed,
 * so the result remains inferred and report-only.
 */
export function projectTestCoverageToCanonicalNodes(
  input: CanonicalTestCoverageProjectionInput,
  graph: CanonicalProjectGraph,
  options: CanonicalCoverageProjectionOptions
): CanonicalTestCoverageProjection {
  assertProjectionIdentity(input.reportId, options.graphRevisionId);
  if (!Number.isInteger(input.totalTestCases) || input.totalTestCases < 0) {
    throw new Error('Test coverage totalTestCases must be a non-negative integer');
  }

  const implementationNodes = selectImplementationNodes(graph);
  const canonicalByLegacyId = new Map(
    (input.aliases ?? []).map((alias) => [alias.legacyId, alias.canonicalId])
  );
  const relationsByTarget = new Map<string, CanonicalTestCoverageRelation[]>();
  for (const relation of input.relationships) {
    for (const target of relation.toSymbols) {
      const canonicalTarget = canonicalByLegacyId.get(target) ?? target;
      const relations = relationsByTarget.get(canonicalTarget) ?? [];
      relations.push(relation);
      relationsByTarget.set(canonicalTarget, relations);
    }
  }

  const matchedSymbols: string[] = [];
  const uncoveredSymbols: string[] = [];
  const observations: CanonicalTestCoverageObservation[] = [];
  for (const node of implementationNodes) {
    const relations = relationsByTarget.get(node.id) ?? [];
    const testCaseIds = new Set(relations.flatMap((relation) => relation.fromSymbols));
    const confidence = averageConfidence(relations);
    if (testCaseIds.size > 0) {
      matchedSymbols.push(node.id);
    } else {
      uncoveredSymbols.push(node.id);
    }
    observations.push({
      canonicalNodeId: node.id,
      mappingKind: 'test-relation',
      metric: createCoverageMetricResult(
        input.source,
        'test.symbol',
        testCaseIds.size,
        input.totalTestCases,
        { status: 'inferred', confidence, gate: 'report-only' }
      ),
    });
  }

  const canonicalNodeIds = new Set(implementationNodes.map((node) => node.id));
  const unmatchedRelationTargets = [...relationsByTarget.keys()]
    .filter((target) => !canonicalNodeIds.has(target))
    .sort();

  return {
    reportId: input.reportId,
    graphRevisionId: options.graphRevisionId,
    graphFingerprint: graph.fingerprint,
    matchedSymbols: matchedSymbols.sort(),
    uncoveredSymbols: uncoveredSymbols.sort(),
    unmatchedRelationTargets,
    observations,
  };
}

/**
 * Project documentation quality scores to canonical implementation nodes.
 *
 * A file, symbol name, and declaration line match is direct evidence. A
 * unique file/name match without usable graph range evidence is retained as
 * inferred evidence so the caller can distinguish it from a direct match.
 */
export function projectDocumentationCoverageToCanonicalNodes(
  input: CanonicalDocumentationCoverageProjectionInput,
  graph: CanonicalProjectGraph,
  options: CanonicalCoverageProjectionOptions
): CanonicalDocumentationCoverageProjection {
  assertProjectionIdentity(input.reportId, options.graphRevisionId);

  const nodes = selectImplementationNodes(graph);
  const nodesByFile = indexNodesByFile(graph);
  const matchedScores: string[] = [];
  const unmatchedScores: string[] = [];
  const matchedNodeIds = new Set<string>();
  const observations: CanonicalDocumentationCoverageObservation[] = [];

  for (const score of input.scores) {
    const scoreKey = `${score.filePath}:${score.line}:${score.symbolName}`;
    const fileNodes = (nodesByFile.get(resolveFile(graph.rootDir, score.filePath)) ?? []).filter(
      (node) => nodes.some((candidate) => candidate.id === node.id)
    );
    const candidates = fileNodes.filter((node) => nodeNameMatches(node, score.symbolName));
    const node = selectDocumentationNode(candidates, score.line);
    if (!node) {
      unmatchedScores.push(scoreKey);
      continue;
    }

    const direct = nodeContainsLine(node, score.line);
    matchedScores.push(scoreKey);
    matchedNodeIds.add(node.id);
    observations.push({
      canonicalNodeId: node.id,
      symbolName: score.symbolName,
      line: score.line,
      mappingKind: 'symbol-name',
      metric: createCoverageMetricResult(
        input.source,
        'documentation.symbol',
        score.hasDoc ? 1 : 0,
        1,
        {
          status: direct ? 'direct' : 'inferred',
          confidence: direct ? 1 : 0.75,
          gate: 'report-only',
        }
      ),
    });
  }

  return {
    reportId: input.reportId,
    graphRevisionId: options.graphRevisionId,
    graphFingerprint: graph.fingerprint,
    matchedScores: [...new Set(matchedScores)].sort(),
    unmatchedScores: [...new Set(unmatchedScores)].sort(),
    unmatchedNodes: nodes
      .map((node) => node.id)
      .filter((nodeId) => !matchedNodeIds.has(nodeId))
      .sort(),
    observations: observations.sort((left, right) =>
      left.canonicalNodeId.localeCompare(right.canonicalNodeId)
    ),
  };
}

function assertProjectionIdentity(reportId: string, graphRevisionId: string): void {
  if (!reportId.trim()) throw new Error('Coverage projection reportId must be non-empty');
  if (!graphRevisionId.trim()) {
    throw new Error('Coverage projection graphRevisionId must be non-empty');
  }
}

function selectImplementationNodes(graph: CanonicalProjectGraph): CanonicalGraphNode[] {
  return graph.nodes
    .filter((node) => node.external !== true && (node.file ?? node.evidence?.file) !== undefined)
    .filter((node) => !['test-case', 'test-suite', 'test-scenario'].includes(node.kind))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function selectDocumentationNode(
  candidates: readonly CanonicalGraphNode[],
  line: number
): CanonicalGraphNode | undefined {
  if (candidates.length === 0) return undefined;
  const rangeMatches = candidates.filter((node) => nodeContainsLine(node, line));
  const narrowed = rangeMatches.length > 0 ? rangeMatches : candidates;
  if (narrowed.length === 1) return narrowed[0];
  const exactStart = narrowed.filter((node) => numberValue(node.evidence?.startLine) === line);
  return exactStart.length === 1 ? exactStart[0] : undefined;
}

function averageConfidence(relations: readonly CanonicalTestCoverageRelation[]): number {
  if (relations.length === 0) return 0;
  const total = relations.reduce((sum, relation) => sum + clampConfidence(relation.confidence), 0);
  return total / relations.length;
}

function clampConfidence(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function indexNodesByFile(graph: CanonicalProjectGraph): Map<string, CanonicalGraphNode[]> {
  const nodesByFile = new Map<string, CanonicalGraphNode[]>();
  for (const node of graph.nodes) {
    const sourceFile = node.file ?? node.evidence?.file;
    if (!sourceFile) continue;
    const normalizedFile = resolveFile(graph.rootDir, sourceFile);
    const nodes = nodesByFile.get(normalizedFile) ?? [];
    nodes.push(node);
    nodesByFile.set(normalizedFile, nodes);
  }
  for (const nodes of nodesByFile.values()) {
    nodes.sort((left, right) => left.id.localeCompare(right.id));
  }
  return nodesByFile;
}

function selectFunctionCandidates(
  nodes: readonly CanonicalGraphNode[],
  fn: CoverageFunctionEvidence
): CanonicalGraphNode[] {
  const rangeMatches = nodes.filter((node) => nodeContainsLine(node, fn.startLine));
  const namedMatches = rangeMatches.filter((node) => nodeNameMatches(node, fn.name));
  const candidates = namedMatches;
  if (candidates.length <= 1) return candidates;

  const narrowestSpan = Math.min(...candidates.map((node) => nodeSpan(node)));
  return candidates.filter((node) => nodeSpan(node) === narrowestSpan);
}

function nodeContainsLine(node: CanonicalGraphNode, line: number): boolean {
  const startLine = numberValue(node.evidence?.startLine);
  if (startLine === undefined) return false;
  const endLine = numberValue(node.evidence?.endLine) ?? startLine;
  return startLine <= line && line <= endLine;
}

function nodeSpan(node: CanonicalGraphNode): number {
  const startLine = numberValue(node.evidence?.startLine);
  const endLine = numberValue(node.evidence?.endLine) ?? startLine;
  if (startLine === undefined || endLine === undefined) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, endLine - startLine);
}

function nodeNameMatches(node: CanonicalGraphNode, name: string): boolean {
  if (node.name === name) return true;
  const qualifiedName = node.qualifiedName;
  return qualifiedName === name || qualifiedName?.endsWith(`.${name}`) === true;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolveFile(rootDir: string, filePath: string): string {
  return path.normalize(path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath));
}
