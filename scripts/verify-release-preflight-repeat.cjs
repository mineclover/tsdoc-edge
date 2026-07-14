#!/usr/bin/env node
'use strict';

/** Repeat the repository-local release preflight and validate every evidence envelope. */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const attempts = parseAttempts(process.env.TSDOC_EDGE_RELEASE_PREFLIGHT_ATTEMPTS);
const runId = `${Date.now()}-${process.pid}`;
const evidenceDirectory = path.join(projectRoot, '.test-results');
const summaryPath = path.join(evidenceDirectory, `release-preflight-repeat-${runId}.json`);
const results = [];
let referenceRuntime;

fs.mkdirSync(evidenceDirectory, { recursive: true });

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const evidencePath = path.join(
    evidenceDirectory,
    `release-preflight-${runId}-attempt-${attempt}.json`
  );
  const relativeEvidencePath = path.relative(projectRoot, evidencePath).split(path.sep).join('/');
  console.log(`\n[release-preflight-repeat] attempt ${attempt}/${attempts}`);

  const preflight = run(
    npmCommand,
    ['run', 'verify:release-preflight'],
    projectRoot,
    {
      ...process.env,
      TSDOC_EDGE_RELEASE_PREFLIGHT_OUTPUT: relativeEvidencePath,
    },
    true
  );

  const result = {
    attempt,
    status: preflight.status === 0 ? 'passed' : 'failed',
    evidencePath: relativeEvidencePath,
  };

  if (!fs.existsSync(evidencePath)) {
    result.status = 'failed';
    result.reason = 'Release preflight did not persist its evidence envelope';
    results.push(result);
    break;
  }

  const envelopeInspection = run(
    npmCommand,
    ['run', 'verify:release-preflight-envelope', '--', '--path', relativeEvidencePath],
    projectRoot,
    process.env,
    true
  );
  if (envelopeInspection.status !== 0) {
    result.status = 'failed';
    result.reason = 'Release preflight evidence failed read-only envelope inspection';
    results.push(result);
    break;
  }

  const envelope = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  if (envelope.status !== 'passed') {
    result.status = 'failed';
    result.failedStep = envelope.failedStep ?? null;
    result.reason = `Release preflight envelope status was ${String(envelope.status)}`;
    results.push(result);
    break;
  }
  if (envelope.contractVersion !== '1.2' || envelope.steps?.length !== 15) {
    result.status = 'failed';
    result.reason = 'Release preflight envelope did not use the current 1.2/15-step contract';
    results.push(result);
    break;
  }

  const runtime = JSON.stringify(envelope.runtime);
  if (referenceRuntime === undefined) referenceRuntime = runtime;
  if (runtime !== referenceRuntime) {
    result.status = 'failed';
    result.reason = 'Release preflight attempts used different local runtimes';
    results.push(result);
    break;
  }

  result.contractVersion = envelope.contractVersion;
  result.stepCount = envelope.steps.length;
  result.runtime = envelope.runtime;
  results.push(result);

  if (preflight.status !== 0) break;
}

const passed = results.length === attempts && results.every((result) => result.status === 'passed');
const summary = {
  contractId: 'tsdoc-edge/release-preflight-repeat',
  contractVersion: '1.0',
  status: passed ? 'passed' : 'failed',
  attempts,
  completedAttempts: results.length,
  results,
  externalMatrixRequired: true,
  productionMutation: false,
  evidencePath: path.relative(projectRoot, summaryPath).split(path.sep).join('/'),
};
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (!passed) process.exitCode = 1;

function parseAttempts(value) {
  if (value === undefined) return 2;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new Error('TSDOC_EDGE_RELEASE_PREFLIGHT_ATTEMPTS must be an integer from 1 to 8');
  }
  return parsed;
}

function run(command, args, cwd, env, inheritOutput) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env: { ...env, npm_config_update_notifier: 'false' },
    encoding: 'utf8',
    stdio: inheritOutput ? 'inherit' : 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}
