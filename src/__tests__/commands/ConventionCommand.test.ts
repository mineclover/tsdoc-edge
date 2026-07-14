import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  ConventionCheckCommand,
  type ConventionCheckCommandOutput,
  type ConventionFailureThreshold,
} from '../../commands/ConventionCheckCommand';
import { ConventionCommand } from '../../commands/ConventionCommand';
import { ConfigManager } from '../../config/ConfigManager';
import { type ConventionPackSource, compileConventionPackFile } from '../../convention';
import { canonicalProjectGraphFingerprint } from '../../indexer';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import { createSpecGraphRevision } from '../../spec-graph';
import { AnalysisInputRevisionRepository } from '../../storage/AnalysisInputRevisionRepository';
import { CoverageMetricReportRepository } from '../../storage/CoverageMetricReportRepository';
import { GraphRepository } from '../../storage/GraphRepository';
import { SpecGraphRepository } from '../../storage/SpecGraphRepository';
import {
  FIXTURE_GRAPH_NAMESPACE,
  FIXTURE_WORKSPACE_ID,
  fixtureGraph,
  fixturePackSource,
  writeActiveGraph,
} from '../convention/fixtures';

function missingImplementationPack(severity: 'error' | 'warning' | 'info'): ConventionPackSource {
  const source = fixturePackSource({ targetId: 'src/missing.ts#Missing:class' });
  return {
    ...source,
    policy: {
      ...source.policy,
      rules: source.policy.rules.map((rule) => ({ ...rule, severity })),
    },
  };
}

function capturedJson(log: jest.SpyInstance): ConventionCheckCommandOutput {
  return JSON.parse(log.mock.calls.flat().join('\n')) as ConventionCheckCommandOutput;
}

