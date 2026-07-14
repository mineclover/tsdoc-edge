#!/usr/bin/env node
'use strict';

/** Validate checked-in workflow qualification contracts without running the external matrix. */

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const ttscProviderRef = '00af8c163bd9fbe8b726a8b3a6252450f50d6274';
const workflowPaths = {
  ci: path.join(projectRoot, '.github', 'workflows', 'ci.yml'),
  release: path.join(projectRoot, '.github', 'workflows', 'release.yml'),
  spec: path.join(projectRoot, '.github', 'workflows', 'tsdoc-spec-test.yml'),
};
const workflows = Object.fromEntries(
  Object.entries(workflowPaths).map(([name, file]) => [name, fs.readFileSync(file, 'utf8')])
);
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

const matrix = {
  operatingSystems: ['ubuntu-latest', 'macos-latest'],
  executionModes: ['--runInBand', '--maxWorkers=2'],
  attempts: [1, 2],
};

validateWorkflowContract(workflows.ci, 'CI');
validateWorkflowContract(workflows.release, 'Release');
validateSpecWorkflowContract(workflows.spec);
assert(
  workflows.release.includes('needs: [runtime-qualification, packed-consumer-qualification]'),
  'Release publish job must require runtime and packed-consumer qualification'
);
assert(workflows.ci.includes('needs: test'), 'CI publish-check must require the matrix test job');
assert(
  workflows.ci.includes('workflow_dispatch:'),
  'CI must expose a manual qualification entry point'
);
assert(
  workflows.ci.includes('npm run verify:platform-toolchain'),
  'CI matrix must verify optional platform-native tooling before lint'
);
assertCommandBefore(
  workflows.ci,
  'npm run verify:platform-toolchain',
  'npm run lint',
  'CI matrix must repair optional platform-native tooling before lint'
);
assertCommandBefore(
  workflows.ci,
  'npm run build',
  'npm run verify:runtime-contract',
  'CI matrix must build dist before validating the packed runtime contract'
);
assert(
  workflows.release.includes('npm run verify:platform-toolchain'),
  'Release publish job must verify optional platform-native tooling'
);
assertCommandBefore(
  workflows.release,
  'npm run verify:platform-toolchain',
  'npm run lint',
  'Release publish job must repair optional platform-native tooling before lint'
);
assertCommandBefore(
  workflows.release,
  'npm run build',
  'npm run verify:runtime-contract',
  'Release qualification must build dist before validating the packed runtime contract'
);
assertCommandBefore(
  workflows.spec,
  'npm run build',
  'npm run verify:runtime-contract',
  'TSDoc spec workflow must build dist before validating the packed runtime contract'
);
assert(
  workflows.release.includes('npm run verify:canonical-safety'),
  'Release qualification must run the canonical graph safety proof'
);
assert(workflows.release.includes('npm run lint'), 'Release publish job must run lint');
assert(
  workflows.release.includes('run: npm test -- --runInBand'),
  'Release publish job must use the qualified in-band test mode'
);
assert(
  packageJson.scripts?.['verify:external-release-matrix'] ===
    'node scripts/verify-release-matrix.cjs',
  'Package scripts must expose the external release matrix inspector'
);

console.log(
  JSON.stringify(
    {
      contractId: 'tsdoc-edge/release-qualification-contract',
      contractVersion: '1.0',
      status: 'passed',
      matrix,
      matrixJobCount:
        matrix.operatingSystems.length * matrix.executionModes.length * matrix.attempts.length,
      externalMatrixRequired: true,
      checks: [
        'workflow-matrix-shape',
        'runtime-contract-command',
        'typecheck-command',
        'document-validation-command',
        'platform-toolchain-command',
        'canonical-safety-command',
        'javascript-test-command',
        'packed-consumer-command',
        'ttsc-provider-packed-consumer-command',
        'ttsc-provider-checkout-and-build',
        'ttsc-provider-immutable-ref',
        'differential-fixture-commands',
        'c2-owner-command',
        'external-matrix-evidence-command',
        'runtime-diagnostics-artifact',
        'publish-needs-qualification',
        'release-publish-quality-gates',
        'spec-workflow-node24-and-test-contract',
      ],
    },
    null,
    2
  )
);

function validateWorkflowContract(workflow, label) {
  assert(
    workflow.includes('os: [ubuntu-latest, macos-latest]'),
    `${label} workflow must cover Ubuntu and macOS`
  );
  assert(
    workflow.includes("execution: ['--runInBand', '--maxWorkers=2']"),
    `${label} workflow must cover in-band and worker execution`
  );
  assert(
    workflow.includes('attempt: [1, 2]'),
    `${label} workflow must repeat both execution modes twice`
  );
  for (const command of [
    'verify:runtime-contract',
    'typecheck',
    'verify:package-tarball',
    'verify:document-validation',
    'verify:ttsc-provider-tarball',
    'verify:canonical-safety',
    'verify:work-context-differential',
    'verify:work-context-differential:broader',
    'verify:c2-capability-matrix',
  ]) {
    assert(
      workflow.includes(`npm run ${command}`),
      `${label} workflow is missing npm run ${command}`
    );
  }
  assert(
    workflow.includes('npm test -- $' + '{{ matrix.execution }}') ||
      workflow.includes('run: npm test'),
    `${label} workflow is missing the test command`
  );
  assert(
    workflow.includes('path: .test-results/'),
    `${label} workflow is missing runtime diagnostics artifact upload`
  );
  assert(
    workflow.includes('repository: mineclover/ttsc-ex') &&
      workflow.includes(`ref: ${ttscProviderRef}`) &&
      workflow.includes('working-directory: ttsc-ex') &&
      workflow.includes('npm run graph:router:build') &&
      workflow.includes(
        'TSDOC_EDGE_TTSC_ROUTER_DIR: $' +
          '{{ github.workspace }}/ttsc-ex/packages/ttsc-graph-router'
      ),
    `${label} workflow is missing the ttsc graph provider checkout/build contract`
  );
}

function validateSpecWorkflowContract(workflow) {
  for (const required of [
    'actions/checkout@v4',
    'actions/setup-node@v4',
    "node-version: '24.x'",
    'npm run verify:runtime-contract',
    'npm run typecheck',
    'npm run build',
    'npm run verify:document-validation',
    'npx ts-node demo/tsdoc-spec-test.ts',
    'npm test -- --runInBand',
    'path: .test-results/',
  ]) {
    assert(workflow.includes(required), `TSDoc spec workflow is missing ${required}`);
  }
}

function assertCommandBefore(workflow, prerequisite, dependent, message) {
  const prerequisiteIndex = workflow.indexOf(prerequisite);
  const dependentIndex = workflow.indexOf(dependent);
  assert(
    prerequisiteIndex >= 0 && dependentIndex >= 0 && prerequisiteIndex < dependentIndex,
    message
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
