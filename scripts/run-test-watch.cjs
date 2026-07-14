#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { spawnManaged, terminateManaged } = require('./process-group.cjs');
const { acquireTestLaneLock } = require('./test-lane-lock.cjs');

const projectRoot = path.resolve(__dirname, '..');
const sourceDirectory = path.join(projectRoot, 'src');
const buildTestDist = path.join(projectRoot, 'scripts', 'build-test-dist.cjs');
const testRunner = path.join(projectRoot, 'scripts', 'run-test-js.cjs');
const pollIntervalMs = 500;
const signalExitCodes = { SIGINT: 130, SIGTERM: 143, SIGKILL: 137 };
const watchedFiles = [
  'package.json',
  'jest.config.js',
  'tsconfig.json',
  'tsconfig.ttsc.json',
  'tsconfig.test.ttsc.json',
  'scripts/build-test-dist.cjs',
  'scripts/normalize-jest-arguments.cjs',
  'scripts/run-test-js.cjs',
  'scripts/run-ttsc.cjs',
  'scripts/process-group.cjs',
  'scripts/test-dist-manifest.cjs',
  'scripts/test-lane-lock.cjs',
].map((file) => path.join(projectRoot, file));

const rawArguments = process.argv.slice(2);
const onceIndex = rawArguments.indexOf('--once');
const runOnce = onceIndex !== -1;
if (runOnce) {
  rawArguments.splice(onceIndex, 1);
}
const jestArguments = rawArguments;

let activeChild;
let childEnvironment = process.env;
let pollTimer;
let rerunRequested = false;
let running = false;
let stopped = false;
let fingerprint = '';
let laneLock;
let resolveShutdown;
let cancelTermination = () => {};
const shutdown = new Promise((resolve) => {
  resolveShutdown = resolve;
});

function appendFileFingerprint(file, entries) {
  try {
    const stat = fs.statSync(file);
    entries.push(`${file}:${stat.mtimeMs}:${stat.size}`);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      entries.push(`${file}:missing`);
      return;
    }
    throw error;
  }
}

function appendDirectoryFingerprint(directory, entries) {
  let directoryEntries;
  try {
    directoryEntries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      entries.push(`${directory}:missing`);
      return;
    }
    throw error;
  }

  for (const entry of directoryEntries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      appendDirectoryFingerprint(file, entries);
    } else if (entry.isFile()) {
      appendFileFingerprint(file, entries);
    }
  }
}

function createFingerprint() {
  const entries = [];
  appendDirectoryFingerprint(sourceDirectory, entries);
  for (const file of watchedFiles) {
    appendFileFingerprint(file, entries);
  }
  return entries.sort().join('\n');
}

function runChild(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnManaged(spawn, command, args, {
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
      cancelTermination();
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

function completeShutdownIfIdle() {
  if (stopped && !running && !activeChild) {
    laneLock?.release();
    resolveShutdown();
  }
}

async function runCycle() {
  if (stopped || running) {
    return;
  }
  running = true;
  rerunRequested = false;
  let exitCode = 1;
  try {
    console.log('\n[test:watch:ts7] compile');
    exitCode = await runChild(process.execPath, [buildTestDist]);
    if (!stopped && exitCode === 0) {
      console.log('\n[test:watch:ts7] run');
      exitCode = await runChild(process.execPath, [testRunner, ...jestArguments]);
    }
  } finally {
    running = false;
    completeShutdownIfIdle();
  }

  if (stopped) {
    return;
  }
  if (runOnce) {
    process.exitCode = exitCode;
    return;
  }
  if (rerunRequested) {
    await runCycle();
    return;
  }
  console.log('\n[test:watch:ts7] waiting for source or configuration changes');
}

function failWatch(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
  stopped = true;
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) {
    cancelTermination();
    cancelTermination = terminateManaged(activeChild, 'SIGTERM');
  }
  completeShutdownIfIdle();
}

function scheduleCycle() {
  runCycle().catch(failWatch);
}

function checkForChanges() {
  let nextFingerprint;
  try {
    nextFingerprint = createFingerprint();
  } catch (error) {
    console.error(
      `[test:watch:ts7] source scan failed; retrying: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }
  if (nextFingerprint === fingerprint) {
    return;
  }
  fingerprint = nextFingerprint;
  if (running) {
    rerunRequested = true;
  } else {
    scheduleCycle();
  }
}

function stop(signal) {
  stopped = true;
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) {
    cancelTermination();
    cancelTermination = terminateManaged(activeChild, signal);
  }
  process.exitCode = signalExitCodes[signal];
  completeShutdownIfIdle();
}

async function main() {
  laneLock = acquireTestLaneLock('test:watch');
  childEnvironment = laneLock.environment;
  try {
    fingerprint = createFingerprint();
    process.once('SIGINT', () => stop('SIGINT'));
    process.once('SIGTERM', () => stop('SIGTERM'));
    if (!runOnce) {
      pollTimer = setInterval(checkForChanges, pollIntervalMs);
    }
    await runCycle();
    if (!runOnce) {
      await shutdown;
    }
  } finally {
    if (pollTimer) {
      clearInterval(pollTimer);
    }
    laneLock.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
process.once('exit', () => laneLock?.release());
