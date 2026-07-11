#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const { acquireTestLaneLock } = require('./test-lane-lock.cjs');

const projectRoot = path.resolve(__dirname, '..');
const compilerLauncher = path.join(projectRoot, 'scripts', 'run-ttsc.cjs');
const buildTestDist = path.join(projectRoot, 'scripts', 'build-test-dist.cjs');
const testRunner = path.join(projectRoot, 'scripts', 'run-test-js.cjs');
const testProject = path.join(projectRoot, 'tsconfig.test.ttsc.json');
const signalExitCodes = { SIGINT: 130, SIGTERM: 143, SIGKILL: 137 };
const jestArguments = process.argv.slice(2);
let activeChild;
let childEnvironment = process.env;
let forwardedSignal;
let laneLock;

function run(label, command, args) {
  console.log(`\n[test:ts7] ${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: childEnvironment,
      stdio: 'inherit',
    });
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

function forwardSignal(signal) {
  forwardedSignal = signal;
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) {
    activeChild.kill(signal);
  }
}

async function runStep(label, command, args) {
  const exitCode = await run(label, command, args);
  if (forwardedSignal) {
    process.exitCode = signalExitCodes[forwardedSignal];
    return false;
  }
  if (exitCode !== 0) {
    process.exitCode = exitCode;
    return false;
  }
  return true;
}

async function main() {
  laneLock = acquireTestLaneLock('test');
  childEnvironment = laneLock.environment;
  try {
    if (
      !(await runStep('typecheck', process.execPath, [
        compilerLauncher,
        '-p',
        testProject,
        '--noEmit',
      ]))
    ) {
      return;
    }
    if (!(await runStep('compile', process.execPath, [buildTestDist]))) {
      return;
    }
    await runStep('run', process.execPath, [testRunner, ...jestArguments]);
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
