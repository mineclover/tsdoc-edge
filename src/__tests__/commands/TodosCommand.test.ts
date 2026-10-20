/**
 * Tests for TodosCommand
 * @testScenario Default output is an XML document
 * @testScenario --human keeps the colored TODO list
 */

import { TodosCommand } from '../../commands/TodosCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const ANSI = '\x1b[';

describe('TodosCommand', () => {
  let command: TodosCommand;
  let logSpy: jest.SpyInstance;

  const docs = [
    {
      symbolId: 'sym-a',
      futurePlans: JSON.stringify([
        {
          id: 'PLAN-001',
          title: 'Write <tests>',
          description: 'Cover & verify',
          priority: 'high',
          status: 'in-progress',
          targetMilestone: 'v2',
          estimatedEffort: '2d',
        },
        {
          id: 'PLAN-002',
          title: 'Ship',
          description: 'done',
          priority: 'low',
          status: 'completed',
          completedAt: '2026-01-01',
        },
      ]),
    },
    { symbolId: 'sym-b', futurePlans: '[]' },
  ];

  const createDb = (plansDocs: unknown[] = docs) =>
    ({
      getStatistics: jest.fn(() => ({ totalSymbols: 42, totalEnhancedDocs: 2, dbSize: 2048 })),
      getAllEnhancedDocsWithPlans: jest.fn(() => plansDocs),
      close: jest.fn(),
    }) as unknown as DatabaseManager;

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('metadata', () => {
    it('should return command name', () => {
      command = new TodosCommand();
      expect(command.getName()).toBe('todos');
    });

    it('should return command description', () => {
      command = new TodosCommand();
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      command = new TodosCommand();
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });

    it('prints an XML document by default', async () => {
      command = new TodosCommand(createDb());

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<todos>')).toBe(true);
      expect(xml.endsWith('</todos>')).toBe(true);
      expect(xml).toContain('<totalSymbols>42</totalSymbols>');
      expect(xml).toContain('<dbSizeKB>2.00</dbSizeKB>');
      expect(xml).toContain('<todoList count="2">');
      expect(xml).toContain('<title>Write &lt;tests&gt;</title>');
      expect(xml).toContain('<effort>2d</effort>');
      expect(xml).toContain('<completedAt>2026-01-01</completedAt>');
      expect(xml).toContain('<total>2</total>');
      expect(xml).not.toContain('TODO List');
    });

    it('prints an empty XML document when there are no plans', async () => {
      command = new TodosCommand(createDb([]));

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<todoList count="0">');
      expect(xml).toContain('<total>0</total>');
    });

    it('prints the colored TODO list with --human', async () => {
      command = new TodosCommand(createDb());

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('TSDoc Edge - TODO List');
      expect(text).toContain('Total TODO items: ');
      expect(text).toContain('[PLAN-001]');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<todos>');
    });
  });
});
