#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'dist', 'cli.js');
const packPath = path.join(projectRoot, 'managed', 'conventions', 'tsdoc-edge-core.json');
const proofRoot = path.join(projectRoot, '.test-results', 'convention-poc');
const stateDirectory = path.join(proofRoot, 'state');
const reportDirectory = path.join(proofRoot, 'reports');
const logDirectory = path.join(proofRoot, 'logs');
const inputDirectory = path.join(proofRoot, 'inputs');
const routerConfigPath = path.join(inputDirectory, 'ttsc-graph-router.config.json');
const graphDatabase = path.join(stateDirectory, 'canonical-graph.db');
const projectIndexerNodeId = 'src/indexer/ProjectIndexer.ts#ProjectIndexer:class';

function main() {
  assertFile(cliPath, 'Build the repository before running the convention PoC');
  assertFile(packPath, 'The committed convention pack is missing');
  const routerModule = resolveRouterModule();
  resetProofDirectory();
  writeProofRouterConfig();
  const legacyStateBefore = snapshotLegacyState();

  runCli(
    'canonical-build',
    [
      'build',
      'src',
      '--canonical-graph',
      '--canonical-only',
      `--router-module=${routerModule}`,
      `--router-config=${routerConfigPath}`,
      '--router-repo=tsdoc-edge',
      '--graph-workspace=tsdoc-edge',
      '--graph-namespace=ttsc:tsdoc-edge',
      '--graph-tsconfig=tsconfig.ttsc.json',
      `--canonical-graph-db=${graphDatabase}`,
    ],
    0
  );
  const legacyStateAfter = snapshotLegacyState();
  if (stableJson(legacyStateAfter) !== stableJson(legacyStateBefore)) {
    throw new Error('Canonical-only build mutated legacy database or registry state');
  }

  const canonical = readCanonicalProof();
  const passPath = path.join(reportDirectory, 'pass.json');
  runCheck('pass', packPath, passPath, [], 0);
  const pass = readJson(passPath);
  assertPassReport(pass, canonical);

  const replayPath = path.join(reportDirectory, 'replay.json');
  runCheck(
    'exact-replay',
    packPath,
    replayPath,
    ['--code-revision', pass.codeRevisionId, '--expected-manifest', pass.pack.manifestId],
    0
  );
  const replay = readJson(replayPath);
  for (const [label, left, right] of [
    ['checkId', pass.checkId, replay.checkId],
    ['reportId', pass.conformance.reportId, replay.conformance.reportId],
    ['gateId', pass.gate.gateId, replay.gate.gateId],
  ]) {
    if (left !== right) throw new Error(`Exact replay changed ${label}: ${left} != ${right}`);
  }

  const missingPackPath = writeMissingImplementationPack();
  const missingPath = path.join(reportDirectory, 'missing-implementation.json');
  runCheck('missing-implementation', missingPackPath, missingPath, [], 1);
  const missing = readJson(missingPath);
  if (missing.gate?.failed !== true || missing.conformance?.findings?.[0]?.outcome !== 'violated') {
    throw new Error('Missing implementation canary did not produce a violated failing gate');
  }

  const invalidRevision = '0'.repeat(64);
  const invalidRevisionResult = runCheck(
    'invalid-code-revision',
    packPath,
    undefined,
    ['--code-revision', invalidRevision],
    2
  );
  assertCommandOutput(
    invalidRevisionResult,
    `Canonical graph revision not found: ${invalidRevision}`,
    'invalid-code-revision'
  );
  const invalidManifestResult = runCheck(
    'invalid-manifest-pin',
    packPath,
    undefined,
    [
      '--code-revision',
      pass.codeRevisionId,
      '--expected-manifest',
      `convention-pack:${'0'.repeat(64)}`,
    ],
    2
  );
  assertCommandOutput(
    invalidManifestResult,
    'Convention manifest pin mismatch',
    'invalid-manifest-pin'
  );

  const identity = {
    codeRevisionId: pass.codeRevisionId,
    codeGraphFingerprint: pass.codeGraphFingerprint,
    manifestId: pass.pack.manifestId,
    checkId: pass.checkId,
    reportId: pass.conformance.reportId,
    gateId: pass.gate.gateId,
  };
  const summary = {
    contractId: 'tsdoc-edge/convention-poc-proof',
    contractVersion: '1.0',
    proofId: `convention-poc:${digest(identity)}`,
    status: 'passed',
    canonical,
    convention: {
      packId: pass.pack.packId,
      packVersion: pass.pack.packVersion,
      ...identity,
    },
    canaries: {
      pass: { exitCode: 0, gateFailed: false },
      exactReplay: { exitCode: 0, identitiesStable: true },
      missingImplementation: { exitCode: 1, outcome: 'violated' },
      invalidCodeRevision: { exitCode: 2 },
      invalidManifestPin: { exitCode: 2 },
      legacyStateUnchanged: true,
    },
  };
  const summaryPath = path.join(proofRoot, 'summary.json');
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...summary, summaryPath }, null, 2));
}