describe('ConventionCommand', () => {
  const originalCwd = process.cwd();
  let workspace: string;
  let graphDatabase: string;
  let packPath: string;
  let log: jest.SpyInstance;

  beforeEach(() => {
    ConfigManager.reset();
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-convention-command-'));
    process.chdir(workspace);
    graphDatabase = path.join(workspace, '.tsdoc', 'canonical-graph.db');
    packPath = path.join(workspace, 'managed', 'conventions', 'core.json');
    fs.mkdirSync(path.dirname(packPath), { recursive: true });
    fs.writeFileSync(packPath, JSON.stringify(fixturePackSource(), null, 2));
    writeActiveGraph(graphDatabase, fixtureGraph({ rootDir: workspace }));
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    ConfigManager.reset();
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('routes check and exposes a bounded convention command group', async () => {
    const command = new ConventionCommand();
    expect(command.getName()).toBe('convention');
    expect(command.getAlias()).toEqual(['conv']);
    expect((await command.execute(['--help'])).exitCode).toBe(0);
    expect((await command.execute(['check', '--help'])).exitCode).toBe(0);
    expect((await command.execute(['inputs', '--help'])).exitCode).toBe(0);
    expect((await command.execute(['retention', '--help'])).exitCode).toBe(0);
    expect((await command.execute(['check', '--help', '--typo'])).exitCode).toBe(2);
    expect((await command.execute(['unknown'])).exitCode).toBe(2);
  });

  it('operates retention pins and tombstones through the convention command group', async () => {
    const historyDatabase = path.join(workspace, '.tsdoc', 'history.db');
    const relativePack = path.relative(workspace, packPath);
    const checked = await new ConventionCommand().execute([
      'check',
      '--pack',
      relativePack,
      '--graph-db',
      graphDatabase,
      '--history-db',
      historyDatabase,
      '--json',
    ]);
    expect(checked.exitCode).toBe(0);
    const historyReader = new Database(historyDatabase, { readonly: true });
    const historyId = (
      historyReader.prepare('SELECT history_id FROM convention_check_history').get() as {
        history_id: string;
      }
    ).history_id;
    historyReader.close();

    log.mockClear();
    const pinned = await new ConventionCommand().execute([
      'retention',
      'pin',
      '--history-db',
      historyDatabase,
      '--history-id',
      historyId,
      '--reason',
      'release proof',
      '--json',
    ]);
    expect(pinned).toEqual({
      exitCode: 0,
      message: `Convention history pinned: ${historyId}`,
    });
    expect(JSON.parse(log.mock.calls.flat().join('\n'))).toMatchObject({
      pin: { historyId, reason: 'release proof' },
    });

    log.mockClear();
    const preview = await new ConventionCommand().execute([
      'retention',
      'gc',
      '--history-db',
      historyDatabase,
      '--before',
      '2099-01-01T00:00:00Z',
      '--dry-run',
      '--json',
    ]);
    expect(preview).toEqual({ exitCode: 0, message: 'Convention history GC preview: 1' });
    expect(JSON.parse(log.mock.calls.flat().join('\n'))).toMatchObject({
      summaries: [{ historyId, pinned: true }],
    });

    const unpinned = await new ConventionCommand().execute([
      'retention',
      'unpin',
      '--history-db',
      historyDatabase,
      '--history-id',
      historyId,
      '--json',
    ]);
    expect(unpinned).toEqual({
      exitCode: 0,
      message: `Convention history unpinned: ${historyId}`,
    });

    log.mockClear();
    const collected = await new ConventionCommand().execute([
      'retention',
      'gc',
      '--history-db',
      historyDatabase,
      '--before',
      '2099-01-01T00:00:00Z',
      '--reason',
      'release retention window',
      '--json',
    ]);
    expect(collected).toEqual({ exitCode: 0, message: 'Convention history GC complete: 1' });
    expect(JSON.parse(log.mock.calls.flat().join('\n'))).toMatchObject({
      tombstoned: [{ historyId, reason: 'release retention window' }],
    });
  });

  it('fails closed on unknown, missing, duplicate, or positional CLI arguments', async () => {
    const relativePack = path.relative(workspace, packPath);
    const cases = [
      {
        args: ['--pack', relativePack, '--code-revison', 'forged-revision'],
        message: 'Unknown convention option: --code-revison',
      },
      {
        args: ['--pack', relativePack, '--expected-manfiest', 'forged-manifest'],
        message: 'Unknown convention option: --expected-manfiest',
      },
      {
        args: ['--pack', relativePack, '--code-revision'],
        message: 'Convention option requires a value: --code-revision',
      },
      {
        args: ['--pack', relativePack, '--code-revision='],
        message: 'Convention option requires a value: --code-revision',
      },
      {
        args: ['--pack', relativePack, '--expected-manifest='],
        message: 'Convention option requires a value: --expected-manifest',
      },
      {
        args: ['--pack', relativePack, '--coverage-report-db', 'coverage.db'],
        message: 'Coverage report ID is required',
      },
      {
        args: ['--pack', relativePack, '--coverage-thresholds', 'execution.line=0.8'],
        message: 'Coverage report is required for coverage thresholds',
      },
      {
        args: ['--pack', relativePack, '--pack', relativePack],
        message: 'Duplicate convention option: --pack',
      },
      {
        args: ['--pack', relativePack, 'unexpected'],
        message: 'Unexpected convention argument: unexpected',
      },
    ];

    for (const scenario of cases) {
      const result = await new ConventionCheckCommand().execute(scenario.args);
      expect(result.exitCode).toBe(2);
      expect(result.message).toBe(scenario.message);
    }
  });

  it('checks a real pack against a real active canonical graph and emits all pins', async () => {
    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--json',
    ]);
    const output = log.mock.calls.flat().join('\n');

    expect(result).toEqual({ exitCode: 0, message: 'Convention check passed' });
    expect(output).toContain('"resultKind": "convention-check"');
    expect(output).toContain('"specRevisionId"');
    expect(output).toContain('"policyRevisionId"');
    expect(output).toContain('"bindingResolutionSetId"');
    expect(output).toContain('"reportId"');
    expect(output).toContain('"failureThreshold": "error"');
    expect(output).toContain('"evaluatorVersion": "1.0.0"');
    expect(output).toContain('"failed": false');
  });

  it('optionally persists exact evidence, enrichment, and policy pins', async () => {
    const inputRevisionsDatabase = path.join(workspace, '.tsdoc', 'analysis-inputs.db');
    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--input-revisions-db',
      inputRevisionsDatabase,
      '--json',
    ]);
    const output = capturedJson(log);
    const storeInfo = output.inputRevisionStore;

    expect(result).toEqual({ exitCode: 0, message: 'Convention check passed' });
    expect(storeInfo).toMatchObject({
      databasePath: '.tsdoc/analysis-inputs.db',
      pins: expect.arrayContaining([
        expect.objectContaining({ plane: 'evidence' }),
        expect.objectContaining({ plane: 'enrichment' }),
        expect.objectContaining({ plane: 'policy' }),
      ]),
    });
    if (!storeInfo) throw new Error('Expected input revision store metadata');

    const repository = new AnalysisInputRevisionRepository(inputRevisionsDatabase, {
      readOnly: true,
    });
    try {
      for (const pin of storeInfo.pins) {
        expect(repository.readRevision(pin)).toEqual(output.retainedInputs[pin.plane]);
      }
    } finally {
      repository.close();
    }

    log.mockClear();
    const listed = await new ConventionCommand().execute([
      'inputs',
      'list',
      '--input-revisions-db',
      inputRevisionsDatabase,
      '--workspace',
      FIXTURE_WORKSPACE_ID,
      '--json',
    ]);
    const listedOutput = capturedJson(log) as ConventionCheckCommandOutput & {
      summaries: { plane: string }[];
    };
    expect(listed).toEqual({ exitCode: 0, message: 'Analysis input revisions listed: 3' });
    expect(listedOutput.summaries.map((summary) => summary.plane)).toEqual([
      'evidence',
      'enrichment',
      'policy',
    ]);

    const evidencePin = storeInfo.pins.find((pin) => pin.plane === 'evidence');
    if (!evidencePin) throw new Error('Expected evidence input revision pin');
    log.mockClear();
    const read = await new ConventionCommand().execute([
      'inputs',
      'read',
      '--input-revisions-db',
      inputRevisionsDatabase,
      '--workspace',
      evidencePin.workspaceId,
      '--plane',
      evidencePin.plane,
      '--revision-id',
      evidencePin.revisionId,
      '--json',
    ]);
    const readOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      pin: typeof evidencePin;
      revision: unknown;
    };
    expect(read).toEqual({
      exitCode: 0,
      message: `Analysis input revision read: ${evidencePin.plane}/${evidencePin.workspaceId}/${evidencePin.revisionId}`,
    });
    expect(readOutput.pin).toEqual(evidencePin);
    expect(readOutput.revision).toEqual(output.retainedInputs.evidence);
  });

  it('uses the active managed spec revision for a policy-only pack', async () => {
    const policyPackPath = path.join(workspace, 'managed', 'conventions', 'policy.json');
    const policySource = fixturePackSource();
    fs.writeFileSync(
      policyPackPath,
      JSON.stringify({ ...policySource, spec: { nodes: [], edges: [], bindings: [] } }, null, 2)
    );
    const bootstrap = compileConventionPackFile(path.relative(workspace, packPath), {
      workspaceRoot: workspace,
    });
    const managedSpec = createSpecGraphRevision({
      workspaceId: bootstrap.spec.workspaceId,
      nodes: bootstrap.spec.nodes,
      edges: bootstrap.spec.edges,
      bindings: bootstrap.spec.bindings,
      provenance: {
        source: 'managed-document',
        extractorId: 'tsdoc-edge/managed-spec-extractor',
        extractorVersion: '1.0.0',
        authoredSourceFingerprint: `sha256:${'2'.repeat(64)}`,
      },
    });
    const specDatabase = path.join(workspace, '.tsdoc', 'spec-graph.db');
    const historyDatabase = path.join(workspace, '.tsdoc', 'managed-history.db');
    const specs = new SpecGraphRepository(specDatabase);
    specs.replaceActiveRevision(managedSpec);
    specs.close();

    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, policyPackPath),
      '--graph-db',
      graphDatabase,
      '--spec-db',
      specDatabase,
      '--history-db',
      historyDatabase,
      '--json',
    ]);
    const output = capturedJson(log);

    const database = new Database(historyDatabase, { readonly: true });
    const historyId = (
      database.prepare('SELECT history_id FROM convention_check_history').get() as {
        history_id: string;
      }
    ).history_id;
    database.close();
    fs.rmSync(specDatabase, { force: true });
    log.mockClear();
    const replay = await new ConventionCheckCommand().execute([
      '--replay',
      historyId,
      '--history-db',
      historyDatabase,
      '--graph-db',
      graphDatabase,
      '--json',
    ]);
    const replayOutput = capturedJson(log);

    expect(result).toEqual({ exitCode: 0, message: 'Convention check passed' });
    expect(output.retainedPack.spec.provenance.extractorId).toBe(
      'tsdoc-edge/managed-spec-extractor'
    );
    expect(output.inputStamp.specRevisionId).toBe(managedSpec.revisionId);
    expect(replay).toEqual({
      exitCode: 0,
      message: `Retained convention replay reproduced: ${historyId}`,
    });
    expect(replayOutput.inputStamp.specRevisionId).toBe(managedSpec.revisionId);
    expect(replayOutput.checkId).toBe(output.checkId);
  });

  it('binds a source-identified direct coverage report and retains it for replay', async () => {
    const coverageDatabase = path.join(workspace, '.tsdoc', 'coverage-metrics.db');
    const coverageSource = createCoverageSourceIdentity(
      path.join(workspace, 'coverage', 'coverage-final.json'),
      '{"direct":true}',
      { workspaceId: FIXTURE_WORKSPACE_ID, capturedAt: '2026-07-14T00:00:00.000Z' }
    );
    const coverageReport = {
      reportId: `coverage-report:${coverageSource.sourceIdentity}`,
      workspaceId: FIXTURE_WORKSPACE_ID,
      source: coverageSource,
      metrics: [createCoverageMetricResult(coverageSource, 'execution.line', 4, 4)],
      fileMetrics: [],
    };
    const coverageRepository = new CoverageMetricReportRepository(coverageDatabase);
    coverageRepository.storeReport(coverageReport);
    coverageRepository.close();
    const historyDatabase = path.join(workspace, '.tsdoc', 'coverage-history.db');

    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--coverage-report-db',
      coverageDatabase,
      '--coverage-report-id',
      coverageReport.reportId,
      '--coverage-gate',
      'error',
      '--coverage-thresholds',
      'execution.line=0.8',
      '--history-db',
      historyDatabase,
      '--json',
    ]);
    const output = capturedJson(log);
    const historyReader = new Database(historyDatabase, { readonly: true });
    const historyId = (
      historyReader.prepare('SELECT history_id FROM convention_check_history').get() as {
        history_id: string;
      }
    ).history_id;
    historyReader.close();
    fs.rmSync(coverageDatabase, { force: true });
    log.mockClear();

    const replay = await new ConventionCheckCommand().execute([
      '--replay',
      historyId,
      '--history-db',
      historyDatabase,
      '--graph-db',
      graphDatabase,
      '--json',
    ]);
    const replayOutput = capturedJson(log);
    const coverageOutput = output.coverage;

    expect(result).toEqual({ exitCode: 0, message: 'Convention check passed' });
    expect(coverageOutput).toBeDefined();
    expect(coverageOutput).toMatchObject({
      reportId: coverageReport.reportId,
      requestedGate: 'error',
      thresholds: [{ metricId: 'execution.line', minimum: 0.8 }],
      findings: [],
    });
    expect(replay).toEqual({
      exitCode: 0,
      message: `Retained convention replay reproduced: ${historyId}`,
    });
    expect(replayOutput.coverage).toEqual(coverageOutput);
  });

  it('fails an error coverage gate closed for inferred evidence', async () => {
    const coverageDatabase = path.join(workspace, '.tsdoc', 'coverage-inferred.db');
    const coverageSource = createCoverageSourceIdentity(
      path.join(workspace, 'coverage', 'coverage-final.json'),
      '{"inferred":true}',
      { workspaceId: FIXTURE_WORKSPACE_ID, capturedAt: '2026-07-14T00:00:00.000Z' }
    );
    const coverageReport = {
      reportId: `coverage-report:${coverageSource.sourceIdentity}`,
      workspaceId: FIXTURE_WORKSPACE_ID,
      source: coverageSource,
      metrics: [
        createCoverageMetricResult(coverageSource, 'execution.line', 4, 4, {
          status: 'inferred',
        }),
      ],
      fileMetrics: [],
    };
    const coverageRepository = new CoverageMetricReportRepository(coverageDatabase);
    coverageRepository.storeReport(coverageReport);
    coverageRepository.close();

    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--coverage-report-db',
      coverageDatabase,
      '--coverage-report-id',
      coverageReport.reportId,
      '--coverage-gate',
      'error',
      '--json',
    ]);
    const output = capturedJson(log);
    const coverageOutput = output.coverage;

    expect(result.exitCode).toBe(1);
    expect(coverageOutput).toBeDefined();
    expect(coverageOutput).toMatchObject({
      findings: [
        {
          ruleId: 'coverage.metric-gate',
          outcome: 'indeterminate',
          severity: 'error',
        },
      ],
    });
    expect(output.gate.blockingFindingIds).toContain(coverageOutput?.findings[0]?.findingId);
  });

  it('recomputes a retained check without reading the current pack or config', async () => {
    const historyPath = path.join(workspace, '.tsdoc', 'history.db');
    const command = new ConventionCheckCommand();
    const initial = await command.execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--history-db',
      historyPath,
      '--json',
    ]);
    const initialOutput = capturedJson(log);
    log.mockClear();
    const database = new Database(historyPath, { readonly: true });
    const historyId = (
      database.prepare('SELECT history_id FROM convention_check_history').get() as {
        history_id: string;
      }
    ).history_id;
    database.close();
    fs.unlinkSync(packPath);
    fs.writeFileSync(path.join(workspace, '.tsdoc.config.json'), '{"project":{"name":"changed"}}');

    const replay = await command.execute([
      '--replay',
      historyId,
      '--history-db',
      historyPath,
      '--graph-db',
      graphDatabase,
      '--json',
    ]);
    const replayOutput = capturedJson(log);

    expect(initial.exitCode).toBe(0);
    expect(replay.exitCode).toBe(0);
    expect(replayOutput.checkId).toBe(initialOutput.checkId);
    expect(replayOutput.conformance.reportId).toBe(initialOutput.conformance.reportId);
    expect(replayOutput.gate.gateId).toBe(initialOutput.gate.gateId);
  });

  it('refuses to overwrite the retained history database with JSON output', async () => {
    const historyPath = path.join(workspace, '.tsdoc', 'history.db');
    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--history-db',
      historyPath,
      '--output',
      historyPath,
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('--output must not overwrite');
    expect(fs.existsSync(historyPath)).toBe(false);
  });

  it('refuses to overwrite the input revision database with JSON output', async () => {
    const inputRevisionPath = path.join(workspace, '.tsdoc', 'analysis-inputs.db');
    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--input-revisions-db',
      inputRevisionPath,
      '--output',
      inputRevisionPath,
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('--output must not overwrite');
    expect(fs.existsSync(inputRevisionPath)).toBe(false);
  });

  it('loads an optional complete Jest artifact and refuses to overwrite it as output', async () => {
    const artifact = path.join(workspace, 'jest.json');
    fs.writeFileSync(
      artifact,
      JSON.stringify({
        success: true,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        numTotalTests: 0,
        testResults: [],
      })
    );
    const command = new ConventionCheckCommand();
    const loaded = await command.execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--evidence',
      artifact,
      '--json',
    ]);
    const output = capturedJson(log);
    log.mockClear();
    const sameFile = await command.execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--evidence',
      artifact,
      '--output',
      artifact,
    ]);

    expect(loaded.exitCode).toBe(0);
    expect(output.inputStamp.evidenceRevisionId).not.toContain('canonical-empty');
    expect(sameFile.exitCode).toBe(2);
    expect(sameFile.message).toContain('--output must not overwrite');
  });

  it('turns an error-severity location-aware naming finding into gate exit 1', async () => {
    fs.writeFileSync(
      path.join(workspace, '.tsdoc.config.json'),
      JSON.stringify({
        project: { name: 'fixture', version: '1.0.0' },
        paths: { commentsDir: '.comments', databasePath: '.tsdoc.db', jsonlDir: '.jsonl' },
        specGovernance: {
          naming: {
            contractVersion: '1.0',
            rules: [
              {
                id: 'fixture-class-snake',
                path: 'src/**/*.ts',
                target: 'symbol',
                kinds: ['class'],
                style: 'snake',
                severity: 'error',
              },
            ],
          },
        },
      })
    );
    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--json',
    ]);
    const output = capturedJson(log);

    expect(result.exitCode).toBe(1);
    expect(output.naming.findings).toMatchObject([
      { ruleId: 'fixture-class-snake', severity: 'error', outcome: 'violated' },
    ]);
    expect(output.gate.blockingFindingIds).toContain(output.naming.findings[0]?.findingId);
  });

  it('returns exit 1 for an unsuppressed blocking finding', async () => {
    fs.writeFileSync(
      packPath,
      JSON.stringify(fixturePackSource({ targetId: 'src/missing.ts#Missing:class' }), null, 2)
    );
    const result = await new ConventionCommand().execute([
      'check',
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.error).toBeUndefined();
    expect(result.message).toContain('1 blocking finding');
  });

  it('requires an explicit suppression clock and honors the exact expiry boundary', async () => {
    fs.writeFileSync(
      packPath,
      JSON.stringify(
        fixturePackSource({
          targetId: 'src/missing.ts#Missing:class',
          suppression: true,
          expiresAt: '2030-01-01T00:00:00.000Z',
        }),
        null,
        2
      )
    );
    const command = new ConventionCheckCommand();
    const missingClock = await command.execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
    ]);
    log.mockClear();
    const active = await command.execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--suppression-as-of',
      '2030-01-01T00:00:00.000Z',
    ]);
    const activeOutput = log.mock.calls.flat().join('\n');
    log.mockClear();
    const expired = await command.execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--suppression-as-of',
      '2030-01-01T00:00:00.001Z',
    ]);

    expect(missingClock.exitCode).toBe(2);
    expect(missingClock.message).toContain('--suppression-as-of');
    expect(active.exitCode).toBe(0);
    expect(activeOutput).toContain('suppressed=1');
    expect(expired.exitCode).toBe(1);
    expect(expired.message).toContain('1 blocking finding');
  });

  it('treats an ambiguous exact binding as an indeterminate blocking finding', async () => {
    const baseGraph = fixtureGraph({ rootDir: workspace });
    const nodes = [
      ...baseGraph.nodes,
      {
        id: 'src/service-copy.ts#ServiceCopy:class',
        sourceId: 'src/service-copy.ts#ServiceCopy:class',
        kind: 'class',
        file: 'src/service.ts',
      },
    ].sort((left, right) => left.id.localeCompare(right.id));
    writeActiveGraph(graphDatabase, {
      ...baseGraph,
      nodes,
      fingerprint: canonicalProjectGraphFingerprint(nodes, baseGraph.edges),
    });

    const source = fixturePackSource();
    const binding = source.spec.bindings[0];
    if (!binding || binding.kind !== 'implementation') {
      throw new Error('Expected the fixture implementation binding');
    }
    const ambiguousSource: ConventionPackSource = {
      ...source,
      spec: {
        ...source.spec,
        bindings: [
          {
            ...binding,
            target: {
              type: 'code-node',
              workspaceId: FIXTURE_WORKSPACE_ID,
              graphNamespace: FIXTURE_GRAPH_NAMESPACE,
              file: 'src/service.ts',
              kind: 'class',
            },
          },
        ],
      },
    };
    fs.writeFileSync(packPath, JSON.stringify(ambiguousSource, null, 2));
    log.mockClear();

    const result = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--json',
    ]);
    const output = capturedJson(log);

    expect(result.exitCode).toBe(1);
    expect(output.conformance.findings[0]).toMatchObject({
      outcome: 'indeterminate',
      diagnosticCodes: ['binding.implementation.implementer.ambiguous'],
    });
    expect(output.gate).toMatchObject({ failed: true, failureThreshold: 'error' });
    expect(output.gate.blockingFindingIds).toHaveLength(1);
  });

  it('returns exit 2 for an unavailable graph and writes a complete report on request', async () => {
    const missing = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      path.join(workspace, 'missing.db'),
    ]);
    expect(missing.exitCode).toBe(2);

    const reportPath = path.join(workspace, 'reports', 'convention.json');
    const written = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--output',
      reportPath,
    ]);
    expect(written.exitCode).toBe(0);
    expect(JSON.parse(fs.readFileSync(reportPath, 'utf8'))).toMatchObject({
      resultKind: 'convention-check',
      conformance: { resultKind: 'derived-conformance-report' },
    });
  });

  it('refuses to overwrite its pack or canonical graph database with the report', async () => {
    const graph = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--output',
      graphDatabase,
    ]);
    const pack = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--output',
      packPath,
    ]);
    const graphAlias = path.join(workspace, 'canonical-graph-alias.db');
    fs.symlinkSync(graphDatabase, graphAlias);
    const realWalPath = `${graphDatabase}-wal`;
    fs.rmSync(realWalPath, { force: true });
    const realSidecarViaAlias = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphAlias,
      '--output',
      realWalPath,
    ]);
    expect(realSidecarViaAlias.exitCode).toBe(2);
    expect(fs.existsSync(realWalPath)).toBe(false);
    const caseFoldedWalPath = path.join(
      path.dirname(graphDatabase),
      `${path.basename(graphDatabase).toUpperCase()}-WAL`
    );
    const caseFoldedSidecar = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--output',
      caseFoldedWalPath,
    ]);
    expect(caseFoldedSidecar.exitCode).toBe(2);
    expect(fs.existsSync(caseFoldedWalPath)).toBe(false);
    const sameDirectoryReport = path.join(path.dirname(graphDatabase), 'convention-report.json');
    const sameDirectory = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--output',
      sameDirectoryReport,
    ]);
    expect(sameDirectory.exitCode).toBe(2);
    expect(fs.existsSync(sameDirectoryReport)).toBe(false);
    const sidecar = `${graphDatabase}-wal`;
    const sidecarAlias = path.join(workspace, 'report-sidecar-alias.json');
    fs.writeFileSync(sidecar, 'sidecar-sentinel');
    fs.linkSync(sidecar, sidecarAlias);
    const aliasedSidecar = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--output',
      sidecarAlias,
    ]);

    expect(graph.exitCode).toBe(2);
    expect(pack.exitCode).toBe(2);
    expect(aliasedSidecar.exitCode).toBe(2);
    expect(() => JSON.parse(fs.readFileSync(packPath, 'utf8'))).not.toThrow();
    expect(fs.statSync(graphDatabase).size).toBeGreaterThan(0);
    expect(fs.readFileSync(sidecar, 'utf8')).toBe('sidecar-sentinel');
  });

  it('supports an exact manifest lock for CI', async () => {
    const manifestId = compileConventionPackFile(packPath, { workspaceRoot: workspace }).manifest
      .manifestId;
    const accepted = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--expected-manifest',
      manifestId,
    ]);
    const rejected = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--expected-manifest',
      `convention-pack:${'0'.repeat(64)}`,
    ]);

    expect(accepted.exitCode).toBe(0);
    expect(rejected.exitCode).toBe(2);
    expect(rejected.message).toContain('manifest pin mismatch');
  });

  it('replays an exact retained code revision instead of following the active pointer', async () => {
    const reader = new GraphRepository(graphDatabase, { readOnly: true });
    const retainedRevisionId = reader.readActiveRevision()!.metadata.revisionId;
    reader.close();
    writeActiveGraph(graphDatabase, fixtureGraph({ rootDir: workspace, includeTarget: false }));

    const active = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
    ]);
    log.mockClear();
    const retained = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--code-revision',
      retainedRevisionId,
      '--json',
    ]);
    const retainedOutput = capturedJson(log);
    const missing = await new ConventionCheckCommand().execute([
      '--pack',
      path.relative(workspace, packPath),
      '--graph-db',
      graphDatabase,
      '--code-revision',
      'missing-revision',
    ]);

    expect(active.exitCode).toBe(1);
    expect(retained.exitCode).toBe(0);
    expect(retainedOutput.codeRevisionId).toBe(retainedRevisionId);
    expect(missing.exitCode).toBe(2);
    expect(missing.message).toContain('Canonical graph revision not found');
  });

  it('applies warning, info, and never gates while keeping check and gate IDs deterministic', async () => {
    const run = async (threshold: ConventionFailureThreshold) => {
      log.mockClear();
      const result = await new ConventionCheckCommand().execute([
        '--pack',
        path.relative(workspace, packPath),
        '--graph-db',
        graphDatabase,
        '--fail-on',
        threshold,
        '--json',
      ]);
      return { result, output: capturedJson(log) };
    };

    fs.writeFileSync(packPath, JSON.stringify(missingImplementationPack('warning'), null, 2));
    const errorGate = await run('error');
    const warningGate = await run('warning');
    const infoGate = await run('info');
    const neverGate = await run('never');
    const repeatedWarningGate = await run('warning');

    expect([
      errorGate.result.exitCode,
      warningGate.result.exitCode,
      infoGate.result.exitCode,
      neverGate.result.exitCode,
    ]).toEqual([0, 1, 1, 0]);
    expect(
      new Set([errorGate, warningGate, infoGate, neverGate].map(({ output }) => output.checkId))
        .size
    ).toBe(1);
    expect(
      new Set([errorGate, warningGate, infoGate, neverGate].map(({ output }) => output.gate.gateId))
        .size
    ).toBe(4);
    expect(repeatedWarningGate.output.checkId).toBe(warningGate.output.checkId);
    expect(repeatedWarningGate.output.gate.gateId).toBe(warningGate.output.gate.gateId);

    fs.writeFileSync(packPath, JSON.stringify(missingImplementationPack('info'), null, 2));
    const warningAllowsInfo = await run('warning');
    const infoBlocksInfo = await run('info');

    expect(warningAllowsInfo.result.exitCode).toBe(0);
    expect(infoBlocksInfo.result.exitCode).toBe(1);
    expect(warningAllowsInfo.output.checkId).toBe(infoBlocksInfo.output.checkId);
    expect(warningAllowsInfo.output.gate.gateId).not.toBe(infoBlocksInfo.output.gate.gateId);
  });
});
