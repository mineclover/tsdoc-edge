#!/usr/bin/env node
'use strict';

/**
 * Proves the ttsc provider survives separate packed installations without
 * allowing local router binary/config paths to change saved snapshot identity.
 */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const routerRoot = resolveRouterRoot();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-ttsc-provider-'));
const packageDirectory = path.join(tempRoot, 'packages');
const fixtureRoot = path.join(tempRoot, 'fixture');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  });
}

async function main() {
  let passed = false;
  try {
    assertFile(path.join(projectRoot, 'dist', 'cli.js'), 'Run npm run build before this canary');
    assertFile(
      path.join(routerRoot, 'package.json'),
      'Set TSDOC_EDGE_TTSC_ROUTER_DIR to the router package'
    );
    assertFile(
      path.join(routerRoot, 'dist', 'artifact-source.js'),
      'Build the ttsc graph-router package before this canary'
    );
    fs.mkdirSync(packageDirectory, { recursive: true });
    createFixture(fixtureRoot);

    const tsdocTarball = pack(projectRoot, packageDirectory);
    const routerTarball = pack(routerRoot, packageDirectory);
    const first = await runPackedConsumer('source-layout', tsdocTarball, routerTarball);
    const second = await runPackedConsumer('packed-layout', tsdocTarball, routerTarball);

    assertEqual(first.graph.fingerprint, second.graph.fingerprint, 'canonical content fingerprint');
    assertEqual(
      first.graph.provenance.providerSnapshotId,
      second.graph.provenance.providerSnapshotId,
      'provider snapshot identity'
    );
    assertEqual(first.revisionId, second.revisionId, 'canonical revision identity');
    for (const result of [first, second]) {
      if (result.graph.nodes.some((node) => node.id.startsWith('/'))) {
        throw new Error('Canonical node IDs must not contain absolute paths');
      }
      if (result.graph.provenance.compilerVersion !== null) {
        throw new Error('The router must not infer an unreported compiler version');
      }
      if (
        !result.cliProof.canonicalWorkContext ||
        !result.cliProof.structuralAnalysis ||
        !result.cliProof.canonicalGraphInspection ||
        !result.cliProof.specGraphInspection
      ) {
        throw new Error('Packed consumer did not complete the canonical CLI proof');
      }
      if (
        !result.cliProof.managedSpecExtraction ||
        !result.cliProof.evidenceLoaded ||
        !result.cliProof.tsdocEnrichment ||
        !result.cliProof.graphLint ||
        !result.cliProof.publicLibraryPilot
      ) {
        throw new Error('Packed consumer did not complete the full convention input proof');
      }
      if (
        !result.cliProof.retentionLifecycle ||
        !result.cliProof.coverageReportInspection ||
        !result.cliProof.coverageBaseline ||
        !result.cliProof.coverageBaselineInspection
      ) {
        throw new Error('Packed consumer did not complete the product operations proof');
      }
      if (result.cliProof.conventionCheck.gate?.failed !== false) {
        throw new Error('Packed consumer convention check did not pass');
      }
      if (result.cliProof.legacyStateChanged) {
        throw new Error('Canonical-only packed pilot mutated legacy state');
      }
    }

    console.log(
      JSON.stringify(
        {
          contractId: 'tsdoc-edge/ttsc-provider-packed-canary',
          contractVersion: '1.6',
          status: 'passed',
          nodeCount: first.graph.nodes.length,
          edgeCount: first.graph.edges.length,
          snapshotId: first.graph.provenance.providerSnapshotId,
          revisionId: first.revisionId,
          cliProof: {
            canonicalWorkContext: true,
            structuralAnalysis: true,
            canonicalGraphInspection: true,
            specGraphInspection: true,
            managedSpecExtraction: true,
            evidenceLoaded: true,
            tsdocEnrichment: true,
            graphLint: true,
            publicLibraryPilot: true,
            conventionCheck: true,
            retentionLifecycle: true,
            coverageReportInspection: true,
            coverageBaseline: true,
            coverageBaselineInspection: true,
            legacyStateUnchanged: true,
          },
        },
        null,
        2
      )
    );
    passed = true;
  } finally {
    if (!passed && process.env.TSDOC_EDGE_KEEP_TTSC_PROVIDER_CANARY === '1') {
      console.error(`Preserving failed ttsc provider canary at ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

function createFixture(root) {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'managed'), { recursive: true });
  writeJson(path.join(root, 'package.json'), {
    name: 'ttsc-provider-fixture',
    private: true,
    version: '0.0.0',
  });
  writeJson(path.join(root, '.tsdoc.config.json'), {
    project: { name: 'fixture', version: '0.0.0', srcDirs: ['src'] },
    paths: {
      commentsDir: 'docs/comments',
      databasePath: '.tsdoc/legacy.db',
      jsonlDir: '.tsdoc/data',
    },
    specGovernance: {
      authoredSpecDirs: ['managed'],
      tsdoc: {
        contractVersion: '1.0',
        rules: [
          {
            id: 'external-public-interface-tag',
            path: 'src/index.ts',
            pathCase: 'sensitive',
            kinds: ['interface'],
            exported: true,
            requiredTags: ['public'],
            severity: 'error',
          },
        ],
      },
    },
  });
  writeJson(path.join(root, 'tsconfig.json'), {
    compilerOptions: { target: 'ES2022', module: 'NodeNext' },
  });
  fs.writeFileSync(
    path.join(root, 'src', 'index.ts'),
    '/** @public */\nexport interface Answer { value: number; }\nexport const answer: Answer = { value: 42 };\nexport function readAnswer(): number { return answer.value; }\n',
    'utf8'
  );
  run('git', ['init', '--quiet'], root);
  run('git', ['add', '.'], root);
  run(
    'git',
    [
      '-c',
      'user.name=ttsc-provider-canary',
      '-c',
      'user.email=canary@example.test',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
    root
  );
}

function resolveRouterRoot() {
  if (process.env.TSDOC_EDGE_TTSC_ROUTER_DIR) {
    return path.resolve(process.env.TSDOC_EDGE_TTSC_ROUTER_DIR);
  }
  const candidates = [
    path.join(projectRoot, '..', 'ttsc-graph-router'),
    path.join(projectRoot, '..', 'ttsc-ex', 'packages', 'ttsc-graph-router'),
  ];
  return (
    candidates.find((candidate) => fs.existsSync(path.join(candidate, 'package.json'))) ??
    candidates[0]
  );
}

function pack(cwd, destination) {
  const output = run(npm, ['pack', '--json', '--pack-destination', destination], cwd).stdout;
  const metadata = JSON.parse(output);
  if (
    !Array.isArray(metadata) ||
    metadata.length !== 1 ||
    typeof metadata[0]?.filename !== 'string'
  ) {
    throw new Error(`npm pack returned invalid metadata for ${cwd}`);
  }
  const tarball = path.join(destination, metadata[0].filename);
  assertFile(tarball, `npm pack did not produce ${metadata[0].filename}`);
  return tarball;
}

async function runPackedConsumer(name, tsdocTarball, routerTarball) {
  const consumer = path.join(tempRoot, name);
  fs.mkdirSync(consumer, { recursive: true });
  fs.rmSync(path.join(fixtureRoot, '.tsdoc'), { recursive: true, force: true });
  writeJson(path.join(consumer, 'package.json'), { name, private: true, version: '0.0.0' });
  run(npm, ['install', '--no-audit', '--no-fund', tsdocTarball, routerTarball], consumer);
  const routerConfig = path.join(consumer, 'router.config.json');
  writeJson(routerConfig, {
    cacheDir: '.router-cache',
    repos: { fixture: { cwd: fixtureRoot, tsconfig: 'tsconfig.json' } },
  });
  const databasePath = path.join(fixtureRoot, '.tsdoc', 'canonical-graph.db');
  const cli = path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'cli.js');
  run(
    process.execPath,
    [
      cli,
      'build',
      'src',
      '--canonical-graph',
      '--canonical-only',
      '--router-module=@ttsc-ex/ttsc-graph-router/artifact-source',
      `--router-config=${routerConfig}`,
      '--router-repo=fixture',
      '--graph-workspace=packed-provider-fixture',
      '--graph-namespace=ttsc:packed-provider-fixture',
      '--graph-tsconfig=tsconfig.json',
      `--canonical-graph-db=${databasePath}`,
    ],
    fixtureRoot
  );
  const legacyStateBefore = snapshotLegacyState();
  const structuralResult = run(
    process.execPath,
    [
      cli,
      'relationship',
      'analyze',
      '--type=structural',
      '--router-module=@ttsc-ex/ttsc-graph-router/artifact-source',
      `--router-config=${routerConfig}`,
      '--router-repo=fixture',
      '--graph-tsconfig=tsconfig.json',
      `--canonical-graph-db=${databasePath}`,
    ],
    fixtureRoot
  );
  const workContextPath = path.join(tempRoot, `${name}-work-context.md`);
  run(
    process.execPath,
    [cli, 'work-context', 'src/index.ts', '--llm', '--output', workContextPath],
    fixtureRoot
  );
  const workContext = fs.readFileSync(workContextPath, 'utf8');
  if (!workContext.includes('## Canonical Structural Graph')) {
    throw new Error(`Packed consumer ${name} did not expose canonical work-context output`);
  }

  const { GraphRepository } = require(
    path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'storage', 'GraphRepository')
  );
  const repository = new GraphRepository(databasePath);
  const active = repository.readActiveRevision();
  repository.close();
  if (!active) throw new Error(`Missing active canonical revision for ${name}`);
  const graphStatus = runJson(
    process.execPath,
    [cli, 'canonical-graph', 'status', `--graph-db=${databasePath}`, '--json'],
    fixtureRoot
  );
  if (
    graphStatus.operation !== 'status' ||
    graphStatus.active?.revisionId !== active.metadata.revisionId ||
    graphStatus.retainedRevisionCount < 1
  ) {
    throw new Error(
      `Packed consumer ${name} canonical graph status did not expose the active revision`
    );
  }
  const graphList = runJson(
    process.execPath,
    [cli, 'canonical-graph', 'list', `--graph-db=${databasePath}`, '--json'],
    fixtureRoot
  );
  if (
    graphList.operation !== 'list' ||
    !graphList.summaries?.some(
      (summary) => summary.active && summary.revisionId === active.metadata.revisionId
    )
  ) {
    throw new Error(
      `Packed consumer ${name} canonical graph list did not mark the active revision`
    );
  }
  const graphRead = runJson(
    process.execPath,
    [
      cli,
      'canonical-graph',
      'read',
      `--graph-db=${databasePath}`,
      `--revision-id=${active.metadata.revisionId}`,
      '--json',
    ],
    fixtureRoot
  );
  if (
    graphRead.operation !== 'read' ||
    graphRead.revision?.metadata?.revisionId !== active.metadata.revisionId ||
    graphRead.revision?.graph?.fingerprint !== active.graph.fingerprint
  ) {
    throw new Error(
      `Packed consumer ${name} canonical graph read did not reproduce the exact revision`
    );
  }
  const implementationNode = active.graph.nodes.find(
    (node) =>
      node.external !== true &&
      typeof node.file === 'string' &&
      node.file.endsWith('src/index.ts') &&
      (node.kind === 'function' || node.kind === 'variable')
  );
  if (!implementationNode) {
    throw new Error(`Packed consumer ${name} did not produce an implementation node`);
  }

  const specDocument = path.join(fixtureRoot, 'managed', 'external-api.md');
  const specDeclaration = {
    requirements: [
      {
        id: 'REQ-EXTERNAL-EXPORT',
        title: 'External library export is present in the saved graph',
        tags: ['implementation'],
      },
    ],
    bindings: [
      {
        id: 'BIND-EXTERNAL-EXPORT',
        kind: 'implementation',
        specNodeId: 'REQ-EXTERNAL-EXPORT',
        target: {
          type: 'code-node',
          workspaceId: active.graph.provenance.workspaceId,
          graphNamespace: active.graph.provenance.graphNamespace,
          canonicalNodeId: implementationNode.id,
        },
      },
    ],
  };
  fs.writeFileSync(
    specDocument,
    [
      '---',
      'type: project-spec',
      'status: active',
      'tags:',
      '  - external-pilot',
      '---',
      '# [[ExternalApi]]',
      '',
      '```tsdoc-spec',
      JSON.stringify(specDeclaration, null, 2),
      '```',
      '',
    ].join('\n'),
    'utf8'
  );
  const specDatabasePath = path.join(fixtureRoot, '.tsdoc', 'spec-graph.db');
  run(
    process.execPath,
    [cli, 'spec', 'extract', '--spec-db', specDatabasePath, '--json'],
    fixtureRoot
  );
  const { SpecGraphRepository } = require(
    path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'storage', 'SpecGraphRepository')
  );
  const specRepository = new SpecGraphRepository(specDatabasePath, { readOnly: true });
  const activeSpec = specRepository.readActiveRevision();
  specRepository.close();
  if (!activeSpec || activeSpec.bindings.length !== 1) {
    throw new Error(`Packed consumer ${name} did not produce an active managed spec revision`);
  }
  const specStatus = runJson(
    process.execPath,
    [cli, 'spec', 'graph', 'status', `--spec-db=${specDatabasePath}`, '--json'],
    fixtureRoot
  );
  if (
    specStatus.operation !== 'status' ||
    specStatus.active?.revisionId !== activeSpec.revisionId ||
    specStatus.retainedRevisionCount < 1
  ) {
    throw new Error(`Packed consumer ${name} spec graph status did not expose the active revision`);
  }
  const specList = runJson(
    process.execPath,
    [cli, 'spec', 'graph', 'list', `--spec-db=${specDatabasePath}`, '--json'],
    fixtureRoot
  );
  if (
    specList.operation !== 'list' ||
    !specList.summaries?.some(
      (summary) => summary.active && summary.revisionId === activeSpec.revisionId
    )
  ) {
    throw new Error(`Packed consumer ${name} spec graph list did not mark the active revision`);
  }
  const specRead = runJson(
    process.execPath,
    [
      cli,
      'spec',
      'graph',
      'read',
      `--spec-db=${specDatabasePath}`,
      `--revision-id=${activeSpec.revisionId}`,
      '--json',
    ],
    fixtureRoot
  );
  if (
    specRead.operation !== 'read' ||
    specRead.revision?.revisionId !== activeSpec.revisionId ||
    specRead.revision?.contentFingerprint !== activeSpec.contentFingerprint
  ) {
    throw new Error(`Packed consumer ${name} spec graph read did not reproduce the exact revision`);
  }
  if (
    activeSpec.bindings[0].kind !== 'implementation' ||
    activeSpec.bindings[0].target.canonicalNodeId !== implementationNode.id
  ) {
    throw new Error(
      `Packed consumer ${name} managed spec binding does not target the canonical node`
    );
  }

  createJestEvidenceFixture(fixtureRoot);
  const packPath = path.join(fixtureRoot, `${name}-convention.json`);
  writeJson(packPath, createConventionPack(active.graph, activeSpec));
  const graphLintRulesPath = path.join(fixtureRoot, `${name}-graph-lint.json`);
  writeJson(graphLintRulesPath, createPackedGraphLintRules(implementationNode.id));
  const graphLintModulePath = path.join(
    consumer,
    'node_modules',
    '@ttsc-ex',
    'ttsc-graph-router',
    'dist',
    'index.js'
  );
  assertFile(graphLintModulePath, `Packed consumer ${name} did not install the graph-lint module`);
  const reportPath = path.join(tempRoot, `${name}-convention-report.json`);
  const evidencePath = path.join(fixtureRoot, 'jest.json');
  const historyPath = path.join(tempRoot, `${name}-convention-history.db`);
  run(
    process.execPath,
    [
      cli,
      'convention',
      'check',
      `--pack=${packPath}`,
      `--graph-db=${databasePath}`,
      `--evidence=${evidencePath}`,
      `--graph-lint-rules=${graphLintRulesPath}`,
      `--history-db=${historyPath}`,
      '--fail-on=error',
      '--json',
      `--output=${reportPath}`,
    ],
    fixtureRoot,
    { TSDOC_EDGE_GRAPH_LINT_MODULE: graphLintModulePath }
  );
  const conventionCheck = readJson(reportPath);
  if (conventionCheck.inputStamp.specRevisionId.includes('canonical-empty')) {
    throw new Error(`Packed consumer ${name} did not consume the managed spec revision`);
  }
  if (conventionCheck.inputStamp.evidenceRevisionId.includes('canonical-empty')) {
    throw new Error(`Packed consumer ${name} did not consume Jest evidence`);
  }
  if (conventionCheck.inputStamp.enrichmentRevisionId.includes('canonical-empty')) {
    throw new Error(`Packed consumer ${name} did not consume TSDoc enrichment`);
  }
  if (conventionCheck.tsdoc.evaluatedSubjectCount === 0) {
    throw new Error(`Packed consumer ${name} did not evaluate TSDoc convention subjects`);
  }
  if (
    conventionCheck.graphLint?.summary?.rules !== 1 ||
    conventionCheck.graphLint.summary.violations !== 0 ||
    conventionCheck.graphLint.findings.length !== 0 ||
    conventionCheck.gate?.failed !== false
  ) {
    throw new Error(`Packed consumer ${name} did not pass the ttsc graph-lint convention gate`);
  }
  const operationalProof = runOperationalPilot({
    cli,
    consumer,
    fixtureRoot,
    historyPath,
    codeRevision: active,
  });
  await runPublicLibraryPilot({
    consumer,
    databasePath,
    specDatabasePath,
    packPath,
    evidencePath,
    fixtureRoot,
    cliReport: conventionCheck,
    graphLintRulesPath,
    graphLintModulePath,
  });
  const legacyStateAfter = snapshotLegacyState();
  const legacyStateChanged = stableJson(legacyStateAfter) !== stableJson(legacyStateBefore);
  return {
    revisionId: active.metadata.revisionId,
    graph: active.graph,
    cliProof: {
      canonicalWorkContext: true,
      structuralAnalysis: structuralResult.stdout.includes('Canonical snapshot persisted'),
      canonicalGraphInspection: true,
      specGraphInspection: true,
      managedSpecExtraction: true,
      evidenceLoaded: true,
      tsdocEnrichment: true,
      graphLint: true,
      publicLibraryPilot: true,
      conventionCheck,
      retentionLifecycle: operationalProof.retentionLifecycle,
      coverageReportInspection: operationalProof.coverageReportInspection,
      coverageBaseline: operationalProof.coverageBaseline,
      coverageBaselineInspection: operationalProof.coverageBaselineInspection,
      legacyStateChanged,
    },
  };
}

