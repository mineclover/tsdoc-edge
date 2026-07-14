#!/usr/bin/env node
'use strict';

/** Validate the versioned C2 capability-owner evidence envelope without mutating production state. */

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const matrixPath = path.join(__dirname, 'fixtures', 'capability-owner-matrix.v1.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const externalMatrixEvidence = verifyExternalMatrix(parseArguments(process.argv.slice(2)));
const allowedDecisions = new Set(matrix.ownerDecisions);
const requiredEvidence = [
  'producerDeclaration',
  'rawObservation',
  'routerDerivedStructure',
  'canonicalMapping',
  'legacyParity',
  'fixture',
];
const fixtureIds = new Set(
  matrix.capabilities.flatMap((capability) =>
    (capability.fixtureSet ?? []).map((fixture) => fixture.fixtureId)
  )
);
validateMatrix(matrix);

let failureCanariesPassed = 0;
for (const capability of matrix.capabilities) {
  const canaries = [
    capability.failureCanary,
    ...(Array.isArray(capability.failureCanaries) ? capability.failureCanaries : []),
  ];
  assert(canaries.length > 0, `${capability.capabilityId} lacks failure canary`);
  for (const canary of canaries) {
    assert(
      canary && typeof canary.mutation === 'string',
      `${capability.capabilityId} has an invalid failure canary`
    );
    assert(
      typeof canary.expectedError === 'string',
      `${capability.capabilityId} lacks failure canary expectation`
    );
    assert(
      fs.existsSync(path.join(projectRoot, canary.source)),
      `${capability.capabilityId} references missing ${canary.source}`
    );
    const corrupted = JSON.parse(JSON.stringify(matrix));
    const corruptedCapability = corrupted.capabilities.find(
      (entry) => entry.capabilityId === capability.capabilityId
    );
    const missingField = canary.mutation.replace('remove ', '');
    delete corruptedCapability[missingField];
    let rejected = false;
    try {
      validateMatrix(corrupted);
    } catch (error) {
      rejected = error instanceof Error && error.message === canary.expectedError;
    }
    assert(rejected, `${capability.capabilityId} failure canary was not rejected as expected`);
    failureCanariesPassed += 1;
  }
}

console.log(
  JSON.stringify(
    {
      contractId: matrix.contractId,
      contractVersion: matrix.contractVersion,
      matrixId: matrix.matrixId,
      status: matrix.status,
      capabilityCount: matrix.capabilities.length,
      fixtureCount: fixtureIds.size,
      failureCanariesPassed,
      evidenceContracts: {
        ttscProviderPackedCanary: {
          contractId: matrix.evidenceContracts.ttscProviderPackedCanary.contractId,
          contractVersion: matrix.evidenceContracts.ttscProviderPackedCanary.contractVersion,
        },
      },
      decisions: Object.fromEntries(
        matrix.capabilities.map((capability) => [capability.capabilityId, capability.ownerDecision])
      ),
      ownerPromotionEligible: externalMatrixEvidence !== undefined,
      ...(externalMatrixEvidence ? { externalMatrixEvidence } : {}),
      productionMutation: false,
    },
    null,
    2
  )
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(arguments_) {
  const options = { runId: undefined, inputPath: undefined, expectedSha: undefined };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (
      argument === '--external-matrix-run-id' ||
      argument === '--external-matrix-input' ||
      argument === '--external-matrix-sha'
    ) {
      const value = arguments_[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      if (argument === '--external-matrix-run-id') options.runId = value;
      if (argument === '--external-matrix-input') options.inputPath = value;
      if (argument === '--external-matrix-sha') options.expectedSha = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--external-matrix-run-id='))
      options.runId = argument.slice('--external-matrix-run-id='.length);
    else if (argument.startsWith('--external-matrix-input='))
      options.inputPath = argument.slice('--external-matrix-input='.length);
    else if (argument.startsWith('--external-matrix-sha='))
      options.expectedSha = argument.slice('--external-matrix-sha='.length);
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (options.runId && options.inputPath) {
    throw new Error('Pass only one external matrix run ID or input path');
  }
  if (options.expectedSha && !options.runId && !options.inputPath) {
    throw new Error('External matrix SHA requires a run ID or input path');
  }
  return options;
}

function verifyExternalMatrix(options) {
  if (!options.runId && !options.inputPath) return undefined;
  const matrixScript = path.join(projectRoot, 'scripts', 'verify-release-matrix.cjs');
  const args = [matrixScript];
  if (options.runId) args.push('--run-id', options.runId);
  if (options.inputPath) args.push('--input', options.inputPath);
  if (options.expectedSha) args.push('--sha', options.expectedSha);
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `External release matrix did not pass:\n${`${result.stdout}\n${result.stderr}`.trim()}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `External release matrix output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function validateMatrix(candidate) {
  assert(
    candidate.contractId === 'tsdoc-edge/capability-owner-matrix',
    'Unexpected matrix contract'
  );
  assert(candidate.contractVersion === '1.0', 'Unsupported matrix contract version');
  assert(
    Array.isArray(candidate.capabilities) && candidate.capabilities.length === 4,
    'Expected 4 C2 capabilities'
  );
  validateEvidenceContracts(candidate.evidenceContracts);
  const evidenceContracts = candidate.evidenceContracts ?? {};
  const seen = new Set();
  for (const capability of candidate.capabilities) {
    assert(typeof capability.capabilityId === 'string', 'Capability ID is required');
    assert(!seen.has(capability.capabilityId), `Duplicate capability: ${capability.capabilityId}`);
    seen.add(capability.capabilityId);
    for (const key of requiredEvidence) {
      const evidence = capability[key];
      assert(
        evidence && typeof evidence.source === 'string',
        `${capability.capabilityId} lacks ${key}.source`
      );
      assert(
        fs.existsSync(path.join(projectRoot, evidence.source)),
        `${capability.capabilityId} references missing ${evidence.source}`
      );
    }
    assert(
      Array.isArray(capability.fixtureSet) && capability.fixtureSet.length >= 2,
      `${capability.capabilityId} requires at least two fixtures`
    );
    const fixtureIds = new Set();
    for (const fixture of capability.fixtureSet) {
      assert(
        fixture && typeof fixture.source === 'string',
        `${capability.capabilityId} has an invalid fixture source`
      );
      assert(
        typeof fixture.fixtureId === 'string' && fixture.fixtureId.length > 0,
        `${capability.capabilityId} has an invalid fixture ID`
      );
      assert(
        !fixtureIds.has(fixture.fixtureId),
        `${capability.capabilityId} has duplicate fixture`
      );
      fixtureIds.add(fixture.fixtureId);
      assert(
        fs.existsSync(path.join(projectRoot, fixture.source)),
        `${capability.capabilityId} references missing fixture ${fixture.source}`
      );
    }
    assert(
      allowedDecisions.has(capability.ownerDecision),
      `Invalid owner decision: ${capability.ownerDecision}`
    );
    assert(
      typeof capability.decisionNote === 'string' && capability.decisionNote.length > 0,
      `${capability.capabilityId} lacks decision note`
    );
    assert(
      Array.isArray(capability.evidenceContractRefs) && capability.evidenceContractRefs.length > 0,
      `${capability.capabilityId} lacks evidence contract refs`
    );
    for (const contractRef of capability.evidenceContractRefs) {
      assert(
        typeof contractRef === 'string' && evidenceContracts[contractRef],
        `${capability.capabilityId} references unknown evidence contract ${contractRef}`
      );
    }
  }
}

function validateEvidenceContracts(contracts) {
  const providerCanary = contracts?.ttscProviderPackedCanary;
  assert(providerCanary, 'Missing ttscProviderPackedCanary evidence contract');
  assert(
    providerCanary.source === 'scripts/verify-ttsc-provider-tarball.cjs',
    'Unexpected ttsc provider evidence source'
  );
  assert(
    providerCanary.contractId === 'tsdoc-edge/ttsc-provider-packed-canary',
    'Unexpected ttsc provider evidence contract'
  );
  assert(providerCanary.contractVersion === '1.6', 'Unsupported ttsc provider evidence version');
  assert(
    Array.isArray(providerCanary.requiredProof) && providerCanary.requiredProof.length > 0,
    'ttsc provider evidence requires proof keys'
  );
  const providerSource = fs.readFileSync(path.join(projectRoot, providerCanary.source), 'utf8');
  assert(
    providerSource.includes(`contractId: '${providerCanary.contractId}'`),
    'ttsc provider evidence contract is not declared by its source'
  );
  assert(
    providerSource.includes(`contractVersion: '${providerCanary.contractVersion}'`),
    'ttsc provider evidence version is not declared by its source'
  );
  for (const proofKey of providerCanary.requiredProof) {
    assert(
      typeof proofKey === 'string' && providerSource.includes(proofKey),
      `ttsc provider evidence source lacks ${proofKey}`
    );
  }
}
