/**
 * Comprehensive tests for Phase 6 Commands
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CheckDuplicatesCommand,
  SpecStatusCommand,
  FindUnusedDocsCommand,
  SpecHistoryCommand,
  SpecDiffCommand,
  SpecBumpCommand,
  FindDocCommand,
} from '../../commands/Phase6Commands';
import { SpecContentSimilarityChecker } from '../../spec/SpecContentSimilarityChecker';
import { SpecStatusManager } from '../../spec/SpecStatusManager';
import { UnusedDocumentDetector } from '../../spec/UnusedDocumentDetector';
import { SpecVersionManager } from '../../spec/SpecVersionManager';
import { DocumentSymbolParser } from '../../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';

describe('Phase 6 Commands', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase6-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ========== CheckDuplicatesCommand Tests ==========

  describe('CheckDuplicatesCommand', () => {
    let command: CheckDuplicatesCommand;

    beforeEach(() => {
      command = new CheckDuplicatesCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('check-duplicates');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('duplicate');
    });

    it('should return error for non-existent path', async () => {
      const result = await command.execute(['/non/existent/path']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should use default "managed" directory if not specified', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      fs.writeFileSync(path.join(managedDir, 'test.md'), 'content', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 0,
          averageSimilarity: 0,
          mergeSuggestions: 0,
          crossRefSuggestions: 0,
          keepSeparate: 0,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should report no duplicates when files are unique', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'unique content 1', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc2.md'), 'unique content 2', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 1,
          averageSimilarity: 0.1,
          mergeSuggestions: 0,
          crossRefSuggestions: 0,
          keepSeparate: 1,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should require at least 2 files', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'content', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 0,
          averageSimilarity: 0,
          mergeSuggestions: 0,
          crossRefSuggestions: 0,
          keepSeparate: 0,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should detect high similarity requiring merge', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'content', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc2.md'), 'content', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([
          {
            file1: path.join(docsDir, 'doc1.md'),
            file2: path.join(docsDir, 'doc2.md'),
            similarity: 0.95,
            suggestion: 'merge',
            reason: 'Nearly identical',
            overlappingSections: [
              { section: 'Introduction', similarity: 0.98 },
            ],
          },
        ]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 1,
          averageSimilarity: 0.95,
          mergeSuggestions: 1,
          crossRefSuggestions: 0,
          keepSeparate: 0,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('high similarity');
    });

    it('should suggest cross-reference for moderate similarity', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'content', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc2.md'), 'similar content', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([
          {
            file1: path.join(docsDir, 'doc1.md'),
            file2: path.join(docsDir, 'doc2.md'),
            similarity: 0.65,
            suggestion: 'cross-reference',
            reason: 'Moderate overlap',
            overlappingSections: [
              { section: 'Concept', similarity: 0.70 },
            ],
          },
        ]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 1,
          averageSimilarity: 0.65,
          mergeSuggestions: 0,
          crossRefSuggestions: 1,
          keepSeparate: 0,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should handle multiple document pairs', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'content', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc2.md'), 'content', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc3.md'), 'content', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 3,
          averageSimilarity: 0.2,
          mergeSuggestions: 0,
          crossRefSuggestions: 0,
          keepSeparate: 3,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom checker', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'content', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc2.md'), 'content', 'utf-8');

      const mockChecker = {
        checkMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: 1,
          averageSimilarity: 0.1,
          mergeSuggestions: 0,
          crossRefSuggestions: 0,
          keepSeparate: 1,
        }),
      } as any;

      const cmd = new CheckDuplicatesCommand(mockChecker);
      await cmd.execute([docsDir]);

      expect(mockChecker.checkMultiple).toHaveBeenCalled();
    });
  });

  // ========== SpecStatusCommand Tests ==========

  describe('SpecStatusCommand', () => {
    let command: SpecStatusCommand;

    beforeEach(() => {
      command = new SpecStatusCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('spec-status');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('specification status');
    });

    it('should return error without subcommand', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should show current status', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        filePath,
        '---\nstatus: draft\n---\n# Spec\n\nContent',
        'utf-8'
      );

      const mockManager = {
        getAllowedTransitions: jest.fn().mockReturnValue(['review']),
        validateTransition: jest.fn().mockReturnValue({
          valid: true,
          checks: [],
        }),
      } as any;

      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['show', filePath]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getAllowedTransitions).toHaveBeenCalled();
    });

    it('should reject show without file', async () => {
      const mockManager = {} as any;
      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['show']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should reject show for non-existent file', async () => {
      const mockManager = {} as any;
      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['show', '/non/existent/file.md']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should promote document status', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        filePath,
        '---\nstatus: draft\n---\n# Spec\n\nContent',
        'utf-8'
      );

      const mockManager = {
        validateTransition: jest.fn().mockReturnValue({
          valid: true,
          checks: [{ name: 'Quality', passed: true, message: 'OK' }],
        }),
        applyTransition: jest.fn(),
      } as any;

      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['promote', filePath, 'review']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.applyTransition).toHaveBeenCalledWith(filePath, 'review');
    });

    it('should reject promotion with invalid status', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        validateTransition: jest.fn().mockReturnValue({
          valid: false,
          checks: [{ name: 'Quality', passed: false, message: 'Score too low' }],
        }),
      } as any;

      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['promote', filePath, 'review']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('failed');
    });

    it('should list documents ready for promotion', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), '# Doc1', 'utf-8');

      const mockManager = {
        getPromotableDocs: jest.fn().mockReturnValue([
          {
            filePath: path.join(docsDir, 'doc1.md'),
            currentStatus: 'draft',
            targetStatus: 'review',
            canPromote: true,
            reason: 'Quality score: 85',
          },
        ]),
      } as any;

      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['list-ready', docsDir]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getPromotableDocs).toHaveBeenCalled();
    });

    it('should show status distribution stats', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), '# Doc1', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'doc2.md'), '# Doc2', 'utf-8');

      const mockManager = {
        getStatusDistribution: jest.fn().mockReturnValue({
          draft: 1,
          review: 1,
          approved: 0,
          active: 0,
        }),
      } as any;

      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['stats', docsDir]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getStatusDistribution).toHaveBeenCalled();
    });

    it('should reject unknown subcommand', async () => {
      const mockManager = {} as any;
      const cmd = new SpecStatusCommand(mockManager);
      const result = await cmd.execute(['unknown']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Unknown');
    });
  });

  // ========== FindUnusedDocsCommand Tests ==========

  describe('FindUnusedDocsCommand', () => {
    let command: FindUnusedDocsCommand;

    beforeEach(() => {
      command = new FindUnusedDocsCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('find-unused-docs');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('unused');
    });

    it('should return error for non-existent directory', async () => {
      const result = await command.execute(['/non/existent/dir']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should use default "managed" directory if not specified', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      fs.writeFileSync(path.join(managedDir, 'test.md'), 'content', 'utf-8');

      const mockDetector = {
        detect: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 0,
          averageDaysSinceModified: 0,
          byReason: {},
          byAction: {},
        }),
      } as any;

      const cmd = new FindUnusedDocsCommand(mockDetector);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should report no unused documents when all are recent', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'doc1.md'), 'content', 'utf-8');

      const mockDetector = {
        detect: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 0,
          averageDaysSinceModified: 0,
          byReason: {},
          byAction: {},
        }),
      } as any;

      const cmd = new FindUnusedDocsCommand(mockDetector);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should identify stale documents for deletion', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });

      const mockDetector = {
        detect: jest.fn().mockReturnValue([
          {
            filePath: path.join(docsDir, 'old.md'),
            daysSinceModified: 365,
            reason: 'Stale draft',
            suggestedAction: 'delete',
          },
        ]),
        getSummary: jest.fn().mockReturnValue({
          total: 1,
          averageDaysSinceModified: 365,
          byReason: { 'Stale draft': 1 },
          byAction: { delete: 1, archive: 0, review: 0, complete: 0 },
        }),
      } as any;

      const cmd = new FindUnusedDocsCommand(mockDetector);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should suggest archival for old documents', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });

      const mockDetector = {
        detect: jest.fn().mockReturnValue([
          {
            filePath: path.join(docsDir, 'archived.md'),
            daysSinceModified: 180,
            reason: 'Old but referenced',
            suggestedAction: 'archive',
          },
        ]),
        getSummary: jest.fn().mockReturnValue({
          total: 1,
          averageDaysSinceModified: 180,
          byReason: { 'Old but referenced': 1 },
          byAction: { delete: 0, archive: 1, review: 0, complete: 0 },
        }),
      } as any;

      const cmd = new FindUnusedDocsCommand(mockDetector);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom detector', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });

      const mockDetector = {
        detect: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 0,
          averageDaysSinceModified: 0,
          byReason: {},
          byAction: {},
        }),
      } as any;

      const cmd = new FindUnusedDocsCommand(mockDetector);
      await cmd.execute([docsDir]);

      expect(mockDetector.detect).toHaveBeenCalled();
    });
  });

  // ========== SpecHistoryCommand Tests ==========

  describe('SpecHistoryCommand', () => {
    let command: SpecHistoryCommand;

    beforeEach(() => {
      command = new SpecHistoryCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('spec-history');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('history');
    });

    it('should return error without file path', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error for non-existent file', async () => {
      const result = await command.execute(['/non/existent/file.md']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should display version history', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        getHistory: jest.fn().mockReturnValue([
          {
            version: '1.0.0',
            date: '2024-01-01',
            commit: 'abc123',
            author: 'John Doe',
            message: 'Initial version',
          },
        ]),
      } as any;

      const cmd = new SpecHistoryCommand(mockManager);
      const result = await cmd.execute([filePath]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getHistory).toHaveBeenCalledWith(filePath);
    });

    it('should handle no version history', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        getHistory: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new SpecHistoryCommand(mockManager);
      const result = await cmd.execute([filePath]);

      expect(result.exitCode).toBe(0);
    });

    it('should display multiple versions', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        getHistory: jest.fn().mockReturnValue([
          {
            version: '2.0.0',
            date: '2024-01-15',
            commit: 'def456',
            author: 'Jane Smith',
            message: 'Version 2',
          },
          {
            version: '1.0.0',
            date: '2024-01-01',
            commit: 'abc123',
            author: 'John Doe',
            message: 'Initial version',
          },
        ]),
      } as any;

      const cmd = new SpecHistoryCommand(mockManager);
      const result = await cmd.execute([filePath]);

      expect(result.exitCode).toBe(0);
    });
  });

  // ========== SpecDiffCommand Tests ==========

  describe('SpecDiffCommand', () => {
    let command: SpecDiffCommand;

    beforeEach(() => {
      command = new SpecDiffCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('spec-diff');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('Compare');
    });

    it('should return error without required arguments', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error for non-existent file', async () => {
      const result = await command.execute(['/non/existent/file.md', '1.0.0', '2.0.0']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should compare two versions', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        diff: jest.fn().mockReturnValue({
          from: '1.0.0',
          to: '2.0.0',
          summary: 'Added new features',
          changes: {
            added: ['## New Section'],
            removed: [],
            modified: ['## Introduction'],
          },
        }),
      } as any;

      const cmd = new SpecDiffCommand(mockManager);
      const result = await cmd.execute([filePath, '1.0.0', '2.0.0']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.diff).toHaveBeenCalled();
    });

    it('should display added sections', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        diff: jest.fn().mockReturnValue({
          from: '1.0.0',
          to: '2.0.0',
          summary: 'Changes made',
          changes: {
            added: ['## New Feature', '## Another Feature'],
            removed: [],
            modified: [],
          },
        }),
      } as any;

      const cmd = new SpecDiffCommand(mockManager);
      const result = await cmd.execute([filePath, '1.0.0', '2.0.0']);

      expect(result.exitCode).toBe(0);
    });

    it('should display removed sections', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        diff: jest.fn().mockReturnValue({
          from: '2.0.0',
          to: '3.0.0',
          summary: 'Removed deprecated features',
          changes: {
            added: [],
            removed: ['## Deprecated API', '## Old Pattern'],
            modified: [],
          },
        }),
      } as any;

      const cmd = new SpecDiffCommand(mockManager);
      const result = await cmd.execute([filePath, '2.0.0', '3.0.0']);

      expect(result.exitCode).toBe(0);
    });
  });

  // ========== SpecBumpCommand Tests ==========

  describe('SpecBumpCommand', () => {
    let command: SpecBumpCommand;

    beforeEach(() => {
      command = new SpecBumpCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('spec-bump');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('Bump');
    });

    it('should return error without file path', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error with invalid bump type', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const result = await command.execute([filePath, 'invalid']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Invalid');
    });

    it('should return error for non-existent file', async () => {
      const result = await command.execute(['/non/existent/file.md', 'patch']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should bump patch version', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '---\nversion: 1.0.0\n---\n# Spec', 'utf-8');

      const mockManager = {
        getCurrentVersion: jest.fn().mockReturnValue('1.0.0'),
        bump: jest.fn().mockReturnValue('1.0.1'),
      } as any;

      const cmd = new SpecBumpCommand(mockManager);
      const result = await cmd.execute([filePath, 'patch']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.bump).toHaveBeenCalledWith(filePath, 'patch');
    });

    it('should bump minor version', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '---\nversion: 1.0.0\n---\n# Spec', 'utf-8');

      const mockManager = {
        getCurrentVersion: jest.fn().mockReturnValue('1.0.0'),
        bump: jest.fn().mockReturnValue('1.1.0'),
      } as any;

      const cmd = new SpecBumpCommand(mockManager);
      const result = await cmd.execute([filePath, 'minor']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.bump).toHaveBeenCalledWith(filePath, 'minor');
    });

    it('should bump major version', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '---\nversion: 1.0.0\n---\n# Spec', 'utf-8');

      const mockManager = {
        getCurrentVersion: jest.fn().mockReturnValue('1.0.0'),
        bump: jest.fn().mockReturnValue('2.0.0'),
      } as any;

      const cmd = new SpecBumpCommand(mockManager);
      const result = await cmd.execute([filePath, 'major']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.bump).toHaveBeenCalledWith(filePath, 'major');
    });

    it('should accept custom manager', async () => {
      const filePath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(filePath, '# Spec', 'utf-8');

      const mockManager = {
        getCurrentVersion: jest.fn().mockReturnValue('1.0.0'),
        bump: jest.fn().mockReturnValue('1.0.1'),
      } as any;

      const cmd = new SpecBumpCommand(mockManager);
      await cmd.execute([filePath, 'patch']);

      expect(mockManager.getCurrentVersion).toHaveBeenCalled();
    });
  });

  // ========== FindDocCommand Tests ==========

  describe('FindDocCommand', () => {
    let command: FindDocCommand;
    const originalCwd = process.cwd();

    beforeEach(() => {
      command = new FindDocCommand();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('find-doc');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('document symbol');
    });

    it('should return error without symbol name', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error if docs directory not found', async () => {
      const result = await command.execute(['SomeSymbol']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should find symbol definition', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'api.md'), '# [[MySymbol]]', 'utf-8');

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          definitions: [{ name: 'MySymbol', filePath: path.join(docsDir, 'api.md'), line: 1 }],
          references: [],
        }),
      } as any;

      const mockRegistry = {
        registerDocument: jest.fn(),
        getDefinition: jest.fn().mockReturnValue({
          filePath: path.join(docsDir, 'api.md'),
          line: 1,
          content: '# [[MySymbol]]',
        }),
        getReferences: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new FindDocCommand(mockParser, mockRegistry);
      const result = await cmd.execute(['MySymbol']);

      expect(result.exitCode).toBe(0);
    });

    it('should find symbol references', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'api.md'),
        '# [[MySymbol]]\n\nUsed in [[AnotherSymbol]]',
        'utf-8'
      );

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          definitions: [{ name: 'MySymbol', filePath: path.join(docsDir, 'api.md'), line: 1 }],
          references: [
            { name: 'MySymbol', filePath: path.join(docsDir, 'api.md'), line: 3 },
          ],
        }),
      } as any;

      const mockRegistry = {
        registerDocument: jest.fn(),
        getDefinition: jest.fn().mockReturnValue({
          filePath: path.join(docsDir, 'api.md'),
          line: 1,
          content: '# [[MySymbol]]',
        }),
        getReferences: jest.fn().mockReturnValue([
          {
            filePath: path.join(docsDir, 'api.md'),
            line: 3,
            content: 'Used in [[MySymbol]]',
          },
        ]),
      } as any;

      const cmd = new FindDocCommand(mockParser, mockRegistry);
      const result = await cmd.execute(['MySymbol']);

      expect(result.exitCode).toBe(0);
    });

    it('should report symbol not found', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'api.md'), '# Other', 'utf-8');

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          definitions: [],
          references: [],
        }),
      } as any;

      const mockRegistry = {
        registerDocument: jest.fn(),
        getDefinition: jest.fn().mockReturnValue(null),
        getReferences: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new FindDocCommand(mockParser, mockRegistry);
      const result = await cmd.execute(['NonExistentSymbol']);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom parser and registry', async () => {
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'api.md'), '# Test', 'utf-8');

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          definitions: [],
          references: [],
        }),
      } as any;

      const mockRegistry = {
        registerDocument: jest.fn(),
        getDefinition: jest.fn().mockReturnValue(null),
        getReferences: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new FindDocCommand(mockParser, mockRegistry);
      await cmd.execute(['MySymbol']);

      expect(mockParser.parse).toHaveBeenCalled();
      expect(mockRegistry.registerDocument).toHaveBeenCalled();
    });
  });
});
