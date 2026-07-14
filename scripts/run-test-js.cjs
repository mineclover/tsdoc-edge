#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { spawnManaged, terminateManaged } = require('./process-group.cjs');
const { normalizeJestArguments } = require('./normalize-jest-arguments.cjs');
const { assertTestDistComplete } = require('./test-dist-manifest.cjs');
const { acquireTestLaneLock, withoutTestLaneLock } = require('./test-lane-lock.cjs');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, '.test-dist');
const jestConfig = path.join(projectRoot, 'jest.config.js');
const jestLauncher = require.resolve('jest/bin/jest');
const signalExitCodes = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGILL: 132,
  SIGABRT: 134,
  SIGBUS: 135,
  SIGFPE: 136,
  SIGSEGV: 139,
  SIGKILL: 137,
};
const jestArguments = normalizeJestArguments(process.argv.slice(2), projectRoot);
let activeChild;
let forwardedSignal;
let laneLock;
let cancelTermination = () => {};

function forwardSignal(signal) {
  forwardedSignal = signal;
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) {
    cancelTermination();
    cancelTermination = terminateManaged(activeChild, signal);
  }
}

function run(environment) {
  return new Promise((resolve, reject) => {
    const child = spawnManaged(
      spawn,
      process.execPath,
      [jestLauncher, '--config', jestConfig, ...jestArguments],
      {
        cwd: projectRoot,
        env: environment,
        stdio: 'inherit',
      }
    );
    activeChild = child;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      cancelTermination();
      if (activeChild === child) {
        activeChild = undefined;
      }
      callback(value);
    };
    child.once('error', (error) => finish(reject, error));
    child.once('close', (code, signal) => {
      const exitCode = code ?? signalExitCodes[signal] ?? 1;
      if (exitCode !== 0 || signal) {
        writeFailureDiagnostic({ code, signal, exitCode });
      }
      finish(resolve, exitCode);
    });
  });
}

function writeFailureDiagnostic({ code, signal, exitCode }) {
  const directory = path.join(projectRoot, '.test-results');
  const filePath = path.join(directory, `test-runtime-failure-${process.pid}.json`);
  const diagnostic = {
    contractId: 'tsdoc-edge/test-runtime-failure',
    contractVersion: '1.0',
    capturedAt: new Date().toISOString(),
    command: [process.execPath, jestLauncher, '--config', jestConfig, ...jestArguments],
    exitCode,
    code,
    signal,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      modulesAbi: process.versions.modules,
      v8: process.versions.v8,
    },
    rerun: `npm run test:run -- ${jestArguments.join(' ')}`,
  };
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(diagnostic, null, 2)}\n`, 'utf8');
    console.error(
      `[test:run] Jest terminated with ${signal ?? `exit ${exitCode}`}; diagnostics: ${filePath}`
    );
  } catch (error) {
    console.error(
      `[test:run] Failed to write runtime diagnostics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function main() {
  laneLock = acquireTestLaneLock('test:run');
  try {
    assertTestDistComplete(projectRoot, outputDirectory);
    const exitCode = await run(withoutTestLaneLock());
    process.exitCode = forwardedSignal ? signalExitCodes[forwardedSignal] : exitCode;
  } finally {
    laneLock.release();
  }
}

process.once('SIGINT', () => forwardSignal('SIGINT'));
process.once('SIGTERM', () => forwardSignal('SIGTERM'));
process.once('exit', () => laneLock?.release());
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