function runOperationalPilot({ cli, consumer, fixtureRoot, historyPath, codeRevision }) {
  const cutoff = '2099-01-01T00:00:00.000Z';
  const listed = runJson(
    process.execPath,
    [
      cli,
      'convention',
      'retention',
      'list',
      `--history-db=${historyPath}`,
      `--before=${cutoff}`,
      '--json',
    ],
    fixtureRoot
  );
  if (listed.operation !== 'list' || listed.summaries?.length !== 1) {
    throw new Error('Packed consumer retention list did not expose exactly one history entry');
  }
  const historyId = listed.summaries[0].historyId;
  const pinned = runJson(
    process.execPath,
    [
      cli,
      'convention',
      'retention',
      'pin',
      `--history-db=${historyPath}`,
      `--history-id=${historyId}`,
      '--reason=packed-canary',
      '--json',
    ],
    fixtureRoot
  );
  if (pinned.pin?.historyId !== historyId) {
    throw new Error('Packed consumer retention pin did not preserve history identity');
  }
  const preview = runJson(
    process.execPath,
    [
      cli,
      'convention',
      'retention',
      'gc',
      `--history-db=${historyPath}`,
      `--before=${cutoff}`,
      '--dry-run',
      '--json',
    ],
    fixtureRoot
  );
  if (
    preview.summaries?.length !== 1 ||
    preview.summaries[0].historyId !== historyId ||
    preview.summaries[0].pinned !== true
  ) {
    throw new Error('Packed consumer retention dry-run did not protect the pinned history');
  }
  runJson(
    process.execPath,
    [
      cli,
      'convention',
      'retention',
      'unpin',
      `--history-db=${historyPath}`,
      `--history-id=${historyId}`,
      '--json',
    ],
    fixtureRoot
  );
  const collected = runJson(
    process.execPath,
    [
      cli,
      'convention',
      'retention',
      'gc',
      `--history-db=${historyPath}`,
      `--before=${cutoff}`,
      '--reason=packed-canary-gc',
      '--json',
    ],
    fixtureRoot
  );
  if (collected.tombstoned?.length !== 1 || collected.tombstoned[0].historyId !== historyId) {
    throw new Error('Packed consumer retention GC did not tombstone the unpinned history');
  }

  const api = require(path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'index.js'));
  const coverageSourcePath = path.join(fixtureRoot, 'coverage.json');
  const coverageSource = JSON.stringify({ lines: { covered: 8, total: 10 } });
  fs.writeFileSync(coverageSourcePath, `${coverageSource}\n`, 'utf8');
  const source = api.createCoverageSourceIdentity(coverageSourcePath, coverageSource, {
    workspaceId: codeRevision.graph.provenance.workspaceId,
    capturedAt: '2026-01-01T00:00:00.000Z',
  });
  const metric = api.createCoverageMetricResult(source, 'execution.line', 8, 10, {
    status: 'direct',
    gate: 'report-only',
  });
  const reportId = `coverage-report:${source.sourceIdentity}`;
  const reportDatabase = path.join(fixtureRoot, '.tsdoc', 'coverage-metrics.db');
  const reportRepository = new api.CoverageMetricReportRepository(reportDatabase);
  reportRepository.storeReport({
    reportId,
    workspaceId: codeRevision.graph.provenance.workspaceId,
    source,
    metrics: [metric],
    fileMetrics: [],
  });
  reportRepository.close();

  const listedReports = runJson(
    process.execPath,
    [
      cli,
      'coverage-report',
      'list',
      `--workspace=${codeRevision.graph.provenance.workspaceId}`,
      `--report-db=${reportDatabase}`,
      '--json',
    ],
    fixtureRoot
  );
  if (
    listedReports.operation !== 'list' ||
    listedReports.pins?.length !== 1 ||
    listedReports.pins[0].reportId !== reportId
  ) {
    throw new Error('Packed consumer coverage report list did not expose the saved report');
  }
  const readReport = runJson(
    process.execPath,
    [
      cli,
      'coverage-report',
      'read',
      `--workspace=${codeRevision.graph.provenance.workspaceId}`,
      `--report-db=${reportDatabase}`,
      `--report-id=${reportId}`,
      '--json',
    ],
    fixtureRoot
  );
  if (
    readReport.operation !== 'read' ||
    readReport.report?.reportId !== reportId ||
    readReport.report?.metrics?.length !== 1
  ) {
    throw new Error('Packed consumer coverage report read did not reproduce the saved report');
  }

  const baselineDatabase = path.join(fixtureRoot, '.tsdoc', 'coverage-baselines.db');
  const graphArgs = [
    `--graph-revision=${codeRevision.metadata.revisionId}`,
    `--graph-fingerprint=${codeRevision.graph.fingerprint}`,
  ];
  const saved = runJson(
    process.execPath,
    [
      cli,
      'coverage-baseline',
      'save',
      `--workspace=${codeRevision.graph.provenance.workspaceId}`,
      `--report-db=${reportDatabase}`,
      `--baseline-db=${baselineDatabase}`,
      `--report-id=${reportId}`,
      ...graphArgs,
      '--json',
    ],
    fixtureRoot
  );
  if (typeof saved.baselineId !== 'string' || saved.metricIds?.length !== 1) {
    throw new Error('Packed consumer coverage baseline save did not return one baseline');
  }
  const listedBaselines = runJson(
    process.execPath,
    [
      cli,
      'coverage-baseline',
      'list',
      `--workspace=${codeRevision.graph.provenance.workspaceId}`,
      `--baseline-db=${baselineDatabase}`,
      '--json',
    ],
    fixtureRoot
  );
  if (
    listedBaselines.operation !== 'list' ||
    listedBaselines.pins?.length !== 1 ||
    listedBaselines.pins[0].baselineId !== saved.baselineId
  ) {
    throw new Error('Packed consumer coverage baseline list did not expose the saved baseline');
  }
  const readBaseline = runJson(
    process.execPath,
    [
      cli,
      'coverage-baseline',
      'read',
      `--workspace=${codeRevision.graph.provenance.workspaceId}`,
      `--baseline-db=${baselineDatabase}`,
      `--baseline-id=${saved.baselineId}`,
      '--json',
    ],
    fixtureRoot
  );
  if (readBaseline.operation !== 'read' || readBaseline.baseline?.baselineId !== saved.baselineId) {
    throw new Error('Packed consumer coverage baseline read did not reproduce the saved baseline');
  }
  const compared = runJson(
    process.execPath,
    [
      cli,
      'coverage-baseline',
      'compare',
      `--workspace=${codeRevision.graph.provenance.workspaceId}`,
      `--report-db=${reportDatabase}`,
      `--baseline-db=${baselineDatabase}`,
      `--report-id=${reportId}`,
      `--baseline-id=${saved.baselineId}`,
      ...graphArgs,
      '--json',
    ],
    fixtureRoot
  );
  if (compared.comparisons?.length !== 1 || compared.comparisons[0].status !== 'unchanged') {
    throw new Error('Packed consumer coverage baseline compare did not reproduce unchanged input');
  }
  return {
    retentionLifecycle: true,
    coverageReportInspection: true,
    coverageBaseline: true,
    coverageBaselineInspection: true,
  };
}

