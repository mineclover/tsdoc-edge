/**
 * Tests for RelationshipImpactCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipImpactCommand } from '../../commands/RelationshipImpactCommand';
import { GraphAnalysisService } from '../../graph-analysis';
import { CanonicalAliasContext } from '../../indexer';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('RelationshipImpactCommand', () => {
  let command: RelationshipImpactCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-impact-'));
    process.chdir(tempDir);
    command = new RelationshipImpactCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-impact');
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

    it('accepts a canonical id and applies direction and category filters', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();

      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes: [
          { id: 'src/a.ts#A:class', sourceId: 'src/a.ts#A:class', kind: 'class', name: 'A' },
          { id: 'src/b.ts#B:class', sourceId: 'src/b.ts#B:class', kind: 'class', name: 'B' },
          { id: 'src/c.ts#C:class', sourceId: 'src/c.ts#C:class', kind: 'class', name: 'C' },
        ],
        edges: [
          { kind: 'calls', from: 'src/b.ts#B:class', to: 'src/a.ts#A:class' },
          { kind: 'type_ref', from: 'src/a.ts#A:class', to: 'src/c.ts#C:class' },
        ],
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: 'fixture',
      };
      const analysis = new GraphAnalysisService(graph);
      const close = jest.fn();
      const canonicalContext = {
        graph,
        analysis,
        revisionId: 'revision-1',
        resolveCanonicalId: (query: string) =>
          analysis.resolveSymbol(query).status === 'found' ? query : null,
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute([
        'src/a.ts#A:class',
        '--direction',
        'upstream',
        '--category',
        'type-system',
      ]);
      const output = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('src/c.ts#C:class');
      expect(output).not.toContain('src/b.ts#B:class');
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
