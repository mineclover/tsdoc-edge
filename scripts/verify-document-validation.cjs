#!/usr/bin/env node
'use strict';

/** Validate the managed documentation contract from a clean built checkout. */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'dist', 'cli.js');

if (!fs.existsSync(cliPath)) {
  fail('Built CLI is missing; run npm run build before document validation');
}

const result = spawnSync(process.execPath, [cliPath, 'validate', 'docs', 'managed'], {
  cwd: projectRoot,
  env: process.env,
  encoding: 'utf8',
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

if (result.error) fail(result.error.message);
if (result.status !== 0) fail(`Document validation exited with ${result.status ?? 'unknown'}`);

const errors = readSummary(output, 'Errors');
const warnings = readSummary(output, 'Warnings');
if (errors === undefined || warnings === undefined) {
  fail('Document validation summary is missing Errors/Warnings counts');
}
if (errors !== 0) fail(`Document validation reported ${errors} errors`);

console.log(
  JSON.stringify(
    {
      contractId: 'tsdoc-edge/document-validation',
      contractVersion: '1.0',
      status: 'passed',
      docsPath: 'managed',
      errors,
      warnings,
      productionMutation: false,
    },
    null,
    2
  )
);

function readSummary(outputText, label) {
  const plain = stripAnsi(outputText);
  const match = plain.match(new RegExp(`${label}:\\s*(\\d+)`));
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function stripAnsi(value) {
  const escape = String.fromCharCode(27);
  let result = value;
  let start = result.indexOf(escape);
  while (start !== -1) {
    const end = result.indexOf('m', start);
    if (end === -1) break;
    result = `${result.slice(0, start)}${result.slice(end + 1)}`;
    start = result.indexOf(escape);
  }
  return result;
}

function fail(message) {
  console.error(`[document-validation] ${message}`);
  process.exit(1);
}
