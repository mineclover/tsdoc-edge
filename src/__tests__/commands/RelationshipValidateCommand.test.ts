/**
 * Tests for RelationshipValidateCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipValidateCommand } from '../../commands/RelationshipValidateCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { seedRelationshipDatabase } from '../fixtures/relationship-db';

interface RelationshipValidatorInternals {
  checkOrphanedRelationships(dbManager: DatabaseManager): Array<{ relationshipId?: string }>;
  checkBidirectionalConsistency(dbManager: DatabaseManager): Array<{ relationshipId?: string }>;
}

describe('RelationshipValidateCommand', () => {
  let command: RelationshipValidateCommand;

  beforeEach(() => {
    command = new RelationshipValidateCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-validate');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(log.mock.calls.flat().join('\n')).toContain('--human');
    });
  });

  describe('output modes', () => {
    let tempDir: string;
    const originalCwd = process.cwd();

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-validate-'));
      process.chdir(tempDir);
      seedRelationshipDatabase(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    function captureOutput(): () => string {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      return () => log.mock.calls.flat().join('\n');
    }

    function relationshipIds(): string[] {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      try {
        return db.getAllUnifiedRelationshipRows().map((row) => row.id);
      } finally {
        db.close();
      }
    }

    it('prints an XML report by default and fails on errors', async () => {
      const output = captureOutput();

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(1);
      expect(xml.startsWith('<relationship-validation>')).toBe(true);
      expect(xml).toContain('<status>failed</status>');
      expect(xml).toContain('<errors>1</errors>');
      expect(xml).toContain('<name>orphaned-relationships</name>');
      expect(xml).toContain('<relationshipId>rel-orphan</relationshipId>');
      expect(xml).toContain('<symbolId>class-missing</symbolId>');
      expect(xml).toContain('<fixRequested>false</fixRequested>');
      expect(xml).not.toContain('<fixedIssues>');
      expect(xml).not.toContain('\x1b[');
    });

    it('keeps the colored text report with --human', async () => {
      const output = captureOutput();

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(1);
      expect(text).toContain('Relationship Validation');
      expect(text).toContain('Found 1 orphaned relationships');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<relationship-validation>');
    });

    it('removes orphaned relationships with --fix in both modes', async () => {
      const output = captureOutput();

      await command.execute(['--fix']);

      expect(output()).toContain('<fixedIssues>1</fixedIssues>');
      expect(relationshipIds()).not.toContain('rel-orphan');

      seedRelationshipDatabase(tempDir);
      expect(relationshipIds()).toContain('rel-orphan');
      await command.execute(['--fix', '--human']);

      expect(relationshipIds()).not.toContain('rel-orphan');
    });
  });

  describe('relationship endpoint contracts', () => {
    it('checks only materialized code-symbol endpoints', () => {
      const dbManager = {
        getAllRelationshipsForValidation: () => [
          {
            id: 'doc-reference',
            type: 'doc-reference',
            fromSymbols: '["code-symbol"]',
            toSymbols: '["doc:Code Symbol"]',
          },
          {
            id: 'test-example',
            type: 'test-as-example',
            fromSymbols: '["test-case-1"]',
            toSymbols: '["code-symbol"]',
          },
          {
            id: 're-export',
            type: 're-export',
            fromSymbols: '["src/index.ts"]',
            toSymbols: '["code-symbol"]',
          },
          {
            id: 'missing-code',
            type: 'code-dependency',
            fromSymbols: '["code-symbol"]',
            toSymbols: '["missing-symbol"]',
          },
        ],
        getSymbolsByIds: (ids: string[]) =>
          ids.filter((id) => id === 'code-symbol').map((id) => ({ id })),
      } as unknown as DatabaseManager;

      const internals = command as unknown as RelationshipValidatorInternals;
      const issues = internals.checkOrphanedRelationships(dbManager);

      expect(issues).toHaveLength(1);
      expect(issues).toMatchObject([{ relationshipId: 'missing-code' }]);
    });

    it('treats one well-formed bidirectional record as canonical', () => {
      const dbManager = {
        getBidirectionalRelationships: () => [
          {
            id: 'mutual-dependency',
            type: 'circular-dependency',
            fromSymbols: '["left"]',
            toSymbols: '["right"]',
          },
          {
            id: 'malformed',
            type: 'circular-dependency',
            fromSymbols: '[]',
            toSymbols: '["right"]',
          },
        ],
      } as unknown as DatabaseManager;

      const internals = command as unknown as RelationshipValidatorInternals;
      const issues = internals.checkBidirectionalConsistency(dbManager);

      expect(issues).toHaveLength(1);
      expect(issues).toMatchObject([{ relationshipId: 'malformed' }]);
    });
  });
});
