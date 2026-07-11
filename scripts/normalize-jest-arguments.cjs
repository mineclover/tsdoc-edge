'use strict';

const path = require('node:path');

const optionsWithOneValue = new Set([
  '--coverageDirectory',
  '--filter',
  '--maxWorkers',
  '--outputFile',
  '--seed',
  '--shard',
  '--testNamePattern',
  '--testPathPattern',
  '--testRegex',
  '--testTimeout',
  '-t',
  '-w',
]);
const unsupportedSourceGraphOptions = new Set([
  '--changedFilesWithAncestor',
  '--changedSince',
  '--lastCommit',
  '--onlyChanged',
  '--watch',
  '--watchAll',
  '-o',
]);
const sourcePattern = /\.tsx?$/i;
const testSourcePattern = /\.(?:test|spec)\.tsx?$/i;

function normalizeSourcePath(argument, projectRoot, pattern) {
  if (!pattern.test(argument)) {
    return argument;
  }

  const portableArgument = argument.replace(/[\\/]/g, path.sep);
  const sourceRoot = path.join(projectRoot, 'src');
  const absoluteArgument = path.isAbsolute(portableArgument)
    ? path.normalize(portableArgument)
    : path.resolve(projectRoot, portableArgument);
  const sourceRelativePath = path.relative(sourceRoot, absoluteArgument);

  if (
    sourceRelativePath !== '' &&
    sourceRelativePath !== '..' &&
    !sourceRelativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(sourceRelativePath)
  ) {
    const outputPath = path
      .join(projectRoot, '.test-dist', sourceRelativePath)
      .replace(/\.tsx?$/i, '.js');
    return path.isAbsolute(portableArgument) ? outputPath : path.relative(projectRoot, outputPath);
  }

  if (!portableArgument.includes(path.sep)) {
    return portableArgument.replace(/\.tsx?$/i, '.js');
  }
  return argument;
}

function normalizeJestArguments(arguments_, projectRoot) {
  let runTestsByPath = false;
  let findRelatedTests = false;
  let skipNextValue = false;

  for (const argument of arguments_) {
    const option = argument.split('=', 1)[0];
    if (unsupportedSourceGraphOptions.has(option)) {
      const alternative =
        option === '--watch' || option === '--watchAll'
          ? 'use npm run test:watch instead'
          : 'select explicit source tests or use --findRelatedTests instead';
      throw new Error(`${option} is unsafe against compiled test output; ${alternative}`);
    }
  }

  return arguments_.map((argument) => {
    if (skipNextValue) {
      skipNextValue = false;
      return argument;
    }
    if (argument === '--runTestsByPath') {
      runTestsByPath = true;
      findRelatedTests = false;
      return argument;
    }
    if (argument.startsWith('--runTestsByPath=')) {
      const value = argument.slice('--runTestsByPath='.length);
      return `--runTestsByPath=${normalizeSourcePath(value, projectRoot, testSourcePattern)}`;
    }
    if (argument === '--findRelatedTests') {
      findRelatedTests = true;
      runTestsByPath = false;
      return argument;
    }
    if (argument.startsWith('--findRelatedTests=')) {
      const value = argument.slice('--findRelatedTests='.length);
      return `--findRelatedTests=${normalizeSourcePath(value, projectRoot, sourcePattern)}`;
    }
    if (argument.startsWith('-')) {
      runTestsByPath = false;
      findRelatedTests = false;
      const option = argument.split('=', 1)[0];
      if (!argument.includes('=') && optionsWithOneValue.has(option)) {
        skipNextValue = true;
      }
      return argument;
    }
    if (findRelatedTests) {
      return normalizeSourcePath(argument, projectRoot, sourcePattern);
    }
    if (runTestsByPath || testSourcePattern.test(argument)) {
      return normalizeSourcePath(argument, projectRoot, testSourcePattern);
    }
    return argument;
  });
}

module.exports = { normalizeJestArguments };
