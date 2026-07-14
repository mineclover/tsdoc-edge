#!/usr/bin/env node
'use strict';

/** Validate the declared Node/native/package contract on the current runner. */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

assertNodeEngine(packageJson.engines?.node);
const betterSqlite3 = require('better-sqlite3');
const database = new betterSqlite3(':memory:');
database.exec(
  'CREATE TABLE runtime_contract (value INTEGER NOT NULL); INSERT INTO runtime_contract VALUES (1);'
);
const nativeValue = database.prepare('SELECT value FROM runtime_contract').get().value;
database.close();
if (nativeValue !== 1)
  throw new Error('better-sqlite3 native runtime query returned an unexpected value');

const packed = run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], projectRoot);
const metadata = parsePackMetadata(packed.stdout);
const files = metadata.files.map((entry) => entry.path);
for (const required of ['dist/cli.js', 'dist/index.js', 'dist/storage/schema.sql']) {
  if (!files.includes(required)) throw new Error(`Packed file set is missing ${required}`);
}
for (const file of files) {
  if (file.startsWith('/') || file.includes('\\') || file.startsWith('.test-dist/')) {
    throw new Error(`Packed file set contains an invalid path: ${file}`);
  }
}

console.log(
  JSON.stringify(
    {
      contractId: 'tsdoc-edge/runtime-contract',
      contractVersion: '1.0',
      status: 'passed',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      modulesAbi: process.versions.modules,
      package: { name: metadata.name, version: metadata.version, fileCount: files.length },
      checks: ['node-engine', 'better-sqlite3-native-query', 'packed-file-set'],
    },
    null,
    2
  )
);

function assertNodeEngine(range) {
  if (range !== '>=24.0.0 <25.0.0') {
    throw new Error(`Unexpected package Node engine contract: ${String(range)}`);
  }
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  if (major !== 24 || minor < 0 || patch < 0) {
    throw new Error(`Runtime ${process.version} is outside the declared Node 24 line`);
  }
}

function run(command, args, cwd) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env: { ...process.env, npm_config_update_notifier: 'false' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (status ${result.status}):\n${`${result.stdout}\n${result.stderr}`.slice(-4000)}`
    );
  }
  return result;
}

function parsePackMetadata(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `npm pack did not return JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !parsed[0]) {
    throw new Error('npm pack must return exactly one metadata record');
  }
  if (
    typeof parsed[0].name !== 'string' ||
    typeof parsed[0].version !== 'string' ||
    !Array.isArray(parsed[0].files)
  ) {
    throw new Error('npm pack metadata is incomplete');
  }
  return parsed[0];
}
