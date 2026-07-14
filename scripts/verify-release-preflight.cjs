#!/usr/bin/env node
'use strict';

/** Run the repository-local release preflight in a deterministic, non-parallel order. */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const projectRoot = path.resolve(__dirname, '..');
const evidencePath = path.resolve(
  projectRoot,
  process.env.TSDOC_EDGE_RELEASE_PREFLIGHT_OUTPUT ??
    path.join('.test-results', `release-preflight-${process.pid}.json`)
);
const steps = [
  ['verify:release-qualification', ['run', 'verify:release-qualification']],
  ['verify:platform-toolchain', ['run', 'verify:platform-toolchain']],
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['build', ['run', 'build']],
  ['verify:document-validation', ['run', 'verify:document-validation']],
  ['verify:runtime-contract', ['run', 'verify:runtime-contract']],
  ['verify:package-tarball', ['run', 'verify:package-tarball']],
  ['verify:ttsc-provider-tarball', ['run', 'verify:ttsc-provider-tarball']],
  ['verify:canonical-safety', ['run', 'verify:canonical-safety']],
  ['verify:work-context-differential', ['run', 'verify:work-context-differential']],
  ['verify:work-context-differential:broader', ['run', 'verify:work-context-differential:broader']],
  ['verify:c2-capability-matrix', ['run', 'verify:c2-capability-matrix']],
  ['test:in-band', ['test', '--', '--runInBand']],
  ['test:workers-2', ['test', '--', '--maxWorkers=2']],
];

const startedAt = new Date().toISOString();
const stepResults = [];
for (const [label, args] of steps) {
  console.log(`\n[release-preflight] ${label}`);
  const stepStartedAt = new Date().toISOString();
  const result = spawnSync(npmCommand, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) {
    stepResults.push({
      label,
      status: 'failed',
      startedAt: stepStartedAt,
      completedAt: new Date().toISOString(),
      reason: result.error.message,
    });
    fail(label, result.error.message, startedAt);
  }
  if (result.status !== 0) {
    stepResults.push({
      label,
      status: 'failed',
      startedAt: stepStartedAt,
      completedAt: new Date().toISOString(),
      exitCode: result.status,
    });
    fail(label, `exit ${result.status ?? 'unknown'}`, startedAt);
  }
  stepResults.push({
    label,
    status: 'passed',
    startedAt: stepStartedAt,
    completedAt: new Date().toISOString(),
    exitCode: 0,
  });
}

if (
  !emit({
    status: 'passed',
    startedAt,
    completedAt: new Date().toISOString(),
    steps: stepResults,
    externalMatrixRequired: true,
  })
) {
  process.exit(1);
}

function fail(step, reason, started) {
  emit({
    status: 'failed',
    startedAt: started,
    completedAt: new Date().toISOString(),
    failedStep: step,
    reason,
    steps: stepResults,
    externalMatrixRequired: true,
  });
  process.exit(1);
}

function emit(payload) {
  let persisted = false;
  const envelope = {
    contractId: 'tsdoc-edge/release-preflight',
    contractVersion: '1.2',
    ...payload,
    evidencePath: path.relative(projectRoot, evidencePath).split(path.sep).join('/'),
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      modulesAbi: process.versions.modules,
      v8: process.versions.v8,
    },
  };
  try {
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
    persisted = true;
  } catch (error) {
    console.error(
      `[release-preflight] failed to persist evidence: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const output = JSON.stringify(envelope, null, 2);
  if (envelope.status === 'passed') {
    console.log(output);
  } else {
    console.error(output);
  }
  return persisted;
}
