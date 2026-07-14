#!/usr/bin/env node
'use strict';

/** Proves the current checkout's public library API matches the CLI result. */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const graphDatabase = path.resolve(
  projectRoot,
  process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB ?? '.tsdoc/canonical-graph.db'
);
const packPath = path.join(projectRoot, 'managed', 'conventions', 'tsdoc-edge-core.json');
const cli = path.join(projectRoot, 'dist', 'cli.js');
const reportPath = path.join(
  os.tmpdir(),
  `tsdoc-edge-library-self-${process.pid}-${Date.now()}.json`
);

try {
  assertFile(cli, 'Run npm run build before this self-repository pilot');
  assertFile(graphDatabase, 'Canonical graph database not found; run canonical build first');
  assertFile(packPath, 'The self-repository convention pack is missing');
  const before = snapshotState();
  run(
    process.execPath,
    [
      cli,
      'convention',
      'check',
      `--pack=${packPath}`,
      `--graph-db=${graphDatabase}`,
      '--json',
      `--output=${reportPath}`,
    ],
    projectRoot
  );
  const cliReport = readJson(reportPath);
  const api = require(path.join(projectRoot, 'dist', 'index.js'));
  const graphRepository = new api.GraphRepository(graphDatabase, { readOnly: true });
  const codeRevision = graphRepository.readActiveRevision();
  graphRepository.close();
  if (!codeRevision) throw new Error('Canonical graph database has no active revision');

  const pack = api.compileConventionPackFile(packPath, { workspaceRoot: projectRoot });
  const governance = api.ConfigManager.getInstance(projectRoot).get().specGovernance;
  const libraryResult = new api.ConventionCheckService().run({
    pack,
    codeRevision,
    workspaceRoot: projectRoot,
    ...(governance?.naming ? { naming: governance.naming } : {}),
    ...(governance?.tsdoc ? { tsdoc: governance.tsdoc } : {}),
  });
  const libraryGate = api.evaluateConventionGate(libraryResult, 'error');
  assertEqual(libraryResult.checkId, cliReport.checkId, 'check identity');
  assertEqual(
    libraryResult.inputStamp.specRevisionId,
    cliReport.inputStamp.specRevisionId,
    'spec input identity'
  );
  assertEqual(
    libraryResult.inputStamp.enrichmentRevisionId,
    cliReport.inputStamp.enrichmentRevisionId,
    'enrichment input identity'
  );
  assertEqual(libraryGate.gateId, cliReport.gate.gateId, 'gate identity');
  if (libraryGate.failed !== cliReport.gate.failed) {
    throw new Error('Public library and CLI gate decisions diverged');
  }
  const after = snapshotState();
  if (stableJson(before) !== stableJson(after)) {
    throw new Error('Self-repository public library pilot mutated persisted state');
  }
  console.log(
    JSON.stringify(
      {
        contractId: 'tsdoc-edge/ttsc-library-self-pilot',
        contractVersion: '1.0',
        status: 'passed',
        graphRevisionId: codeRevision.metadata.revisionId,
        checkId: libraryResult.checkId,
        gateId: libraryGate.gateId,
        cliLibraryParity: true,
        persistedStateUnchanged: true,
      },
      null,
      2
    )
  );
} finally {
  fs.rmSync(reportPath, { force: true });
}

function run(command, args, cwd) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env: { ...process.env, TSDOC_EDGE_USAGE_ANALYTICS: '0', npm_config_update_notifier: 'false' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (status ${result.status}):\n${`${result.stdout}\n${result.stderr}`.slice(-4000)}`
    );
  }
  return result;
}

function snapshotState() {
  return ['.tsdoc/canonical-graph.db', '.tsdoc/registry.jsonl', '.tsdoc/symbols.db'].flatMap(
    (relativePath) =>
      [relativePath, `${relativePath}-wal`, `${relativePath}-shm`, `${relativePath}-journal`].map(
        (candidate) => ({
          file: candidate,
          content: fs.existsSync(path.join(projectRoot, candidate))
            ? fs.readFileSync(path.join(projectRoot, candidate)).toString('base64')
            : null,
        })
      )
  );
}

function assertFile(file, message) {
  if (!fs.existsSync(file)) throw new Error(message);
}

function assertEqual(left, right, label) {
  if (left !== right) throw new Error(`CLI and public library disagree on ${label}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stableJson(value) {
  return JSON.stringify(value);
}
