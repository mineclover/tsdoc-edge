#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { spawnManaged, terminateManaged } = require('./process-group.cjs');
const { createTestInputDigest, writeTestDistManifest } = require('./test-dist-manifest.cjs');
const { acquireTestLaneLock } = require('./test-lane-lock.cjs');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, '.test-dist');
const compilerLauncher = path.join(projectRoot, 'scripts', 'run-ttsc.cjs');
const testProject = path.join(projectRoot, 'tsconfig.test.ttsc.json');
const signalExitCodes = { SIGINT: 130, SIGTERM: 143, SIGKILL: 137 };
let activeChild;
let childEnvironment = process.env;
let forwardedSignal;
let laneLock;
let cancelTermination = () => {};

function removeOutputDirectory() {
  if (
    path.dirname(outputDirectory) !== projectRoot ||
    path.basename(outputDirectory) !== '.test-dist'
  ) {
    throw new Error(`Refusing to remove unexpected test output path: ${outputDirectory}`);
  }
  fs.rmSync(outputDirectory, { recursive: true, force: true });
}

function compile() {
  return new Promise((resolve, reject) => {
    const child = spawnManaged(spawn, process.execPath, [compilerLauncher, '-p', testProject], {
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

function copyRuntimeAssets() {
  const source = path.join(projectRoot, 'src', 'storage', 'schema.sql');
  const destination = path.join(outputDirectory, 'storage', 'schema.sql');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function forwardSignal(signal) {
  forwardedSignal = signal;
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) {
    cancelTermination();
    cancelTermination = terminateManaged(activeChild, signal);
  }
}

async function main() {
  laneLock = acquireTestLaneLock('test:compile');
  childEnvironment = laneLock.environment;
  try {
    const inputDigest = createTestInputDigest(projectRoot);
    removeOutputDirectory();
    const exitCode = await compile();
    if (forwardedSignal) {
      process.exitCode = signalExitCodes[forwardedSignal];
      return;
    }
    if (exitCode !== 0) {
      process.exitCode = exitCode;
      return;
    }
    copyRuntimeAssets();
    writeTestDistManifest(projectRoot, outputDirectory, inputDigest);
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
