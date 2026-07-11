#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const { normalizeJestArguments } = require('./normalize-jest-arguments.cjs');
const { assertTestDistComplete } = require('./test-dist-manifest.cjs');
const { acquireTestLaneLock, withoutTestLaneLock } = require('./test-lane-lock.cjs');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, '.test-dist');
const jestConfig = path.join(projectRoot, 'jest.config.js');
const jestLauncher = require.resolve('jest/bin/jest');
const signalExitCodes = { SIGINT: 130, SIGTERM: 143, SIGKILL: 137 };
const jestArguments = normalizeJestArguments(process.argv.slice(2), projectRoot);
let activeChild;
let forwardedSignal;
let laneLock;

function forwardSignal(signal) {
  forwardedSignal = signal;
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) {
    activeChild.kill(signal);
  }
}

function run(environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(
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
      if (activeChild === child) {
        activeChild = undefined;
      }
      callback(value);
    };
    child.once('error', (error) => finish(reject, error));
    child.once('close', (code, signal) => {
      finish(resolve, code ?? signalExitCodes[signal] ?? 1);
    });
  });
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
