/**
 * Tests for RelationshipValidateCommand
 */

import { RelationshipValidateCommand } from '../../commands/RelationshipValidateCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

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
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
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
