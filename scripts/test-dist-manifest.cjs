'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const manifestFileName = '.build-complete.json';
const inputFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.ttsc.json',
  'tsconfig.test.ttsc.json',
  'scripts/build-test-dist.cjs',
  'scripts/run-ttsc.cjs',
  'scripts/test-dist-manifest.cjs',
];

function collectFiles(directory) {
  const files = [];

  function visit(currentDirectory) {
    const entries = fs
      .readdirSync(currentDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  visit(directory);
  return files;
}

function digestFiles(files, relativeTo) {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    const relativePath = path.relative(relativeTo, file).split(path.sep).join('/');
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function createTestInputDigest(projectRoot) {
  const sourceFiles = collectFiles(path.join(projectRoot, 'src'));
  const configurationFiles = inputFiles.map((file) => path.join(projectRoot, file));
  return digestFiles([...configurationFiles, ...sourceFiles].sort(), projectRoot);
}

function createOutputState(outputDirectory) {
  const files = collectFiles(outputDirectory).filter(
    (file) => path.basename(file) !== manifestFileName
  );
  const testFileCount = files.filter((file) =>
    /(?:^|[/\\])__tests__[/\\].+\.test\.js$/.test(file)
  ).length;
  return {
    fileCount: files.length,
    testFileCount,
    outputDigest: digestFiles(files, outputDirectory),
  };
}

function writeTestDistManifest(projectRoot, outputDirectory, inputDigest) {
  const currentInputDigest = createTestInputDigest(projectRoot);
  if (currentInputDigest !== inputDigest) {
    throw new Error('Test inputs changed during compilation; run the test compilation again');
  }

  const outputState = createOutputState(outputDirectory);
  if (outputState.testFileCount === 0) {
    throw new Error('Test compilation produced no emitted test files');
  }

  const manifestPath = path.join(outputDirectory, manifestFileName);
  const temporaryPath = `${manifestPath}.tmp-${process.pid}`;
  const manifest = {
    schemaVersion: 1,
    inputDigest,
    ...outputState,
  };
  fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, manifestPath);
}

function assertTestDistComplete(projectRoot, outputDirectory) {
  const manifestPath = path.join(outputDirectory, manifestFileName);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Compiled test output is incomplete; run npm run test:compile (${error.message})`
    );
  }

  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.inputDigest !== 'string' ||
    typeof manifest.outputDigest !== 'string' ||
    !Number.isInteger(manifest.fileCount) ||
    !Number.isInteger(manifest.testFileCount)
  ) {
    throw new Error('Compiled test output manifest is invalid; run npm run test:compile');
  }

  if (createTestInputDigest(projectRoot) !== manifest.inputDigest) {
    throw new Error('Compiled test output is stale; run npm run test:compile');
  }

  const outputState = createOutputState(outputDirectory);
  if (
    outputState.outputDigest !== manifest.outputDigest ||
    outputState.fileCount !== manifest.fileCount ||
    outputState.testFileCount !== manifest.testFileCount
  ) {
    throw new Error('Compiled test output was modified or truncated; run npm run test:compile');
  }
}

module.exports = {
  assertTestDistComplete,
  createTestInputDigest,
  writeTestDistManifest,
};
