#!/usr/bin/env node
'use strict';

/**
 * Proves the first legacy/canonical differential vertical slice.
 *
 * The runner owns only a disposable, versioned fixture. It restores one
 * legacy Build output and one canonical graph output, then reads each plane
 * independently through work-context. Production databases are never passed
 * to a mutating command by this comparator.
 */

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const fixturePath = resolveFixturePath(process.argv.slice(2));
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const cliPath = path.join(projectRoot, 'dist', 'cli.js');
const libraryPath = path.join(projectRoot, 'dist', 'index.js');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-work-context-diff-'));
const fixtureRoot = path.join(tempRoot, 'fixture');
const canonicalDatabase = path.join(fixtureRoot, '.tsdoc', 'canonical-graph.db');
const legacyDatabase = path.join(fixtureRoot, '.tsdoc', 'legacy.db');
const legacyOutput = path.join(tempRoot, 'legacy-only.md');
const canonicalOutput = path.join(tempRoot, 'compiler-only.md');

async function main() {
  try {
    assertFile(cliPath, 'Run npm run build before differential verification');
    assertFile(libraryPath, 'Run npm run build before differential verification');
    materializeFixture();
    await restoreCanonicalGraph();

    run(process.execPath, [cliPath, 'build', 'src'], fixtureRoot);
    const before = snapshotState();

    const parity = verifyParity();
    const compilerOnly = readWithDatabaseHidden(canonicalOutput, legacyDatabase);
    const legacyOnly = readWithDatabaseHidden(legacyOutput, canonicalDatabase);

    const comparison = compareOutputs({ compilerOnly, legacyOnly });
    const after = snapshotState();
    assertEqual(after, before, 'Differential reads must not mutate fixture database state');

    console.log(
      JSON.stringify(
        {
          contractId: 'tsdoc-edge/work-context-differential',
          contractVersion: '1.0',
          fixtureId: fixture.fixtureId,
          fixturePath: path.relative(projectRoot, fixturePath),
          status: 'passed',
          targetFile: fixture.targetFile,
          canonicalNodeCount: fixture.canonical.nodes.length,
          canonicalEdgeCount: fixture.canonical.edges.length,
          parity,
          comparison,
          limitations: [
            'legacy work-context does not expose canonical IDs or compiler edge kinds',
            'compiler-only work-context does not reproduce legacy documentation/test enrichment',
          ],
          productionState: 'unchanged',
        },
        null,
        2
      )
    );
  } finally {
    if (process.env.TSDOC_EDGE_KEEP_WORK_CONTEXT_DIFF === '1') {
      console.error(`Preserving failed differential fixture at ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function materializeFixture() {
  fs.mkdirSync(path.join(fixtureRoot, 'src'), { recursive: true });
  for (const [relativeFile, source] of Object.entries(fixture.sourceFiles)) {
    const absoluteFile = path.join(fixtureRoot, relativeFile);
    fs.mkdirSync(path.dirname(absoluteFile), { recursive: true });
    fs.writeFileSync(absoluteFile, source, 'utf8');
  }
  writeJson(path.join(fixtureRoot, 'tsconfig.ttsc.json'), {
    compilerOptions: { target: 'ES2020', module: 'commonjs', strict: true },
    include: ['src/**/*.ts'],
  });
  writeJson(path.join(fixtureRoot, '.tsdoc.config.json'), {
    project: { name: fixture.fixtureId, version: '1.0.0', rootDir: '.', srcDirs: ['src'] },
    paths: {
      databasePath: '.tsdoc/legacy.db',
      jsonlDir: '.tsdoc',
      commentsDir: '.tsdoc-comments',
      outputDir: '.tsdoc/output',
      generatedDir: '.tsdoc/generated',
      reportsDir: '.tsdoc/reports',
    },
  });
}

function restoreCanonicalGraph() {
  const api = require(libraryPath);
  const indexer = new api.ProjectIndexer({
    id: fixture.fixtureId,
    load: async ({ rootDir, tsconfigPath }) => ({
      rootDir,
      tsconfigPath: path.resolve(rootDir, tsconfigPath),
      nodes: fixture.canonical.nodes,
      edges: fixture.canonical.edges,
      provenance: {
        adapter: 'versioned-work-context-fixture',
        producer: 'tsdoc-edge',
        producerVersion: fixture.contractVersion,
        artifactContractId: fixture.contractId,
        artifactContractVersion: fixture.contractVersion,
        compilerVersion: null,
        typescriptCompatibilityTarget: 'fixture',
      },
    }),
  });
  return indexer
    .index({ rootDir: fixtureRoot, tsconfigPath: 'tsconfig.ttsc.json' })
    .then(({ graph }) => {
      const repository = new api.GraphRepository(canonicalDatabase);
      repository.replaceActiveRevision(graph, { aliases: api.materializeAliases(graph) });
      repository.close();
      const sqlite = require('better-sqlite3');
      const database = new sqlite(canonicalDatabase);
      database.pragma('journal_mode = DELETE');
      database.close();
    });
}

function verifyParity() {
  const api = require(libraryPath);
  const repository = new api.GraphRepository(canonicalDatabase, { readOnly: true });
  const revision = repository.readActiveRevision();
  if (!revision) throw new Error('Canonical differential fixture has no active revision');
  const result = api.verifyLegacyAstParity(revision.graph, fixtureRoot, [fixture.targetFile]);
  repository.close();
  assertEqual(
    result.matched,
    fixture.expected.legacyMatchedSymbols,
    'Legacy AST parity count differs from the versioned fixture'
  );
  assertEqual(result.mismatches, [], 'Legacy AST parity produced mismatches');
  return result;
}

function readWithDatabaseHidden(outputPath, databasePath) {
  const hidden = hideDatabase(databasePath);
  try {
    run(
      process.execPath,
      [cliPath, 'work-context', fixture.targetFile, '--llm', '--output', outputPath],
      fixtureRoot
    );
    return fs.readFileSync(outputPath, 'utf8');
  } finally {
    restoreDatabase(hidden);
  }
}

function compareOutputs({ compilerOnly, legacyOnly }) {
  const canonicalIds = [...compilerOnly.matchAll(/^[-*] `([^`]+)`/gm)].map((match) => match[1]);
  const expectedIds = [...fixture.expected.canonicalIds].sort();
  const actualIds = canonicalIds.filter((id) => id.includes('#')).sort();
  assertEqual(
    actualIds,
    expectedIds,
    'Compiler-only work-context canonical IDs differ from fixture'
  );
  assert(
    compilerOnly.includes('## Canonical Structural Graph'),
    'Compiler-only output lacks canonical graph section'
  );
  assert(
    compilerOnly.includes('No primary symbol found.'),
    'Compiler-only output lacks the legacy absence marker'
  );
  const expectedPrimarySummary = `**${fixture.expected.legacyPrimarySymbol}** is a `;
  assert(
    legacyOnly.includes(expectedPrimarySummary),
    `Legacy-only output lacks the primary legacy symbol: ${expectedPrimarySummary}`
  );
  assert(
    !legacyOnly.includes('## Canonical Structural Graph'),
    'Legacy-only output unexpectedly includes canonical graph data'
  );
  return {
    exact: {
      targetFile: fixture.targetFile,
      compilerOnlyCanonicalSection: true,
      compilerOnlyLegacyUnavailable: true,
      legacyOnlyCanonicalSection: false,
    },
    normalized: {
      canonicalIds: actualIds,
      legacyPrimarySymbol: fixture.expected.legacyPrimarySymbol,
      legacyMatchedSymbols: fixture.expected.legacyMatchedSymbols,
    },
    legacyOnly: {
      canonicalStructuralGraph: false,
      primarySymbol: fixture.expected.legacyPrimarySymbol,
    },
    compilerOnly: { canonicalStructuralGraph: true, canonicalIds: actualIds },
  };
}

function snapshotState() {
  const paths = [
    canonicalDatabase,
    `${canonicalDatabase}-wal`,
    `${canonicalDatabase}-shm`,
    legacyDatabase,
    `${legacyDatabase}-wal`,
    `${legacyDatabase}-shm`,
    path.join(fixtureRoot, '.tsdoc', 'registry.jsonl'),
  ];
  return paths.map((filePath) => ({
    filePath: path.relative(fixtureRoot, filePath),
    exists: fs.existsSync(filePath),
    size: fs.existsSync(filePath) ? fs.statSync(filePath).size : null,
    digest: fs.existsSync(filePath)
      ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
      : null,
  }));
}

function hideDatabase(databasePath) {
  const files = ['', '-wal', '-shm', '-journal']
    .map((suffix) => `${databasePath}${suffix}`)
    .filter((filePath) => fs.existsSync(filePath));
  return files.map((filePath) => {
    const hiddenPath = `${filePath}.hidden-${process.pid}`;
    fs.renameSync(filePath, hiddenPath);
    return { filePath, hiddenPath };
  });
}

function restoreDatabase(hidden) {
  for (const { filePath, hiddenPath } of hidden.reverse()) fs.renameSync(hiddenPath, filePath);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolveFixturePath(args) {
  const argument = args.find((value) => value.startsWith('--fixture='));
  const requested = argument?.slice('--fixture='.length);
  return path.resolve(
    projectRoot,
    requested ?? path.join('scripts', 'fixtures', 'work-context-differential.v1.json')
  );
}

function assertFile(filePath, message) {
  if (!fs.existsSync(filePath)) throw new Error(`${message}: ${filePath}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nexpected: ${JSON.stringify(expected)}\nactual: ${JSON.stringify(actual)}`
    );
  }
}

function run(command, args, cwd) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    env: { ...process.env, TSDOC_EDGE_USAGE_ANALYTICS: '0', npm_config_update_notifier: 'false' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim().slice(-5000);
    throw new Error(
      `${command} ${args.join(' ')} failed with exit ${String(result.status)}\n${detail}`
    );
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