async function runPublicLibraryPilot({
  consumer,
  databasePath,
  specDatabasePath,
  packPath,
  evidencePath,
  fixtureRoot,
  cliReport,
  graphLintRulesPath,
  graphLintModulePath,
}) {
  const api = require(path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'index.js'));
  const graphRepository = new api.GraphRepository(databasePath, { readOnly: true });
  const codeRevision = graphRepository.readActiveRevision();
  graphRepository.close();
  const specRepository = new api.SpecGraphRepository(specDatabasePath, { readOnly: true });
  const specRevision = specRepository.readActiveRevision();
  specRepository.close();
  if (!codeRevision || !specRevision) {
    throw new Error('Packed public library pilot could not read canonical/spec revisions');
  }
  const pack = api.compileConventionPackFile(packPath, { workspaceRoot: fixtureRoot });
  const evidence = api.loadJestJsonEvidence({
    artifactPath: evidencePath,
    workspaceRoot: fixtureRoot,
    workspaceId: pack.manifest.scope.workspaceId,
  });
  const governance = api.ConfigManager.getInstance(fixtureRoot).get().specGovernance;
  const graphLint = await api.evaluateTtscGraphLintFile({
    workspaceRoot: fixtureRoot,
    graph: codeRevision.graph,
    filePath: graphLintRulesPath,
    moduleSpecifier: graphLintModulePath,
  });
  const result = new api.ConventionCheckService().run({
    pack,
    codeRevision,
    workspaceRoot: fixtureRoot,
    evidence,
    ...(governance?.naming ? { naming: governance.naming } : {}),
    ...(governance?.tsdoc ? { tsdoc: governance.tsdoc } : {}),
    graphLint,
  });
  const gate = api.evaluateConventionGate(result, 'error');
  if (
    result.checkId !== cliReport.checkId ||
    result.inputStamp.specRevisionId !== cliReport.inputStamp.specRevisionId ||
    result.inputStamp.evidenceRevisionId !== cliReport.inputStamp.evidenceRevisionId ||
    result.inputStamp.enrichmentRevisionId !== cliReport.inputStamp.enrichmentRevisionId ||
    gate.gateId !== cliReport.gate.gateId ||
    gate.failed !== cliReport.gate.failed
  ) {
    throw new Error('Packed public library pilot diverged from the CLI convention result');
  }
}

