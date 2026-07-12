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

describe('IndexDocsCommand', () => {
  let command: IndexDocsCommand;
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

    // Create mock instances
    mockDocParser = new DocumentSymbolParser() as jest.Mocked<DocumentSymbolParser>;
    mockRegistry = new DocumentSymbolRegistry() as jest.Mocked<DocumentSymbolRegistry>;
    mockTsdocParser = new TSDocSymbolParser() as jest.Mocked<TSDocSymbolParser>;

    mockDocParser.parse = jest.fn().mockReturnValue(null);
    mockRegistry.registerDocument = jest.fn();
    mockRegistry.getStatistics = jest.fn().mockReturnValue({
      totalDefinitions: 0,
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
});
