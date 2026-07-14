#!/usr/bin/env node
'use strict';

/** Run the focused C0 canonical graph safety proof without touching production state. */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const testPaths = [
  'src/__tests__/indexer/CanonicalGraphCoordinator.test.ts',
  'src/__tests__/indexer/ProjectIndexer.test.ts',
  'src/__tests__/indexer/symbol-alias.test.ts',
  'src/__tests__/storage/GraphRepository.test.ts',
];
const args = ['test', '--', '--runInBand', '--runTestsByPath', ...testPaths];
const result = spawnSync(npmCommand, args, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  reportFailure(result.error.message);
}
if (result.status !== 0) {
  reportFailure(`focused canonical safety tests exited with ${result.status ?? 'unknown'}`);
}

console.log(
  JSON.stringify(
    {
      contractId: 'tsdoc-edge/canonical-safety',
      contractVersion: '1.0',
      status: 'passed',
      testPaths,
      proofAreas: [
        'schema-v1 read-only compatibility and transactional promotion',
        'alias collision and ambiguity rejection',
        'revision identity and fingerprint guards',
        'canonical refresh rollback and non-mutation',
      ],
      productionMutation: false,
    },
    null,
    2
  )
);

function reportFailure(reason) {
  console.error(
    JSON.stringify(
      {
        contractId: 'tsdoc-edge/canonical-safety',
        contractVersion: '1.0',
        status: 'failed',
        reason,
        testPaths,
        productionMutation: false,
      },
      null,
      2
    )
  );
  process.exit(1);
}