function createPackedGraphLintRules(canonicalNodeId) {
  return {
    rules: [
      {
        id: 'packed-canonical-node-is-observable',
        severity: 'error',
        seed: { ids: [canonicalNodeId] },
        requireWithin: {
          depth: 0,
          direction: 'forward',
          includeSeed: true,
          match: { ids: [canonicalNodeId] },
        },
        traversal: {},
      },
    ],
  };
}

function createConventionPack(graph, specRevision) {
  const implementationBinding = specRevision.bindings.find(
    (binding) => binding.kind === 'implementation'
  );
  if (!implementationBinding || implementationBinding.target.type !== 'code-node') {
    throw new Error('Managed spec revision must contain one code-node implementation binding');
  }
  return {
    contractId: 'tsdoc-edge/convention-pack-source',
    contractVersion: '1.0',
    packId: '@example/external-conventions/core',
    packVersion: '1.0.0',
    scope: { kind: 'workspace', workspaceId: graph.provenance.workspaceId },
    graphNamespace: graph.provenance.graphNamespace,
    capabilities: {},
    spec: {
      nodes: specRevision.nodes.map(({ source, ...node }) => node),
      edges: specRevision.edges.map(({ id, evidence, provenance, ...edge }) => edge),
      bindings: specRevision.bindings.map(({ source, provenance, ...binding }) => binding),
    },
    policy: {
      lifecycleGateVersion: '1.0.0',
      rules: [{ id: 'binding.implementation', version: '1.0.0', enabled: true, severity: 'error' }],
      suppressions: [],
    },
  };
}

