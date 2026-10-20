/**
 * Tests for IndexDocsCommand
 */

import * as fs from 'node:fs';
import { IndexDocsCommand } from '../../commands/IndexDocsCommand';
import { DocumentSymbolParser } from '../../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';
import { TSDocSymbolParser } from '../../doc-symbol/TSDocSymbolParser';

// Mock modules
jest.mock('node:fs');
jest.mock('../../doc-symbol/DocumentSymbolParser');
jest.mock('../../doc-symbol/DocumentSymbolRegistry');
jest.mock('../../doc-symbol/TSDocSymbolParser');

const ANSI = '\x1b[';

describe('IndexDocsCommand', () => {
  let command: IndexDocsCommand;
  let consoleSpy: jest.SpyInstance;
  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
  let mockDocParser: jest.Mocked<DocumentSymbolParser>;
  let mockRegistry: jest.Mocked<DocumentSymbolRegistry>;
  let mockTsdocParser: jest.Mocked<TSDocSymbolParser>;
  const mockFsExists = fs.existsSync as jest.Mock;
  const mockFsReaddir = fs.readdirSync as jest.Mock;
  const mockFsStat = fs.statSync as jest.Mock;
  const mockFsWriteFile = fs.writeFileSync as jest.Mock;
  const mockFsMkdir = fs.mkdirSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Create mock instances
    mockDocParser = new DocumentSymbolParser() as jest.Mocked<DocumentSymbolParser>;
    mockRegistry = new DocumentSymbolRegistry() as jest.Mocked<DocumentSymbolRegistry>;
    mockTsdocParser = new TSDocSymbolParser() as jest.Mocked<TSDocSymbolParser>;

    mockDocParser.parse = jest.fn().mockReturnValue(null);
    mockRegistry.registerDocument = jest.fn();
    mockRegistry.getStatistics = jest.fn().mockReturnValue({
      totalDefinitions: 0,
      totalAuxiliaries: 0,
      totalReferences: 0,
      totalCodeConnections: 0,
    });
    mockRegistry.getAllSymbolNames = jest.fn().mockReturnValue([]);
    mockRegistry.export = jest.fn().mockReturnValue({});
    mockTsdocParser.parseCodeFile = jest.fn().mockReturnValue([]);

    command = new IndexDocsCommand(mockDocParser, mockTsdocParser, mockRegistry);

    // Setup default fs mocks
    mockFsExists.mockReturnValue(true);
    mockFsReaddir.mockReturnValue([]);
    mockFsStat.mockReturnValue({ isDirectory: () => false });
    mockFsWriteFile.mockReturnValue(undefined);
    mockFsMkdir.mockReturnValue(undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('execute', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('index-docs');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBe('Index document symbols from markdown files');
    });

    it('should fail if directory does not exist in full scan mode', async () => {
      mockFsExists.mockReturnValue(false);

      const result = await command.execute(['docs']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Directory not found');
    });

    it('should fail if file does not exist in incremental mode', async () => {
      mockFsExists.mockReturnValue(false);

      const result = await command.execute(['--file=test.md']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('File not found');
    });

    it('should perform full scan successfully', async () => {
      mockFsExists.mockReturnValue(true);
      mockFsReaddir.mockReturnValue([]);

      const result = await command.execute(['docs']);

      expect(result.exitCode).toBe(0);
      expect(mockFsWriteFile).toHaveBeenCalled();
    });

    it('should perform incremental update successfully', async () => {
      mockFsExists.mockReturnValue(true);
      mockDocParser.parse = jest.fn().mockReturnValue({
        filePath: 'test.md',
        primary: { name: 'TestSymbol', line: 1 },
        auxiliaries: [],
        references: [],
      });

      const result = await command.execute(['--file=test.md']);

      expect(result.exitCode).toBe(0);
      expect(mockRegistry.registerDocument).toHaveBeenCalled();
    });

    it('should skip non-managed documents', async () => {
      mockFsExists.mockReturnValue(true);
      mockDocParser.parse = jest.fn().mockReturnValue(null);

      const result = await command.execute(['--file=test.md']);

      expect(result.exitCode).toBe(0);
      expect(mockRegistry.registerDocument).not.toHaveBeenCalled();
    });
  });

  describe('XML output (default)', () => {
    it('should report a full scan as an XML document', async () => {
      mockFsReaddir.mockReturnValue(['a.md']);
      mockDocParser.parse = jest.fn().mockReturnValue({
        filePath: 'a.md',
        primary: { name: 'Alpha', line: 1 },
        auxiliaries: [{ name: 'Aux', line: 3 }],
        references: [{ name: 'Beta', line: 5 }],
      });
      mockRegistry.registerCodeConnection = jest.fn();

      const result = await command.execute(['docs']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<index-results>')).toBe(true);
      expect(out.trimEnd().endsWith('</index-results>')).toBe(true);
      expect(out).toContain('<mode>full</mode>');
      expect(out).toContain('<documentsScanned>1</documentsScanned>');
      expect(out).toContain('<primaryDefinitions>1</primaryDefinitions>');
      expect(out).toContain('<auxiliaryDefinitions>1</auxiliaryDefinitions>');
      expect(out).toContain('<references>1</references>');
      expect(out).not.toContain(ANSI);
      expect(mockFsWriteFile).toHaveBeenCalled();
    });

    it('should report an incremental update as an XML document', async () => {
      mockDocParser.parse = jest.fn().mockReturnValue({
        filePath: 'test.md',
        primary: { name: 'TestSymbol', line: 1 },
        auxiliaries: [],
        references: [{ name: 'Other', line: 2 }],
      });

      const result = await command.execute(['--file=test.md']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<index-update>');
      expect(out).toContain('<mode>incremental</mode>');
      expect(out).toContain('<status>indexed</status>');
      expect(out).toContain('<primary>TestSymbol</primary>');
      expect(out).not.toContain(ANSI);
    });

    it('should report a skipped non-managed document without writing the index', async () => {
      mockDocParser.parse = jest.fn().mockReturnValue(null);

      const result = await command.execute(['--file=test.md']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<status>skipped</status>');
      expect(mockFsWriteFile).not.toHaveBeenCalled();
    });

    it('should not print the deprecation warning for legacy invocations', async () => {
      const legacy = new IndexDocsCommand(mockDocParser, mockTsdocParser, mockRegistry, true);

      await legacy.execute(['docs']);
      const out = output();

      expect(out).not.toContain('Deprecation');
      expect(out).toContain('<index-results>');
    });
  });

  describe('--human output', () => {
    it('should keep the colored full scan summary', async () => {
      const result = await command.execute(['docs', '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('Indexing Document Symbols');
      expect(out).toContain('Documents scanned');
      expect(out).toContain('Index created');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<index-results>');
    });

    it('should keep the incremental update messages', async () => {
      mockDocParser.parse = jest.fn().mockReturnValue({
        filePath: 'test.md',
        primary: { name: 'TestSymbol', line: 1 },
        auxiliaries: [],
        references: [],
      });

      await command.execute(['--file=test.md', '--human']);
      const out = output();

      expect(out).toContain('Updated symbols from test.md');
      expect(out).toContain('[[TestSymbol]]');
      expect(out).toContain('Index updated');
    });

    it('should keep the deprecation warning for legacy invocations', async () => {
      const legacy = new IndexDocsCommand(mockDocParser, mockTsdocParser, mockRegistry, true);

      await legacy.execute(['docs', '--human']);

      expect(output()).toContain('Deprecation Notice');
    });
  });
});
