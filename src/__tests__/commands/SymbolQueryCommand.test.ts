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
        '# [[GraphRepository]]\n\n@source src/storage/GraphRepository.ts\n\nDurable graph repository.\n',
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
  });
});