function resolveRouterModule() {
  const candidates = [
    process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE,
    path.resolve(
      projectRoot,
      '..',
      'ttsc-ex',
      'packages',
      'ttsc-graph-router',
      'dist',
      'artifact-source.js'
    ),
  ].filter(Boolean);
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error(
      'No built ttsc graph-router module found; set TSDOC_EDGE_GRAPH_ROUTER_MODULE explicitly'
    );
  }
  return fs.realpathSync(resolved);
}

function resetProofDirectory() {
  const allowedRoot = path.join(projectRoot, '.test-results');
  if (path.dirname(proofRoot) !== allowedRoot || path.basename(proofRoot) !== 'convention-poc') {
    throw new Error(`Refusing to reset unexpected proof directory: ${proofRoot}`);
  }
  fs.rmSync(proofRoot, { recursive: true, force: true });
  for (const directory of [stateDirectory, reportDirectory, logDirectory, inputDirectory]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function writeProofRouterConfig() {
  const config = {
    cacheDir: path.join(stateDirectory, 'ttsc-graph-router-cache'),
    repos: {
      'tsdoc-edge': {
        cwd: projectRoot,
        tsconfig: 'tsconfig.ttsc.json',
      },
    },
  };
  fs.writeFileSync(routerConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function runCheck(name, sourcePack, outputPath, additionalArguments, expectedExitCode) {
  return runCli(
    name,
    [
      'convention',
      'check',
      '--pack',
      sourcePack,
      '--graph-db',
      graphDatabase,
      '--fail-on',
      'error',
      '--json',
      ...(outputPath ? ['--output', outputPath] : []),
      ...additionalArguments,
    ],
    expectedExitCode
  );
}

function runCli(name, arguments_, expectedExitCode) {
  const isolatedHome = path.join(stateDirectory, 'home');
  const result = spawnSync(process.execPath, [cliPath, ...arguments_], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: isolatedHome,
      USERPROFILE: isolatedHome,
      XDG_CACHE_HOME: path.join(isolatedHome, '.cache'),
      XDG_CONFIG_HOME: path.join(isolatedHome, '.config'),
      XDG_DATA_HOME: path.join(isolatedHome, '.local', 'share'),
      TSDOC_EDGE_USAGE_ANALYTICS: '0',
    },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  fs.writeFileSync(path.join(logDirectory, `${name}.stdout.log`), result.stdout ?? '', 'utf8');
  fs.writeFileSync(path.join(logDirectory, `${name}.stderr.log`), result.stderr ?? '', 'utf8');
  if (result.error) throw result.error;
  if (result.status !== expectedExitCode) {
    const detail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim().slice(-4000);
    throw new Error(
      `${name} exited ${String(result.status)}, expected ${expectedExitCode}${detail ? `\n${detail}` : ''}`
    );
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function assertCommandOutput(result, expectedText, commandName) {
  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes(expectedText)) {
    throw new Error(`${commandName} did not report the expected input error: ${expectedText}`);
  }
}

function readCanonicalProof() {
  const { GraphRepository } = require('../dist/storage/GraphRepository');
  const repository = new GraphRepository(graphDatabase, { readOnly: true });
  try {
    const active = repository.readActiveRevision();
    if (!active) throw new Error('Canonical PoC database has no active revision');
    const node = active.graph.nodes.find((candidate) => candidate.id === projectIndexerNodeId);
    if (!node) throw new Error(`Canonical PoC graph is missing ${projectIndexerNodeId}`);
    if (active.graph.provenance.graphNamespace !== 'ttsc:tsdoc-edge') {
      throw new Error('Canonical PoC graph namespace does not match the committed pack');
    }
    return {
      revisionId: active.metadata.revisionId,
      graphFingerprint: active.graph.fingerprint,
      nodeCount: active.graph.nodes.length,
      edgeCount: active.graph.edges.length,
      projectIndexerNodeId: node.id,
      producer: active.graph.provenance.producer,
      producerVersion: active.graph.provenance.producerVersion,
      routerName: active.graph.provenance.routerName,
      routerVersion: active.graph.provenance.routerVersion,
      compilerVersion: active.graph.provenance.compilerVersion,
      compilerVersionReported:
        active.graph.provenance.artifactCapabilities?.compilerVersionReported,
    };
  } finally {
    repository.close();
  }
}

function assertPassReport(report, canonical) {
  if (
    report.gate?.failed !== false ||
    report.conformance?.summary?.total !== 1 ||
    report.conformance?.summary?.satisfied !== 1 ||
    report.conformance?.findings?.[0]?.outcome !== 'satisfied'
  ) {
    throw new Error('Committed convention pack did not produce one satisfied non-blocking finding');
  }
  if (
    report.codeRevisionId !== canonical.revisionId ||
    report.codeGraphFingerprint !== canonical.graphFingerprint
  ) {
    throw new Error('Convention result does not pin the canonical PoC revision');
  }
  for (const [label, value, prefix] of [
    ['checkId', report.checkId, 'convention-check'],
    ['reportId', report.conformance?.reportId, 'conformance-report'],
    ['gateId', report.gate?.gateId, 'convention-gate'],
  ]) {
    assertContentAddressedId(value, prefix, label);
  }
}

function assertContentAddressedId(value, prefix, label) {
  if (typeof value !== 'string' || !new RegExp(`^${prefix}:[a-f0-9]{64}$`).test(value)) {
    throw new Error(`Convention pass report has an invalid ${label}: ${String(value)}`);
  }
}

function writeMissingImplementationPack() {
  const source = readJson(packPath);
  const binding = source.spec?.bindings?.[0];
  if (!binding || binding.kind !== 'implementation') {
    throw new Error(
      'Committed convention pack does not contain the expected implementation binding'
    );
  }
  binding.target.canonicalNodeId = 'src/missing.ts#Missing:class';
  const output = path.join(inputDirectory, 'missing-implementation.json');
  fs.writeFileSync(output, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  return output;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertFile(filePath, message) {
  if (!fs.existsSync(filePath)) throw new Error(`${message}: ${filePath}`);
}

function snapshotLegacyState() {
  return Object.fromEntries(
    [
      '.tsdoc.db',
      '.tsdoc.db-wal',
      '.tsdoc.db-shm',
      '.tsdoc.db-journal',
      '.tsdoc/registry.jsonl',
    ].map((relativePath) => {
      const filePath = path.join(projectRoot, relativePath);
      return [
        relativePath,
        fs.existsSync(filePath)
          ? { exists: true, contentDigest: digest(fs.readFileSync(filePath).toString('base64')) }
          : { exists: false },
      ];
    })
  );
}

function digest(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
