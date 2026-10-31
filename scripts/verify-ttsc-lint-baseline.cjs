#!/usr/bin/env node
'use strict';

/**
 * Ratchet for `@ttsc/lint` findings (`ttsc check -p tsconfig.lint.json`).
 *
 * - TypeScript errors (no `[rule]` prefix) must be zero.
 * - Per-rule lint counts may only go down versus scripts/ttsc-lint-baseline.json.
 * - `--update` rewrites the baseline after an intentional reduction (or a reviewed increase).
 *
 * The parser is exported for tests; the CLI runs only when executed directly.
 */

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(__dirname, 'ttsc-lint-baseline.json');

// biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI color codes
const ANSI = /\x1b\[[0-9;]*m/g;
const DIAGNOSTIC =
  /^(?<file>.+?):\d+:\d+ - (?<severity>error|warning) TS\d+: (?:\[(?<rule>[^\]]+)\] )?/;

/** Count diagnostics per lint rule; TypeScript diagnostics (no rule) are collected separately. */
function parseTtscLintOutput(output) {
  const rules = {};
  const typeErrors = [];
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.replace(ANSI, '');
    const match = DIAGNOSTIC.exec(line);
    if (!match) continue;
    const { rule, severity } = match.groups;
    if (rule) rules[rule] = (rules[rule] ?? 0) + 1;
    else if (severity === 'error') typeErrors.push(line);
  }
  return { rules: sortKeys(rules), typeErrors };
}

/** Rules whose count increased versus the baseline (new rules count from zero). */
function compareToBaseline(current, baseline) {
  const regressions = [];
  for (const [rule, count] of Object.entries(current)) {
    const allowed = baseline[rule] ?? 0;
    if (count > allowed) regressions.push({ rule, allowed, count });
  }
  return regressions;
}

function sortKeys(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  const update = process.argv.includes('--update');
  const result = childProcess.spawnSync(
    process.execPath,
    [path.join(__dirname, 'run-ttsc.cjs'), 'check', '-p', 'tsconfig.lint.json'],
    { cwd: projectRoot, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  );
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (/lint config .* evaluation failed/.test(output)) {
    console.error(output);
    process.exit(1);
  }

  const { rules, typeErrors } = parseTtscLintOutput(output);
  if (typeErrors.length > 0) {
    console.error(
      `TypeScript errors (${typeErrors.length}):\n${typeErrors.slice(0, 20).join('\n')}`
    );
    process.exit(1);
  }

  const total = Object.values(rules).reduce((sum, count) => sum + count, 0);
  if (update) {
    fs.writeFileSync(baselinePath, `${JSON.stringify(rules, null, 2)}\n`);
    console.log(
      `ttsc lint baseline updated: ${total} findings across ${Object.keys(rules).length} rules`
    );
    return;
  }

  const baseline = fs.existsSync(baselinePath)
    ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    : {};
  const regressions = compareToBaseline(rules, baseline);
  if (regressions.length > 0) {
    console.error('ttsc lint regressions (count above baseline):');
    for (const r of regressions) console.error(`  ${r.rule}: ${r.allowed} -> ${r.count}`);
    console.error('Fix the new findings, or run `npm run lint:ttsc -- --update` after review.');
    process.exit(1);
  }

  const reduced = Object.entries(baseline).filter(
    ([rule, allowed]) => (rules[rule] ?? 0) < allowed
  );
  console.log(
    `ttsc lint baseline respected: ${total} findings across ${Object.keys(rules).length} rules`
  );
  if (reduced.length > 0) {
    console.log(
      `  ${reduced.length} rule(s) improved; run \`npm run lint:ttsc -- --update\` to lock in.`
    );
  }
}

module.exports = { parseTtscLintOutput, compareToBaseline };

if (require.main === module) main();
