/**
 * Tests for RelationshipQueryCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipQueryCommand } from '../../commands/RelationshipQueryCommand';
import { CanonicalAliasContext } from '../../indexer';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('RelationshipQueryCommand', () => {
  let command: RelationshipQueryCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-query-'));
    fs.mkdirSync(path.join(tempDir, '.tsdoc'), { recursive: true });
    process.chdir(tempDir);
    command = new RelationshipQueryCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-query');
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

    it('returns canonical structural results when the legacy relationship set is empty', async () => {
      const dbManager = new DatabaseManager(path.join(tempDir, '.tsdoc', 'symbols.db'));
      dbManager.close();

      const close = jest.fn();
      const canonicalContext = {
        resolveCanonicalId: (legacyId: string) =>
          legacyId === 'legacy-id' ? 'src/a.ts#A:class' : null,
        analysis: {
          dependencies: () => [canonicalNeighbor('src/b.ts#B:class', 'calls')],
          dependents: () => [canonicalNeighbor('src/c.ts#C:class', 'calls')],
        },
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const databaseClose = jest.spyOn(DatabaseManager.prototype, 'close');
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['legacy-id']);
      const output = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('src/a.ts#A:class');
      expect(output).toContain('src/b.ts#B:class');
      expect(output).toContain('src/c.ts#C:class');
      expect(output).not.toContain('No relationships found');
      expect(close).toHaveBeenCalledTimes(1);
      expect(databaseClose).toHaveBeenCalledTimes(1);
    });

    it('applies type, category, direction, and a shared limit to canonical results', async () => {
      const close = jest.fn();
      const canonicalContext = {
        resolveCanonicalId: () => 'src/a.ts#A:class',
        analysis: {
          dependencies: () => [
            canonicalNeighbor('src/b.ts#B:class', 'calls'),
            canonicalNeighbor('src/b2.ts#B2:class', 'calls'),
            canonicalNeighbor('src/base.ts#Base:class', 'extends'),
          ],
          dependents: () => [canonicalNeighbor('src/c.ts#C:class', 'calls')],
        },
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute([
        'legacy-id',
        '--type',
        'calls',
        '--category',
        'behavioral',
        '--direction',
        'from',
        '--limit',
        '1',
      ]);
      const output = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('src/b.ts#B:class');
      expect(output).not.toContain('src/b2.ts#B2:class');
      expect(output).not.toContain('src/base.ts#Base:class');
      expect(output).not.toContain('src/c.ts#C:class');
      expect(output).toContain('<totalFound>2</totalFound>');
      expect(output).toContain('<returned>1</returned>');
      expect(output).toContain('<canonicalFound>2</canonicalFound>');
      expect(output).toContain('<canonicalReturned>1</canonicalReturned>');
      expect(close).toHaveBeenCalledTimes(1);
    });

    it.each(['src/a.ts#A:class', 'A'])(
      'resolves canonical id or name input directly: %s',
      async (query) => {
        const close = jest.fn();
        const resolveSymbol = jest.fn((value: string) =>
          value === query
            ? { status: 'found' as const, query: value, node: { id: 'src/a.ts#A:class' } }
            : { status: 'missing' as const, query: value }
        );
        const canonicalContext = {
          resolveCanonicalId: () => null,
          analysis: {
            resolveSymbol,
            dependencies: () => [canonicalNeighbor('src/b.ts#B:class', 'calls')],
            dependents: () => [],
          },
          close,
        } as unknown as CanonicalAliasContext;
        jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        const result = await command.execute([query]);
        const output = log.mock.calls.flat().join('\n');

        expect(result.exitCode).toBe(0);
        expect(resolveSymbol).toHaveBeenCalledWith(query);
        expect(output).toContain('<canonicalId>src/a.ts#A:class</canonicalId>');
        expect(output).toContain('src/b.ts#B:class');
        expect(output).toContain('<totalFound>1</totalFound>');
        expect(output).toContain('<returned>1</returned>');
        expect(close).toHaveBeenCalledTimes(1);
      }
    );
  });
});

function canonicalNeighbor(nodeId: string, kind: string) {
  return {
    node: { id: nodeId },
    edge: { kind, from: 'src/a.ts#A:class', to: nodeId },
  };
}
