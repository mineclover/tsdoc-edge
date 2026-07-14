#!/usr/bin/env node
'use strict';

/** Prove the upstream ttsc graph-lint adapter reaches the convention gate. */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const routerModule = resolveRouterModule();
const cli = path.join(projectRoot, 'dist', 'cli.js');
const pack = path.join(projectRoot, 'managed', 'conventions', 'tsdoc-edge-core.json');
const rules = path.join(projectRoot, 'managed', 'conventions', 'tsdoc-edge-graph-lint.json');
const report = path.join(os.tmpdir(), `tsdoc-edge-graph-lint-${process.pid}-${Date.now()}.json`);

function resolveRouterModule() {
  const candidates = [
    process.env.TSDOC_EDGE_GRAPH_LINT_MODULE,
    path.join(projectRoot, '..', 'ttsc-graph-router', 'dist', 'index.js'),
    path.join(projectRoot, '..', 'ttsc-ex', 'packages', 'ttsc-graph-router', 'dist', 'index.js'),
  ].filter(Boolean);
  return path.resolve(candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]);
}

try {
  for (const [file, label] of [
    [cli, 'Build the repository before running the graph-lint proof'],
    [pack, 'The convention pack is missing'],
    [rules, 'The graph-lint rules file is missing'],
    [routerModule, 'Build ttsc graph-router or set TSDOC_EDGE_GRAPH_LINT_MODULE'],
  ]) {
    if (!fs.existsSync(file)) throw new Error(label);
  }

  run(
    process.execPath,
    [
      cli,
      'convention',
      'check',
      `--pack=${pack}`,
      `--graph-lint-rules=${rules}`,
      '--fail-on=error',
      '--json',
      `--output=${report}`,
    ],
    projectRoot,
    { ...process.env, TSDOC_EDGE_GRAPH_LINT_MODULE: routerModule }
  );

  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (result.graphLint.summary.rules !== 2) {
    throw new Error(`Expected two graph-lint rules, got ${result.graphLint.summary.rules}`);
  }
  if (result.graphLint.summary.violations !== 0 || result.graphLint.findings.length !== 0) {
    throw new Error('Graph-lint proof produced unexpected violations');
  }
  if (result.gate.failed) throw new Error('Convention gate failed for a passing graph-lint proof');

  console.log(
    JSON.stringify(
      {
        contractId: 'tsdoc-edge/ttsc-graph-lint-convention-poc',
        contractVersion: '1.0',
        status: 'passed',
        graphLintReportId: result.graphLint.reportId,
        graphLintSummary: result.graphLint.summary,
        conventionGateId: result.gate.gateId,
        conventionGateFailed: result.gate.failed,
      },
      null,
      2
    )
  );
} finally {
  fs.rmSync(report, { force: true });
}

function run(command, args, cwd, env) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (status ${result.status}):\n${`${result.stdout}\n${result.stderr}`.slice(-4000)}`
    );
  }
}
