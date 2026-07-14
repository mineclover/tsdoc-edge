/**
 * Tests for SyncCoverageCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { SyncCoverageCommand } from '../../commands/SyncCoverageCommand';
import { canonicalProjectGraphFingerprint } from '../../indexer/ProjectIndexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('SyncCoverageCommand', () => {
  let command: SyncCoverageCommand;

  beforeEach(() => {
    command = new SyncCoverageCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('sync-coverage');
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

    it('stores a source-identified execution report', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-sync-coverage-'));
      const coveragePath = path.join(tempDir, 'coverage-final.json');
      const reportDbPath = path.join(tempDir, 'reports.db');
      fs.writeFileSync(
        coveragePath,
        JSON.stringify({
          '/project/src/fixture.ts': {
            path: '/project/src/fixture.ts',
            statementMap: {
              0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
            },
            fnMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        }),
        'utf-8'
      );

      try {
        const result = await command.execute([
          coveragePath,
          '--workspace',
          'fixture-workspace',
          '--report-db',
          reportDbPath,
        ]);

        expect(result.exitCode).toBe(0);
        const database = new Database(reportDbPath, { readonly: true });
        const row = database
          .prepare('SELECT workspace_id, report_id FROM coverage_metric_reports')
          .get() as { workspace_id: string; report_id: string };
        database.close();
        expect(row.workspace_id).toBe('fixture-workspace');
        expect(row.report_id).toMatch(/^coverage-report:coverage-source:sha256:/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('prints a canonical graph projection when a graph revision is selected', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-sync-graph-'));
      const coveragePath = path.join(tempDir, 'coverage-final.json');
      const graphDbPath = path.join(tempDir, 'canonical-graph.db');
      const reportDbPath = path.join(tempDir, 'reports.db');
      const sourceFile = path.join(tempDir, 'src', 'fixture.ts');
      const nodeId = `${sourceFile}#fixture:function`;
      const nodes = [
        {
          id: nodeId,
          sourceId: nodeId,
          kind: 'function',
          name: 'fixture',
          file: sourceFile,
          evidence: { startLine: 1, endLine: 2 },
        },
      ] as const;
      const graph = {
        contractVersion: '1.0' as const,
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.json'),
        nodes,
        edges: [] as const,
        provenance: { adapter: 'fixture', producer: 'fixture', workspaceId: 'fixture-workspace' },
        fingerprint: canonicalProjectGraphFingerprint(nodes, []),
      };
      fs.writeFileSync(
        coveragePath,
        JSON.stringify({
          [sourceFile]: {
            path: sourceFile,
            statementMap: {
              0: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
            },
            fnMap: {
              0: {
                name: 'fixture',
                decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 8 } },
                loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
              },
            },
            s: { 0: 1 },
            f: { 0: 1 },
            b: {},
          },
        }),
        'utf-8'
      );

      const graphRepository = new GraphRepository(graphDbPath);
      graphRepository.replaceActiveRevision(graph);
      graphRepository.close();

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        const result = await command.execute([
          coveragePath,
          '--workspace',
          'fixture-workspace',
          '--report-db',
          reportDbPath,
          '--canonical-graph-db',
          graphDbPath,
        ]);

        expect(result.exitCode).toBe(0);
        expect(logSpy.mock.calls.flat().join('\n')).toContain(
          'Function evidence: 1 direct, 0 unmatched'
        );
      } finally {
        logSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
