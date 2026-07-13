#!/usr/bin/env node
'use strict';

/**
 * Proves the ttsc provider survives separate packed installations without
 * allowing local router binary/config paths to change saved snapshot identity.
 */

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const routerRoot = path.resolve(
  process.env.TSDOC_EDGE_TTSC_ROUTER_DIR ??
    path.join(projectRoot, '..', 'ttsc-ex', 'packages', 'ttsc-graph-router')
);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-ttsc-provider-'));
const packageDirectory = path.join(tempRoot, 'packages');
const fixtureRoot = path.join(tempRoot, 'fixture');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let passed = false;
try {
  assertFile(path.join(projectRoot, 'dist', 'cli.js'), 'Run npm run build before this canary');
  assertFile(
    path.join(routerRoot, 'package.json'),
    'Set TSDOC_EDGE_TTSC_ROUTER_DIR to the router package'
  );
  assertFile(
    path.join(routerRoot, 'dist', 'artifact-source.js'),
    'Build the ttsc graph-router package before this canary'
  );
  fs.mkdirSync(packageDirectory, { recursive: true });
  createFixture(fixtureRoot);

  const tsdocTarball = pack(projectRoot, packageDirectory);
  const routerTarball = pack(routerRoot, packageDirectory);
  const first = runPackedConsumer('source-layout', tsdocTarball, routerTarball);
  const second = runPackedConsumer('packed-layout', tsdocTarball, routerTarball);

  assertEqual(first.graph.fingerprint, second.graph.fingerprint, 'canonical content fingerprint');
  assertEqual(
    first.graph.provenance.providerSnapshotId,
    second.graph.provenance.providerSnapshotId,
    'provider snapshot identity'
  );
  assertEqual(first.revisionId, second.revisionId, 'canonical revision identity');
  for (const result of [first, second]) {
    if (result.graph.nodes.some((node) => node.id.startsWith('/'))) {
      throw new Error('Canonical node IDs must not contain absolute paths');
    }
    if (result.graph.provenance.compilerVersion !== null) {
      throw new Error('The router must not infer an unreported compiler version');
    }
  }

  console.log(
    JSON.stringify(
      {
        contractId: 'tsdoc-edge/ttsc-provider-packed-canary',
        contractVersion: '1.0',
        status: 'passed',
        nodeCount: first.graph.nodes.length,
        edgeCount: first.graph.edges.length,
        snapshotId: first.graph.provenance.providerSnapshotId,
        revisionId: first.revisionId,
      },
      null,
      2
    )
  );
  passed = true;
} finally {
  if (!passed && process.env.TSDOC_EDGE_KEEP_TTSC_PROVIDER_CANARY === '1') {
    console.error(`Preserving failed ttsc provider canary at ${tempRoot}`);
  } else {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function createFixture(root) {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  writeJson(path.join(root, 'package.json'), {
    name: 'ttsc-provider-fixture',
    private: true,
    version: '0.0.0',
  });
  writeJson(path.join(root, '.tsdoc.config.json'), {
    project: { name: 'ttsc-provider-fixture', version: '0.0.0', srcDirs: ['src'] },
    paths: {
      commentsDir: 'docs/comments',
      databasePath: '.tsdoc/legacy.db',
      jsonlDir: '.tsdoc/data',
    },
  });
  writeJson(path.join(root, 'tsconfig.json'), {
    compilerOptions: { target: 'ES2022', module: 'NodeNext' },
  });
  fs.writeFileSync(
    path.join(root, 'src', 'index.ts'),
    'export const answer = 42;\nexport function readAnswer(): number { return answer; }\n',
    'utf8'
  );
  run('git', ['init', '--quiet'], root);
  run('git', ['add', '.'], root);
  run(
    'git',
    [
      '-c',
      'user.name=ttsc-provider-canary',
      '-c',
      'user.email=canary@example.test',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
    root
  );
}

function pack(cwd, destination) {
  const output = run(npm, ['pack', '--json', '--pack-destination', destination], cwd).stdout;
  const metadata = JSON.parse(output);
  if (
    !Array.isArray(metadata) ||
    metadata.length !== 1 ||
    typeof metadata[0]?.filename !== 'string'
  ) {
    throw new Error(`npm pack returned invalid metadata for ${cwd}`);
  }
  const tarball = path.join(destination, metadata[0].filename);
  assertFile(tarball, `npm pack did not produce ${metadata[0].filename}`);
  return tarball;
}

function runPackedConsumer(name, tsdocTarball, routerTarball) {
  const consumer = path.join(tempRoot, name);
  fs.mkdirSync(consumer, { recursive: true });
  writeJson(path.join(consumer, 'package.json'), { name, private: true, version: '0.0.0' });
  run(npm, ['install', '--no-audit', '--no-fund', tsdocTarball, routerTarball], consumer);
  const routerConfig = path.join(consumer, 'router.config.json');
  writeJson(routerConfig, {
    cacheDir: '.router-cache',
    repos: { fixture: { cwd: fixtureRoot, tsconfig: 'tsconfig.json' } },
  });
  const databasePath = path.join(consumer, 'canonical.db');
  const cli = path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'cli.js');
  run(
    process.execPath,
    [
      cli,
      'build',
      'src',
      '--canonical-graph',
      '--canonical-only',
      '--router-module=@ttsc-ex/ttsc-graph-router/artifact-source',
      `--router-config=${routerConfig}`,
      '--router-repo=fixture',
      '--graph-workspace=packed-provider-fixture',
      '--graph-namespace=ttsc:packed-provider-fixture',
      '--graph-tsconfig=tsconfig.json',
      `--canonical-graph-db=${databasePath}`,
    ],
    fixtureRoot
  );
  const { GraphRepository } = require(
    path.join(consumer, 'node_modules', 'tsdoc-edge', 'dist', 'storage', 'GraphRepository')
  );
  const repository = new GraphRepository(databasePath);
  const active = repository.readActiveRevision();
  repository.close();
  if (!active) throw new Error(`Missing active canonical revision for ${name}`);
  return { revisionId: active.metadata.revisionId, graph: active.graph };
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
    throw new Error(
      `${command} ${args.join(' ')} failed (status ${result.status}, signal ${result.signal ?? 'none'}):\n${`${result.stdout}\n${result.stderr}`.slice(-4000)}`
    );
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function assertFile(file, message) {
  if (!fs.existsSync(file)) throw new Error(message);
}

function assertEqual(left, right, label) {
  if (left !== right) throw new Error(`Packed consumers disagree on ${label}`);
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