function createJestEvidenceFixture(root) {
  const testDist = path.join(root, '.test-dist');
  fs.mkdirSync(testDist, { recursive: true });
  const sourcePath = path.join(root, 'src', 'index.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  fs.writeFileSync(path.join(testDist, 'external.test.js'), 'exports.external = true;\n', 'utf8');
  writeJson(path.join(testDist, 'external.test.js.map'), {
    version: 3,
    sources: ['../src/index.ts'],
    sourcesContent: [source],
  });
  writeJson(path.join(root, 'jest.json'), {
    success: true,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numTotalTests: 1,
    testResults: [
      {
        name: path.join(root, '.test-dist', 'external.test.js'),
        endTime: 0,
        assertionResults: [
          { fullName: 'external API is available', status: 'passed', duration: 1 },
        ],
      },
    ],
  });
}

function run(command, args, cwd, environment = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      ...environment,
      TSDOC_EDGE_USAGE_ANALYTICS: '0',
      npm_config_update_notifier: 'false',
    },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (status ${result.status}, signal ${result.signal ?? 'none'}):\n${`${result.stdout}\n${result.stderr}`.slice(-4000)}`
    );
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function runJson(command, args, cwd) {
  const result = run(command, args, cwd);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Expected JSON output from ${command} ${args.join(' ')}: ${error instanceof Error ? error.message : String(error)}\n${result.stdout}`
    );
  }
}

function assertFile(file, message) {
  if (!fs.existsSync(file)) throw new Error(message);
}

function assertEqual(left, right, label) {
  if (left !== right) throw new Error(`Packed consumers disagree on ${label}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function snapshotLegacyState() {
  return ['.tsdoc/legacy.db', '.tsdoc/registry.jsonl'].flatMap((relativePath) => {
    const file = path.join(fixtureRoot, relativePath);
    return [file, `${file}-wal`, `${file}-shm`, `${file}-journal`].map((candidate) => ({
      file: candidate,
      content: fs.existsSync(candidate) ? fs.readFileSync(candidate).toString('base64') : null,
    }));
  });
}

function stableJson(value) {
  return JSON.stringify(value);
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
