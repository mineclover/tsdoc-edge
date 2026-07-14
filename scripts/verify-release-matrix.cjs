#!/usr/bin/env node
'use strict';

/** Inspect an external GitHub CI qualification run without mutating remote state. */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const defaultRepository = 'mineclover/tsdoc-edge';
const expectedWorkflow = 'CI';
const expectedOperatingSystems = ['ubuntu-latest', 'macos-15'];
const expectedExecutions = ['--runInBand', '--maxWorkers=2'];
const expectedAttempts = [1, 2];

if (require.main === module) main();

module.exports = { parseArguments, validateRun };

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const run = options.inputPath
      ? readJson(options.inputPath)
      : fetchRun(options.runId, options.repository);
    validateRun(run, options.expectedSha);

    console.log(
      JSON.stringify(
        {
          contractId: 'tsdoc-edge/release-matrix-evidence',
          contractVersion: '1.0',
          status: 'passed',
          runId: String(run.databaseId),
          url: run.url,
          repository: options.repository,
          workflowName: run.workflowName,
          headSha: run.headSha,
          matrix: {
            operatingSystems: expectedOperatingSystems,
            executionModes: expectedExecutions,
            attempts: expectedAttempts,
            testJobCount:
              expectedOperatingSystems.length * expectedExecutions.length * expectedAttempts.length,
          },
          publishCheck: 'passed',
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
}

function parseArguments(arguments_) {
  const options = {
    repository: process.env.GITHUB_REPOSITORY ?? defaultRepository,
    runId: undefined,
    inputPath: undefined,
    expectedSha: undefined,
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (
      argument === '--run-id' ||
      argument === '--repo' ||
      argument === '--sha' ||
      argument === '--input'
    ) {
      const value = arguments_[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      if (argument === '--run-id') options.runId = value;
      if (argument === '--repo') options.repository = value;
      if (argument === '--sha') options.expectedSha = value;
      if (argument === '--input') options.inputPath = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--run-id=')) options.runId = argument.slice('--run-id='.length);
    else if (argument.startsWith('--repo=')) options.repository = argument.slice('--repo='.length);
    else if (argument.startsWith('--sha=')) options.expectedSha = argument.slice('--sha='.length);
    else if (argument.startsWith('--input=')) options.inputPath = argument.slice('--input='.length);
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!options.runId && !options.inputPath) {
    throw new Error('Pass --run-id <id> or --input <gh-run-view.json>');
  }
  if (options.runId && options.inputPath) {
    throw new Error('Pass only one of --run-id or --input');
  }
  return options;
}

function fetchRun(runId, repository) {
  const result = childProcess.spawnSync(
    'gh',
    [
      'run',
      'view',
      runId,
      '--repo',
      repository,
      '--json',
      'databaseId,workflowName,status,conclusion,headSha,jobs,url',
    ],
    { cwd: projectRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `gh run view failed with exit ${String(result.status)}: ${result.stderr.trim()}`
    );
  }
  return parseJson(result.stdout, 'gh run view output');
}

function readJson(inputPath) {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  return parseJson(fs.readFileSync(resolvedPath, 'utf8'), resolvedPath);
}

function validateRun(run, expectedSha) {
  assert(run && typeof run === 'object', 'GitHub run evidence must be an object');
  assert(run.workflowName === expectedWorkflow, `Expected workflow ${expectedWorkflow}`);
  assert(run.status === 'completed', `GitHub run is not completed: ${String(run.status)}`);
  assert(run.conclusion === 'success', `GitHub run conclusion is ${String(run.conclusion)}`);
  assert(
    typeof run.headSha === 'string' && run.headSha.length > 0,
    'GitHub run headSha is required'
  );
  if (expectedSha && run.headSha !== expectedSha) {
    throw new Error(`GitHub run SHA ${run.headSha} does not match expected SHA ${expectedSha}`);
  }
  assert(Array.isArray(run.jobs), 'GitHub run jobs are required');

  const expectedTestJobs = new Set();
  for (const operatingSystem of expectedOperatingSystems) {
    for (const execution of expectedExecutions) {
      for (const attempt of expectedAttempts) {
        expectedTestJobs.add(`test (${operatingSystem}, ${execution}, ${attempt})`);
      }
    }
  }

  const testJobs = run.jobs.filter((job) => expectedTestJobs.has(job.name));
  assert(testJobs.length === expectedTestJobs.size, `Expected ${expectedTestJobs.size} test jobs`);
  for (const jobName of expectedTestJobs) {
    const job = testJobs.find((candidate) => candidate.name === jobName);
    assert(job, `Missing matrix job: ${jobName}`);
    assert(job.status === 'completed', `Matrix job is not completed: ${jobName}`);
    assert(job.conclusion === 'success', `Matrix job did not pass: ${jobName}`);
  }

  const publishChecks = run.jobs.filter((job) => job.name === 'publish-check');
  assert(publishChecks.length === 1, 'Expected exactly one publish-check job');
  assert(publishChecks[0].status === 'completed', 'publish-check is not completed');
  assert(publishChecks[0].conclusion === 'success', 'publish-check did not pass');
}

function parseJson(value, source) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(
      `${source} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
