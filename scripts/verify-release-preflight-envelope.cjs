#!/usr/bin/env node
'use strict';

/** Inspect a persisted release-preflight envelope without rerunning checks or mutating state. */

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const expectedStepsByVersion = {
  1.1: [
    'verify:release-qualification',
    'verify:platform-toolchain',
    'typecheck',
    'lint',
    'build',
    'verify:runtime-contract',
    'verify:package-tarball',
    'verify:ttsc-provider-tarball',
    'verify:canonical-safety',
    'verify:work-context-differential',
    'verify:work-context-differential:broader',
    'verify:c2-capability-matrix',
    'test:in-band',
    'test:workers-2',
  ],
  1.2: [
    'verify:release-qualification',
    'verify:platform-toolchain',
    'typecheck',
    'lint',
    'build',
    'verify:document-validation',
    'verify:runtime-contract',
    'verify:package-tarball',
    'verify:ttsc-provider-tarball',
    'verify:canonical-safety',
    'verify:work-context-differential',
    'verify:work-context-differential:broader',
    'verify:c2-capability-matrix',
    'test:in-band',
    'test:workers-2',
  ],
};

try {
  const envelopePath = resolveEnvelopePath(process.argv.slice(2));
  const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
  validateEnvelope(envelope);
  console.log(
    JSON.stringify(
      {
        contractId: envelope.contractId,
        contractVersion: envelope.contractVersion,
        status: envelope.status,
        sourcePath: relativePath(envelopePath),
        evidencePath: envelope.evidencePath,
        stepCount: envelope.steps.length,
        failedStep: envelope.failedStep ?? null,
        runtime: envelope.runtime,
        productionMutation: false,
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function resolveEnvelopePath(arguments_) {
  let explicitPath;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--path') {
      if (explicitPath || typeof arguments_[index + 1] !== 'string') {
        throw new Error('Expected exactly one --path value');
      }
      explicitPath = arguments_[index + 1];
      index += 1;
      continue;
    }
    if (argument.startsWith('--path=')) {
      if (explicitPath || argument.slice('--path='.length).length === 0) {
        throw new Error('Expected exactly one --path value');
      }
      explicitPath = argument.slice('--path='.length);
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  if (explicitPath) {
    return path.resolve(process.cwd(), explicitPath);
  }

  const directory = path.join(projectRoot, '.test-results');
  const candidates = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => /^release-preflight-\d+\.json$/.test(entry.name))
    .map((entry) => {
      const candidate = path.join(directory, entry.name);
      return { candidate, mtimeMs: fs.statSync(candidate).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error('No release-preflight envelope found; pass --path <file>');
  }
  return candidates[0].candidate;
}

function validateEnvelope(envelope) {
  assert(envelope && typeof envelope === 'object', 'Envelope must be an object');
  assert(envelope.contractId === 'tsdoc-edge/release-preflight', 'Unexpected preflight contract');
  const expectedSteps = expectedStepsByVersion[envelope.contractVersion];
  assert(expectedSteps, 'Unsupported preflight contract version');
  assert(envelope.status === 'passed' || envelope.status === 'failed', 'Invalid preflight status');
  assert(envelope.externalMatrixRequired === true, 'Preflight must require the external matrix');
  assertIsoDate(envelope.startedAt, 'startedAt');
  assertIsoDate(envelope.completedAt, 'completedAt');
  assert(typeof envelope.evidencePath === 'string', 'Envelope evidencePath is required');
  assertRuntime(envelope.runtime);
  assert(Array.isArray(envelope.steps), 'Envelope steps are required');
  assert(envelope.steps.length > 0, 'Preflight envelope must contain at least one step');
  assert(envelope.steps.length <= expectedSteps.length, 'Unexpected preflight step count');

  for (let index = 0; index < envelope.steps.length; index += 1) {
    const step = envelope.steps[index];
    assert(step && step.label === expectedSteps[index], `Unexpected step at index ${index}`);
    assert(
      step.status === 'passed' || step.status === 'failed',
      `Invalid status for ${step.label}`
    );
    assertIsoDate(step.startedAt, `${step.label}.startedAt`);
    assertIsoDate(step.completedAt, `${step.label}.completedAt`);
    if (step.status === 'passed') {
      assert(step.exitCode === 0, `${step.label} passed without exitCode 0`);
    }
  }

  const failedSteps = envelope.steps.filter((step) => step.status === 'failed');
  if (envelope.status === 'passed') {
    assert(envelope.steps.length === expectedSteps.length, 'Passed envelope is incomplete');
    assert(failedSteps.length === 0, 'Passed envelope contains a failed step');
    assert(envelope.failedStep === undefined, 'Passed envelope contains failedStep');
    return;
  }

  assert(failedSteps.length === 1, 'Failed envelope must contain exactly one failed step');
  const failedStep = failedSteps[0];
  assert(failedStep === envelope.steps.at(-1), 'Failed step must be the final recorded step');
  assert(envelope.failedStep === failedStep.label, 'failedStep does not match the final step');
  assert(
    typeof envelope.reason === 'string' && envelope.reason.length > 0,
    'Failure reason is required'
  );
}

function assertRuntime(runtime) {
  assert(runtime && typeof runtime === 'object', 'Runtime information is required');
  for (const key of ['node', 'platform', 'arch', 'modulesAbi', 'v8']) {
    assert(
      typeof runtime[key] === 'string' && runtime[key].length > 0,
      `Runtime ${key} is required`
    );
  }
}

function assertIsoDate(value, name) {
  assert(
    typeof value === 'string' && !Number.isNaN(Date.parse(value)),
    `${name} must be an ISO date`
  );
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
