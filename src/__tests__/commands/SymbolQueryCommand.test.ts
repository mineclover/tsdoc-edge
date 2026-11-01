/**
 * Tests for SymbolQueryCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SymbolQueryCommand } from '../../commands/SymbolQueryCommand';
import { ConfigManager } from '../../config/ConfigManager';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('SymbolQueryCommand', () => {
  let command: SymbolQueryCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symbol-query-'));
    process.chdir(tempDir);
    ConfigManager.reset();
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new SymbolQueryCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCanonicalEnv === undefined) {
      delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    } else {
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB = originalCanonicalEnv;
    }
    process.chdir(originalCwd);
    ConfigManager.reset();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-query');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('rejects unknown flags fail-closed', async () => {
      const result = await command.execute(['GraphRepository', '--unknown-flag']);
      expect(result.exitCode).toBe(1);
    });

    it('resolves direct <symbol> queries across both Canonical @ttsc/graph and [[Symbol]] docs', async () => {
      fs.mkdirSync(path.join(tempDir, 'managed'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'managed', 'graph-repo.md'),
        '# [[GraphRepository]]\n\n**Source**: `src/storage/GraphRepository.ts`\n\nDurable graph repository.\n',
        'utf-8'
      );

      const repo = new GraphRepository(path.join(tempDir, '.tsdoc', 'canonical-graph.db'));
      const nodes: CanonicalGraphNode[] = [
        {
          id: 'src/commands/SyncCommand.ts#SyncCommand:class',
          sourceId: 'src/commands/SyncCommand.ts#SyncCommand:class',
          kind: 'class',
          name: 'SyncCommand',
          qualifiedName: 'SyncCommand',
          file: 'src/commands/SyncCommand.ts',
          exported: true,
          evidence: { file: 'src/commands/SyncCommand.ts', startLine: 20 },
        },
        {
          id: 'src/storage/GraphRepository.ts#GraphRepository:class',
          sourceId: 'src/storage/GraphRepository.ts#GraphRepository:class',
          kind: 'class',
          name: 'GraphRepository',
          qualifiedName: 'GraphRepository',
          file: 'src/storage/GraphRepository.ts',
          exported: true,
          evidence: { file: 'src/storage/GraphRepository.ts', startLine: 95 },
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'instantiates',
          from: 'src/commands/SyncCommand.ts#SyncCommand:class',
          to: 'src/storage/GraphRepository.ts#GraphRepository:class',
        },
      ];
      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.json'),
        nodes,
        edges,
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
      };
      repo.replaceActiveRevision(graph);
      repo.close();

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const jsonRes = await command.execute(['GraphRepository', '--json']);
      expect(jsonRes.exitCode).toBe(0);
      const payload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        found: boolean;
        codeSymbols: Array<{ name: string; kind: string; dependents: number }>;
        documentSymbol: { name: string; primary: { line: number } | null } | null;
      };
      expect(payload.found).toBe(true);
      expect(payload.codeSymbols).toHaveLength(1);
      expect(payload.codeSymbols[0].name).toBe('GraphRepository');
      expect(payload.codeSymbols[0].dependents).toBe(1);
      expect(payload.documentSymbol?.name).toBe('GraphRepository');
      expect(payload.documentSymbol?.primary?.line).toBe(1);

      logSpy.mockClear();
      const missingRes = await command.execute(['GraphRepositryTypo']);
      expect(missingRes.exitCode).toBe(1);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('GraphRepository');

      logSpy.mockClear();
      const listRes = await command.execute(['list']);
      expect(listRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('[[GraphRepository]]');
    });

    it('guards against subcommand typos, gibberish suggestions, undefined [[Refs]], test fixtures, and unbound homonyms', async () => {
      fs.mkdirSync(path.join(tempDir, 'managed', 'types'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'managed', 'types', 'Symbol.md'),
        '# [[Symbol]]\n\n**Source**: `src/types/graph/graph.ts`\n\nMentions [[UndefinedGhostRef]] in prose.\n',
        'utf-8'
      );

      const repo = new GraphRepository(path.join(tempDir, '.tsdoc', 'canonical-graph.db'));
      const nodes: CanonicalGraphNode[] = [
        {
          id: 'src/__tests__/fixtures/DummyFixture.ts#UserService:class',
          sourceId: 'src/__tests__/fixtures/DummyFixture.ts#UserService:class',
          kind: 'class',
          name: 'UserService',
          qualifiedName: 'UserService',
          file: 'src/__tests__/fixtures/DummyFixture.ts',
          exported: true,
          evidence: { file: 'src/__tests__/fixtures/DummyFixture.ts', startLine: 5 },
        },
        {
          id: 'src/commands/ListSymbol.ts#list:function',
          sourceId: 'src/commands/ListSymbol.ts#list:function',
          kind: 'function',
          name: 'list',
          qualifiedName: 'list',
          file: 'src/commands/ListSymbol.ts',
          exported: true,
          evidence: { file: 'src/commands/ListSymbol.ts', startLine: 12 },
        },
        {
          id: 'src/storage/GraphRepository.ts#GraphRepository.clock:variable',
          sourceId: 'src/storage/GraphRepository.ts#GraphRepository.clock:variable',
          kind: 'variable',
          name: 'clock',
          qualifiedName: 'GraphRepository.clock',
          file: 'src/storage/GraphRepository.ts',
          exported: false,
          evidence: { file: 'src/storage/GraphRepository.ts', startLine: 290 },
        },
        {
          id: 'src/storage/GraphRepository.ts#GraphRepository:class',
          sourceId: 'src/storage/GraphRepository.ts#GraphRepository:class',
          kind: 'class',
          name: 'GraphRepository',
          qualifiedName: 'GraphRepository',
          file: 'src/storage/GraphRepository.ts',
          exported: true,
          evidence: { file: 'src/storage/GraphRepository.ts', startLine: 288 },
        },
        {
          id: 'src/storage/schema.ts#Symbol:type',
          sourceId: 'src/storage/schema.ts#Symbol:type',
          kind: 'type',
          name: 'Symbol',
          qualifiedName: 'Symbol',
          file: 'src/storage/schema.ts',
          exported: true,
          evidence: { file: 'src/storage/schema.ts', startLine: 429 },
        },
        {
          id: 'src/types/graph/graph.ts#Symbol:interface',
          sourceId: 'src/types/graph/graph.ts#Symbol:interface',
          kind: 'interface',
          name: 'Symbol',
          qualifiedName: 'Symbol',
          file: 'src/types/graph/graph.ts',
          exported: true,
          evidence: { file: 'src/types/graph/graph.ts', startLine: 43 },
        },
      ].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const edges: CanonicalGraphEdge[] = [];
      repo.replaceActiveRevision({
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.json'),
        nodes,
        edges,
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
      });
      repo.close();

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      // 1. Multi-arg unknown subcommand fails closed instead of ignoring 2nd arg
      const badSubRes = await command.execute(['serach', 'Symbol']);
      expect(badSubRes.exitCode).toBe(1);
      expect([...logSpy.mock.calls.flat(), ...errSpy.mock.calls.flat()].join('\n')).toContain(
        "Did you mean 'search'?"
      );

      // 2. Single-arg subcommand typo surfaces subcommandHint and 0 bogus symbol suggestions
      logSpy.mockClear();
      const singleSubTypoRes = await command.execute(['serach', '--json']);
      expect(singleSubTypoRes.exitCode).toBe(1);
      const subTypoPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        found: boolean;
        subcommandHint?: string;
        suggestions?: string[];
      };
      expect(subTypoPayload.found).toBe(false);
      expect(subTypoPayload.subcommandHint).toBe('search');
      expect(subTypoPayload.suggestions).toBeUndefined();

      // 3. Gibberish produces 0 false-positive suggestions
      logSpy.mockClear();
      const gibberishRes = await command.execute(['qqqq', '--json']);
      expect(gibberishRes.exitCode).toBe(1);
      const gibberishPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        found: boolean;
        suggestions?: string[];
      };
      expect(gibberishPayload.found).toBe(false);
      expect(gibberishPayload.suggestions).toBeUndefined();

      // 4. Undefined [[UndefinedGhostRef]] in prose is NOT treated as a defined checkpoint
      logSpy.mockClear();
      const ghostRes = await command.execute(['UndefinedGhostRef', '--json']);
      expect(ghostRes.exitCode).toBe(1);
      const ghostPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        found: boolean;
        documentSymbol: unknown;
      };
      expect(ghostPayload.found).toBe(false);
      expect(ghostPayload.documentSymbol).toBeNull();

      // 5. Test/fixture symbol excluded by default, opt-in via --include-tests
      logSpy.mockClear();
      const fixtureDefaultRes = await command.execute(['UserService', '--json']);
      expect(fixtureDefaultRes.exitCode).toBe(1);
      logSpy.mockClear();
      const fixtureIncludedRes = await command.execute([
        'UserService',
        '--include-tests',
        '--json',
      ]);
      expect(fixtureIncludedRes.exitCode).toBe(0);

      // 6. Typo suggestion excludes dotted member clutter (GraphRepository.clock) on dot-free queries
      logSpy.mockClear();
      const typoRes = await command.execute(['GraphRepositry', '--json']);
      expect(typoRes.exitCode).toBe(1);
      const typoPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        suggestions?: string[];
      };
      expect(typoPayload.suggestions).toEqual(['GraphRepository']);

      // 7. Homonym provenance binding ranks @source-bound symbol first and marks unbound homonym explicitly
      logSpy.mockClear();
      const homonymRes = await command.execute(['Symbol', '--json']);
      expect(homonymRes.exitCode).toBe(0);
      const homonymPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        codeSymbols: Array<{ filePath: string; docBinding: string | null }>;
        suggestions?: string[];
      };
      expect(homonymPayload.suggestions).toBeUndefined();
      expect(homonymPayload.codeSymbols).toHaveLength(2);
      expect(homonymPayload.codeSymbols[0]).toMatchObject({
        filePath: 'src/types/graph/graph.ts',
        docBinding: 'bound-@source',
      });
      expect(homonymPayload.codeSymbols[1]).toMatchObject({
        filePath: 'src/storage/schema.ts',
        docBinding: 'unbound-homonym',
      });

      // 8. Explicit `lookup <symbol>` resolves symbols that collide with subcommand names (`list`)
      logSpy.mockClear();
      const lookupCollisionRes = await command.execute(['lookup', 'list', '--json']);
      expect(lookupCollisionRes.exitCode).toBe(0);
      const collisionPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        codeSymbols: Array<{ name: string; filePath: string }>;
      };
      expect(collisionPayload.codeSymbols[0]).toMatchObject({
        name: 'list',
        filePath: 'src/commands/ListSymbol.ts',
      });
    });
  });
});
