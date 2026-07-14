import type { CanonicalProjectGraph } from '../../indexer/contracts';
import {
  projectCoverageFunctionsToCanonicalNodes,
  projectCoverageReportToCanonicalNodes,
  projectDocumentationCoverageToCanonicalNodes,
  projectTestCoverageToCanonicalNodes,
} from '../../metrics/CanonicalCoverageProjection';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import type { DocQualityScore } from '../../types/analysis';

describe('projectCoverageReportToCanonicalNodes', () => {
  it('attributes file metrics to matching canonical nodes as inferred evidence', () => {
    const source = createCoverageSourceIdentity('coverage-final.json', '{"fixture":true}', {
      workspaceId: 'fixture-workspace',
      capturedAt: '2026-07-14T00:00:00.000Z',
    });
    const report = {
      reportId: `coverage-report:${source.sourceIdentity}`,
      source,
      fileMetrics: [
        {
          filePath: '/workspace/src/service.ts',
          metrics: [createCoverageMetricResult(source, 'execution.line', 3, 4)],
        },
        {
          filePath: '/workspace/src/missing.ts',
          metrics: [createCoverageMetricResult(source, 'execution.line', 1, 1)],
        },
      ],
    };
    const graph = fixtureGraph();

    const projection = projectCoverageReportToCanonicalNodes(report, graph, {
      graphRevisionId: 'canonical-revision:fixture',
    });

    expect(projection).toMatchObject({
      reportId: report.reportId,
      graphRevisionId: 'canonical-revision:fixture',
      graphFingerprint: 'sha256:fixture-graph',
      matchedFiles: ['/workspace/src/service.ts'],
      unmatchedFiles: ['/workspace/src/missing.ts'],
    });
    expect(projection.observations).toHaveLength(2);
    expect(projection.observations.map((observation) => observation.canonicalNodeId)).toEqual([
      'node:service',
      'node:service-method',
    ]);
    expect(projection.observations[0]?.metric.evidence).toMatchObject({
      status: 'inferred',
      confidence: 0.5,
    });
    expect(projection.observations[0]?.mappingKind).toBe('file-attributed');
  });

  it('uses node evidence file when node.file is not present', () => {
    const source = createCoverageSourceIdentity('coverage-final.json', '{}');
    const report = {
      reportId: `coverage-report:${source.sourceIdentity}`,
      source,
      fileMetrics: [
        {
          filePath: 'src/evidence.ts',
          metrics: [createCoverageMetricResult(source, 'execution.function', 1, 1)],
        },
      ],
    };
    const graph = fixtureGraph({ file: undefined, evidence: { file: 'src/evidence.ts' } });

    const projection = projectCoverageReportToCanonicalNodes(report, graph, {
      graphRevisionId: 'canonical-revision:fixture',
      confidence: 0.25,
    });

    expect(projection.observations).toHaveLength(1);
    expect(projection.observations[0]?.metric.evidence.confidence).toBe(0.25);
  });

  it('promotes a unique function range and name match to direct evidence', () => {
    const source = createCoverageSourceIdentity('coverage-final.json', '{}', {
      workspaceId: 'fixture-workspace',
    });
    const report = {
      reportId: `coverage-report:${source.sourceIdentity}`,
      source,
      fileMetrics: [
        {
          filePath: '/workspace/src/service.ts',
          metrics: [createCoverageMetricResult(source, 'execution.function', 1, 1)],
          functions: [
            { name: 'run', startLine: 2, endLine: 3, covered: true, count: 4 },
            { name: 'missing', startLine: 20, endLine: 21, covered: false, count: 0 },
          ],
        },
      ],
    };

    const projection = projectCoverageFunctionsToCanonicalNodes(report, fixtureGraph(), {
      graphRevisionId: 'canonical-revision:fixture',
    });

    expect(projection.matchedFunctions).toEqual(['/workspace/src/service.ts:run:2']);
    expect(projection.unmatchedFunctions).toEqual(['/workspace/src/service.ts:missing:20']);
    expect(projection.observations).toHaveLength(1);
    expect(projection.observations[0]).toMatchObject({
      canonicalNodeId: 'node:service-method',
      functionName: 'run',
      mappingKind: 'symbol-range',
      metric: {
        metricId: 'execution.function',
        value: { numerator: 1, denominator: 1, ratio: 1 },
        evidence: { status: 'direct', confidence: 1 },
      },
    });
  });

  it('requires a saved graph revision identity', () => {
    const source = createCoverageSourceIdentity('coverage-final.json', '{}');
    expect(() =>
      projectCoverageReportToCanonicalNodes(
        { reportId: 'report', source, fileMetrics: [] },
        fixtureGraph(),
        { graphRevisionId: '' }
      )
    ).toThrow('graphRevisionId must be non-empty');
  });

  it('projects inferred test relationships to every implementation node', () => {
    const source = createCoverageSourceIdentity('test-relationships.json', '{}', {
      adapterId: 'tsdoc-edge/test-coverage-analyzer',
      inputKind: 'legacy-database',
      reportFormat: 'test-relationships',
    });

    const projection = projectTestCoverageToCanonicalNodes(
      {
        reportId: `test-symbol:${source.sourceIdentity}`,
        source,
        totalTestCases: 4,
        aliases: [{ canonicalId: 'node:service-method', legacyId: 'legacy:service-method' }],
        relationships: [
          { fromSymbols: ['case:one'], toSymbols: ['legacy:service-method'], confidence: 0.8 },
          { fromSymbols: ['case:two'], toSymbols: ['node:service-method'], confidence: 1 },
          { fromSymbols: ['case:one'], toSymbols: ['node:missing'], confidence: 0.5 },
        ],
      },
      fixtureGraph(),
      { graphRevisionId: 'canonical-revision:fixture' }
    );

    expect(projection.matchedSymbols).toEqual(['node:service-method']);
    expect(projection.uncoveredSymbols).toEqual(['node:evidence', 'node:service']);
    expect(projection.unmatchedRelationTargets).toEqual(['node:missing']);
    expect(projection.observations).toHaveLength(3);
    expect(
      projection.observations.find((item) => item.canonicalNodeId === 'node:service-method')
    ).toMatchObject({
      mappingKind: 'test-relation',
      metric: {
        metricId: 'test.symbol',
        value: { numerator: 2, denominator: 4, ratio: 0.5 },
        evidence: { status: 'inferred', confidence: 0.9 },
      },
    });
  });

  it('projects documentation scores with direct and inferred evidence', () => {
    const source = createCoverageSourceIdentity('documentation-scores.json', '{}', {
      adapterId: 'tsdoc-edge/documentation-analyzer',
      inputKind: 'legacy-database',
      reportFormat: 'documentation-scores',
    });
    const projection = projectDocumentationCoverageToCanonicalNodes(
      {
        reportId: `documentation-symbol:${source.sourceIdentity}`,
        source,
        scores: [
          createDocScore({ filePath: '/workspace/src/service.ts', line: 1, symbolName: 'Service' }),
          createDocScore({
            filePath: '/workspace/src/service.ts',
            line: 2,
            symbolName: 'run',
            hasDoc: false,
          }),
          createDocScore({
            filePath: '/workspace/src/other.ts',
            line: 1,
            symbolName: 'fromEvidence',
          }),
        ],
      },
      fixtureGraph(),
      { graphRevisionId: 'canonical-revision:fixture' }
    );

    expect(projection.matchedScores).toHaveLength(3);
    expect(projection.unmatchedScores).toEqual([]);
    expect(projection.unmatchedNodes).toEqual([]);
    expect(projection.observations).toHaveLength(3);
    expect(
      projection.observations.find((item) => item.canonicalNodeId === 'node:service')
    ).toMatchObject({
      metric: { metricId: 'documentation.symbol', evidence: { status: 'direct', confidence: 1 } },
    });
    expect(
      projection.observations.find((item) => item.canonicalNodeId === 'node:evidence')?.metric
        .evidence
    ).toMatchObject({ status: 'inferred', confidence: 0.75 });
  });
});

