#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const { spawnManaged, terminateManaged } = require('./process-group.cjs');

function packageJson(specifier) {
  const file = require.resolve(`${specifier}/package.json`);
  return { file, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function resolveNativeTypeScriptBinary() {
  const native = packageJson('typescript-native');
  const platformName = `@typescript/typescript-${process.platform}-${process.arch}`;
  const resolveFromNative = createRequire(native.file);

  let platformFile;
  try {
    platformFile = resolveFromNative.resolve(`${platformName}/package.json`);
  } catch {
    throw new Error(
      `Missing ${platformName} for typescript-native ${native.value.version}; reinstall with optional dependencies enabled.`
    );
  }

  const platform = JSON.parse(fs.readFileSync(platformFile, 'utf8'));
  if (platform.version !== native.value.version) {
    throw new Error(
      `typescript-native ${native.value.version} does not match ${platformName} ${platform.version}`
    );
  }

  const binary = path.join(
    path.dirname(platformFile),
    'lib',
    process.platform === 'win32' ? 'tsc.exe' : 'tsc'
  );
  if (!fs.existsSync(binary)) {
    throw new Error(`Native TypeScript compiler is missing: ${binary}`);
  }
  return binary;
}

function resolveTtscLauncher() {
  const manifest = packageJson('ttsc');
  const relativeLauncher = manifest.value.bin?.ttsc;
  if (typeof relativeLauncher !== 'string') {
    throw new Error('Installed ttsc package does not declare the ttsc binary');
  }
  const launcher = path.resolve(path.dirname(manifest.file), relativeLauncher);
  if (!fs.existsSync(launcher)) {
    throw new Error(`ttsc launcher is missing: ${launcher}`);
  }
  return launcher;
}

function main() {
  const args = process.argv.slice(2);
  const hasBinaryArgument = args.some((argument) => argument === '--binary');
  const env = { ...process.env };
  if (!hasBinaryArgument) {
    if (env.TTSC_TSGO_BINARY === undefined) {
      env.TTSC_TSGO_BINARY = resolveNativeTypeScriptBinary();
    } else if (env.TTSC_TSGO_BINARY.trim() === '') {
      throw new Error('TTSC_TSGO_BINARY must not be empty');
    }
  }

  const child = spawnManaged(spawn, process.execPath, [resolveTtscLauncher(), ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
  let forwardedSignal;
  const signalExitCodes = {
    SIGINT: 130,
    SIGTERM: 143,
    SIGKILL: 137,
  };
  let cancelTermination = () => {};
  const forwardSignal = (signal) => {
    forwardedSignal = signal;
    if (child.exitCode === null && child.signalCode === null) {
      cancelTermination();
      cancelTermination = terminateManaged(child, signal);
    }
  };
  const onSigint = () => forwardSignal('SIGINT');
  const onSigterm = () => forwardSignal('SIGTERM');
  const removeSignalHandlers = () => {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
  };

  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);
  let settled = false;
  const finish = (exitCode) => {
    if (settled) {
      return;
    }
    settled = true;
    cancelTermination();
    removeSignalHandlers();
    process.exitCode = exitCode;
  };
  child.once('error', (error) => {
    console.error(error.message);
    finish(1);
  });
  child.once('close', (code, signal) => {
    finish(code ?? signalExitCodes[forwardedSignal ?? signal] ?? 1);
  });
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
