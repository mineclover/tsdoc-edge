/**
 * Tests for PlansCommand
 * @testScenario Default output is an XML document
 * @testScenario --status filter works with --human in any position
 */

import { PlansCommand } from '../../commands/PlansCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const ANSI = '\x1b[';

describe('PlansCommand', () => {
  let command: PlansCommand;
  let logSpy: jest.SpyInstance;

  const docs = [
    {
      symbolId: 'sym-a',
      futurePlans: JSON.stringify([
        {
          id: 'PLAN-001',
          title: 'Add <XML> output',
          description: 'Emit XML & more',
          priority: 'low',
          status: 'planned',
          targetSymbol: 'Foo',
          targetMethod: 'bar',
          targetMilestone: 'v1',
        },
        {
          id: 'PLAN-002',
          title: 'Finished',
          description: 'done',
          priority: 'high',
          status: 'completed',
          implementedBy: 'Baz',
        },
      ]),
    },
    { symbolId: 'sym-b', futurePlans: '[]' },
  ];

  const createDb = () =>
    ({
      getAllEnhancedDocsWithPlans: jest.fn(() => docs),
      close: jest.fn(),
    }) as unknown as DatabaseManager;

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('metadata', () => {
    it('should return command name', () => {
      command = new PlansCommand();
      expect(command.getName()).toBe('plans');
    });

    it('should return command description', () => {
      command = new PlansCommand();
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      command = new PlansCommand();
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });

    it('prints an XML document by default, sorted by priority', async () => {
      command = new PlansCommand(createDb());

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<future-plans>')).toBe(true);
      expect(xml.endsWith('</future-plans>')).toBe(true);
      expect(xml).toContain('<count>2</count>');
      expect(xml).toContain('<plans count="2">');
      expect(xml).toContain('<title>Add &lt;XML&gt; output</title>');
      expect(xml).toContain('<symbolId>sym-a</symbolId>');
      expect(xml).toContain('<milestone>v1</milestone>');
      expect(xml.indexOf('PLAN-002')).toBeLessThan(xml.indexOf('PLAN-001'));
      expect(xml).not.toContain('Future Plans');
    });

    it('filters by --status regardless of its position', async () => {
      command = new PlansCommand(createDb());

      await command.execute(['--human', '--status=completed']);
      const text = output();

      expect(text).toContain('PLAN-002');
      expect(text).not.toContain('PLAN-001');

      logSpy.mockClear();
      await command.execute(['--status=planned']);
      const xml = output();

      expect(xml).toContain('<statusFilter>planned</statusFilter>');
      expect(xml).toContain('<count>1</count>');
      expect(xml).toContain('<id>PLAN-001</id>');
      expect(xml).not.toContain('PLAN-002');
    });

    it('prints an empty XML document when no plan matches', async () => {
      command = new PlansCommand(createDb());

      const result = await command.execute(['--status=cancelled']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<count>0</count>');
      expect(xml).toContain('<plans count="0">');
      expect(xml).not.toContain('No future plans found');
    });

    it('prints the colored listing with --human', async () => {
      command = new PlansCommand(createDb());

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Future Plans');
      expect(text).toContain('Total plans: ');
      expect(text).toContain('PLAN-001');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<future-plans>');
    });
  });
});
