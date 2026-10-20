/**
 * Tests for QueryInferredCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { QueryInferredCommand } from '../../commands/QueryInferredCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('QueryInferredCommand', () => {
  let command: QueryInferredCommand;

  beforeEach(() => {
    command = new QueryInferredCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('query-inferred');
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

  describe('output format', () => {
    let tempDir: string;
    const originalCwd = process.cwd();

    const relationship = (
      id: string,
      type: string,
      direction: string,
      discoveredBy: string,
      properties: Record<string, unknown> = { inferred: true }
    ) => ({
      id,
      type,
      category: 'documentation',
      fromSymbols: [`from-${id}`],
      toSymbols: [`to-${id}`],
      direction: 'directed',
      strength: 'strong',
      evidence: [{ type: 'doc', source: 'test', confidence: 0.9 }],
      discoveredBy,
      confidence: 0.9,
      properties: { direction, ...properties },
      description: `Relationship <${id}> & more`,
    });

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'query-inferred-'));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const seed = (...rels: ReturnType<typeof relationship>[]): void => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'));
      for (const rel of rels) {
        db.insertUnifiedRelationship(rel);
      }
      db.close();
    };

    const run = async (args: string[]): Promise<{ output: string; exitCode: number }> => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute(args);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: result.exitCode,
      };
    };

    it('prints only an XML document by default', async () => {
      seed(
        relationship('a', 'doc-reference', 'reverse', 'doc-analyzer', {
          inferred: true,
          reverseOf: 'orig-1',
        }),
        relationship('b', 'calls', 'forward', 'call-analyzer'),
        relationship('c', 'calls', 'reverse', 'call-analyzer'),
        relationship('d', 'calls', 'forward', 'call-analyzer', { inferred: false })
      );

      const { output, exitCode } = await run([]);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<inferred-relationships>')).toBe(true);
      expect(output.endsWith('</inferred-relationships>')).toBe(true);
      expect(output).toContain('<totalRelationships>4</totalRelationships>');
      expect(output).toContain('<inferredRelationships>3</inferredRelationships>');
      expect(output).toContain('<percentage>75.00</percentage>');
      expect(output).toContain('<byType count="2">');
      expect(output.indexOf('<type>calls</type>')).toBeLessThan(
        output.indexOf('<type>doc-reference</type>')
      );
      expect(output).toContain('<reverseOf>orig-1</reverseOf>');
      expect(output).toContain('Relationship &lt;a&gt; &amp; more');
      expect(output).not.toContain('\x1b[');
    });

    it('filters by relationship type', async () => {
      seed(
        relationship('a', 'doc-reference', 'reverse', 'doc-analyzer'),
        relationship('b', 'calls', 'forward', 'call-analyzer')
      );

      const { output } = await run(['calls']);

      expect(output).toContain('<typeFilter>calls</typeFilter>');
      expect(output).toContain('<filteredRelationships>1</filteredRelationships>');
      expect(output).toContain('<samples count="1">');
    });

    it('treats --human before the type as a flag', async () => {
      seed(relationship('a', 'calls', 'forward', 'call-analyzer'));

      const { output } = await run(['--human', 'calls']);

      expect(output).toContain('Filtered (calls): ');
    });

    it('still emits a document when no inferred relationships exist', async () => {
      seed(relationship('a', 'calls', 'forward', 'call-analyzer', { inferred: false }));

      const { output, exitCode } = await run([]);

      expect(exitCode).toBe(0);
      expect(output).toContain('<inferredRelationships>0</inferredRelationships>');
      expect(output).toContain('<samples count="0">');
    });

    it('prints the colored report with --human', async () => {
      seed(relationship('a', 'calls', 'forward', 'call-analyzer'));

      const { output, exitCode } = await run(['--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('TSDoc Edge - Inferred Relationships');
      expect(output).toContain('By Relationship Type');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<inferred-relationships>');
    });
  });
});
