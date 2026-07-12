#!/usr/bin/env node
'use strict';

/** Prevent new legacy lint debt while existing warnings are migrated deliberately. */

const childProcess = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const maximumBySeverity = {
  warning: 61,
  information: 25,
};

const maximumByCategory = {
  'lint/style/noNonNullAssertion': 43,
  'lint/suspicious/noExplicitAny': 15,
  'lint/correctness/noUnusedFunctionParameters': 1,
  'lint/correctness/noUnusedVariables': 1,
  'lint/performance/noAccumulatingSpread': 1,
  'lint/complexity/noUselessConstructor': 2,
  'lint/complexity/useLiteralKeys': 23,
};

const result = childProcess.spawnSync(
  npx,
  ['--no-install', 'biome', 'check', '.', '--reporter=json', '--max-diagnostics=none'],
  {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }
);

if (result.error) throw result.error;

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  throw new Error(
    `Biome warning-budget report was not valid JSON: ${error instanceof Error ? error.message : String(error)}`
  );
}

const diagnostics = report.diagnostics ?? [];
const countsBySeverity = countBy(diagnostics, (diagnostic) => diagnostic.severity);
const countsByCategory = countBy(diagnostics, (diagnostic) => diagnostic.category);
const violations = [];

for (const [severity, maximum] of Object.entries(maximumBySeverity)) {
  const observed = countsBySeverity[severity] ?? 0;
  if (observed > maximum) violations.push(`${severity}: ${observed} exceeds ${maximum}`);
}

for (const [category, observed] of Object.entries(countsByCategory)) {
  const maximum = maximumByCategory[category];
  if (maximum === undefined) {
    violations.push(`${category}: new diagnostic category (${observed})`);
  } else if (observed > maximum) {
    violations.push(`${category}: ${observed} exceeds ${maximum}`);
  }
}

if (violations.length > 0) {
  throw new Error(`Lint warning budget exceeded:\n${violations.join('\n')}`);
}

console.log(
  `Lint warning budget respected: ${countsBySeverity.warning ?? 0} warnings, ${countsBySeverity.information ?? 0} infos`
);

function countBy(diagnostics, key) {
  const counts = {};
  for (const diagnostic of diagnostics) {
    const value = key(diagnostic);
    if (typeof value !== 'string') continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
