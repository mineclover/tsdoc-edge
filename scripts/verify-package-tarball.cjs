#!/usr/bin/env node
'use strict';

/**
 * Proves the published file set works from a fresh, external consumer directory.
 *
 * This intentionally does not use the source checkout's `dist` as the executable
 * after packing: every CLI invocation resolves from the installed tarball.
 */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-package-'));
const packageDirectory = path.join(tempRoot, 'package');
const consumerDirectory = path.join(tempRoot, 'consumer');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

try {
  assertFile(
    path.join(projectRoot, 'dist', 'cli.js'),
    'Run npm run build before package verification'
  );
  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.mkdirSync(consumerDirectory, { recursive: true });

  const packed = run(npm, ['pack', '--json', '--pack-destination', packageDirectory], projectRoot);
  const metadata = parsePackMetadata(packed.stdout);
  assertPackContents(metadata.files);
  const tarballPath = path.join(packageDirectory, metadata.filename);
  assertFile(tarballPath, 'npm pack did not create its reported tarball');

  writeJson(path.join(consumerDirectory, 'package.json'), {
    name: 'tsdoc-edge-packed-consumer-canary',
    private: true,
    version: '0.0.0',
  });
  // Native runtime dependencies (notably better-sqlite3) must install exactly as they
  // would for a real consumer; suppressing lifecycle scripts would hide that contract.
  run(npm, ['install', '--no-audit', '--no-fund', tarballPath], consumerDirectory);

  run(npx, ['--no-install', 'tsdoc-edge', '--help'], consumerDirectory);
  run(
    npx,
    ['--no-install', 'tsdoc-edge', 'init', '--name=packed-consumer-canary', '--version=0.0.0'],
    consumerDirectory
  );
  fs.mkdirSync(path.join(consumerDirectory, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(consumerDirectory, 'src', 'index.ts'),
    '/** A package-consumer smoke symbol. */\nexport const packedConsumerValue = 1;\n',
    'utf8'
  );
  run(npx, ['--no-install', 'tsdoc-edge', 'build', 'src'], consumerDirectory);
  run(npx, ['--no-install', 'tsdoc-edge', 'work-context', 'src/index.ts'], consumerDirectory);

  console.log(
    JSON.stringify(
      {
        contractId: 'tsdoc-edge/package-tarball-canary',
        contractVersion: '1.0',
        status: 'passed',
        package: { name: metadata.name, version: metadata.version, filename: metadata.filename },
        checks: ['packed-file-set', 'fresh-install', 'cli-help', 'init', 'build', 'work-context'],
      },
      null,
      2
    )
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function run(command, args, cwd) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      TSDOC_EDGE_USAGE_ANALYTICS: '0',
      npm_config_update_notifier: 'false',
    },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim().slice(-4000);
    throw new Error(
      `${command} ${args.join(' ')} failed with exit ${String(result.status)}\n${detail}`
    );
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function parsePackMetadata(stdout) {
  let value;
  try {
    value = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `npm pack did not return JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object') {
    throw new Error('npm pack must return exactly one package metadata record');
  }
  const metadata = value[0];
  if (
    typeof metadata.name !== 'string' ||
    typeof metadata.version !== 'string' ||
    typeof metadata.filename !== 'string' ||
    !Array.isArray(metadata.files)
  ) {
    throw new Error('npm pack metadata is missing name, version, filename, or files');
  }
  return metadata;
}

function assertPackContents(files) {
  const paths = new Set(
    files.map((entry) => entry?.path).filter((entry) => typeof entry === 'string')
  );
  for (const required of [
    'dist/cli.js',
    'dist/index.js',
    'dist/storage/schema.sql',
    'package.json',
  ]) {
    if (!paths.has(required))
      throw new Error(`Packed artifact is missing required file: ${required}`);
  }
  for (const forbiddenPrefix of ['.test-dist/', '.test-results/', 'node_modules/']) {
    if ([...paths].some((entry) => entry.startsWith(forbiddenPrefix))) {
      throw new Error(`Packed artifact must not include ${forbiddenPrefix}`);
    }
  }
}

function assertFile(filePath, message) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error(message);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
