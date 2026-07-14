#!/usr/bin/env node
'use strict';

/** Ensure optional platform-native CLI packages required by repository tooling are installed. */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const biomePackagePath = require.resolve('@biomejs/biome/package.json', { paths: [projectRoot] });
const biomeVersion = JSON.parse(fs.readFileSync(biomePackagePath, 'utf8')).version;
const platformPackage = `@biomejs/cli-${process.platform}-${process.arch}`;
let repaired = false;

if (!isResolvable(platformPackage)) {
  repaired = true;
  console.log(
    JSON.stringify(
      {
        contractId: 'tsdoc-edge/platform-toolchain',
        contractVersion: '1.0',
        status: 'repairing',
        package: platformPackage,
        version: biomeVersion,
      },
      null,
      2
    )
  );
  execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    [
      'install',
      '--no-save',
      '--no-package-lock',
      '--ignore-scripts',
      '--include=optional',
      `${platformPackage}@${biomeVersion}`,
    ],
    { cwd: projectRoot, stdio: 'inherit' }
  );
}

if (!isResolvable(platformPackage)) {
  throw new Error(
    `Platform toolchain package ${platformPackage}@${biomeVersion} is unavailable after repair`
  );
}

console.log(
  JSON.stringify(
    {
      contractId: 'tsdoc-edge/platform-toolchain',
      contractVersion: '1.0',
      status: 'passed',
      package: platformPackage,
      version: biomeVersion,
      repaired,
    },
    null,
    2
  )
);

function isResolvable(packageName) {
  try {
    require.resolve(`${packageName}/package.json`, { paths: [projectRoot] });
    return true;
  } catch {
    return false;
  }
}