function createDocScore(overrides: Partial<DocQualityScore> = {}): DocQualityScore {
  return {
    symbolId: 'fixture-symbol',
    symbolName: 'fixture',
    symbolType: 'function',
    filePath: '/workspace/src/fixture.ts',
    line: 1,
    isPublic: true,
    hasDoc: true,
    hasSummary: true,
    hasCompleteParams: true,
    hasReturns: true,
    hasExamples: false,
    hasCustomTags: false,
    qualityScore: 80,
    missing: [],
    children: [],
    ...overrides,
  };
}

function fixtureGraph(nodeOverrides: Record<string, unknown> = {}): CanonicalProjectGraph {
  return {
    contractVersion: '1.0',
    rootDir: '/workspace',
    tsconfigPath: '/workspace/tsconfig.json',
    nodes: [
      {
        id: 'node:service',
        sourceId: 'node:service',
        kind: 'class',
        name: 'Service',
        file: 'src/service.ts',
        evidence: { startLine: 1, endLine: 10 },
      },
      {
        id: 'node:service-method',
        sourceId: 'node:service-method',
        kind: 'method',
        name: 'run',
        file: 'src/service.ts',
        evidence: { startLine: 2, endLine: 3 },
      },
      {
        id: 'node:evidence',
        sourceId: 'node:evidence',
        kind: 'function',
        name: 'fromEvidence',
        file: 'src/other.ts',
        ...nodeOverrides,
      },
    ],
    edges: [],
    provenance: { adapter: 'fixture', producer: 'fixture' },
    fingerprint: 'sha256:fixture-graph',
  };
}
