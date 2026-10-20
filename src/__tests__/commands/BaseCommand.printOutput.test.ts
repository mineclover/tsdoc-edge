/**
 * BaseCommand.printOutput tests
 * @testScenario XML output for flat, nested, array and grouped sections
 * @testScenario --human suppresses XML output
 * @testScenario Special characters are escaped
 */

import { BaseCommand, type CommandResult } from '../../commands/BaseCommand';

class OutputCommand extends BaseCommand {
  getName(): string {
    return 'output-command';
  }

  getDescription(): string {
    return 'Exposes printOutput';
  }

  async execute(_args: string[]): Promise<CommandResult> {
    return this.success();
  }

  public emit(
    root: string,
    sections: Record<string, Record<string, unknown> | Array<Record<string, unknown>>>,
    args: string[] = []
  ): void {
    this.printOutput(root, sections, args);
  }
}

function capture(run: () => void): string {
  const lines: string[] = [];
  const spy = jest.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
    lines.push(parts.join(' '));
  });
  try {
    run();
  } finally {
    spy.mockRestore();
  }
  return lines.join('\n');
}

describe('BaseCommand.printOutput', () => {
  const command = new OutputCommand();

  it('renders object sections and array sections with counts and indexes', () => {
    const xml = capture(() =>
      command.emit('report', {
        summary: { total: 2, healthy: true },
        symbols: [{ name: 'Foo' }, { name: 'Bar' }],
      })
    );

    expect(xml).toBe(
      [
        '<report>',
        '  <summary>',
        '    <total>2</total>',
        '    <healthy>true</healthy>',
        '  </summary>',
        '  <symbols count="2">',
        '    <item index="1">',
        '      <name>Foo</name>',
        '    </item>',
        '    <item index="2">',
        '      <name>Bar</name>',
        '    </item>',
        '  </symbols>',
        '</report>',
      ].join('\n')
    );
  });

  it('renders nested objects inside items instead of [object Object]', () => {
    const xml = capture(() =>
      command.emit('report', {
        symbols: [{ name: 'Foo', location: { file: 'a.ts', line: 3 } }],
      })
    );

    expect(xml).not.toContain('[object Object]');
    expect(xml).toContain('<location>');
    expect(xml).toContain('<file>a.ts</file>');
    expect(xml).toContain('<line>3</line>');
  });

  it('renders arrays of objects inside items and object sections as nested sections', () => {
    const xml = capture(() =>
      command.emit('report', {
        detail: {
          label: 'mixed',
          files: [{ path: 'a.ts' }, { path: 'b.ts' }],
          tags: ['x', 'y'],
          none: [],
        },
        symbols: [{ name: 'Foo', calls: [{ target: 'Bar' }] }],
      })
    );

    expect(xml).not.toContain('[object Object]');
    expect(xml).toContain('<files count="2">');
    expect(xml).toContain('<path>b.ts</path>');
    expect(xml).toContain('<calls count="1">');
    expect(xml).toContain('<target>Bar</target>');
    // Arrays of primitives and empty arrays keep their flat string form.
    expect(xml).toContain('<tags>x,y</tags>');
    expect(xml).toContain('<none></none>');
  });

  it('renders grouped sections when every value is an array', () => {
    const xml = capture(() =>
      command.emit('report', {
        byKind: { class: [{ name: 'A' }], 'type "alias"': [{ name: 'B' }, { name: 'C' }] },
      })
    );

    expect(xml).toContain('<byKind count="2">');
    expect(xml).toContain('<group name="class" count="1">');
    expect(xml).toContain('<group name="type &quot;alias&quot;" count="2">');
  });

  it('escapes XML special characters in values', () => {
    const xml = capture(() => command.emit('report', { summary: { text: `a < b && "c" > 'd'` } }));

    expect(xml).toContain('<text>a &lt; b &amp;&amp; &quot;c&quot; &gt; &apos;d&apos;</text>');
  });

  it('prints sections far larger than the call stack allows spreading', () => {
    const items = Array.from({ length: 150_000 }, (_unused, index) => ({ value: index }));

    const xml = capture(() => command.emit('report', { items }));

    expect(xml.startsWith('<report>\n  <items count="150000">')).toBe(true);
    expect(xml.endsWith('  </items>\n</report>')).toBe(true);
  });

  it('prints nothing when --human is requested', () => {
    const xml = capture(() => command.emit('report', { summary: { total: 1 } }, ['--human']));

    expect(xml).toBe('');
  });
});
