/**
 * Tests for CheckLinksCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  BrokenLink,
  LinkType,
  MissingLinkDetector,
  MissingLinkReport,
} from '../../analyzer/MissingLinkDetector';
import { CheckLinksCommand } from '../../commands/CheckLinksCommand';
import type { ConfigLoader } from '../../utils/ConfigLoader';

const ANSI = '\x1b[';

function createReport(links: BrokenLink[], totalLinks = 10): MissingLinkReport {
  const byType = new Map<LinkType, BrokenLink[]>();
  const byFile = new Map<string, BrokenLink[]>();
  for (const link of links) {
    byType.set(link.linkType, [...(byType.get(link.linkType) ?? []), link]);
    byFile.set(link.sourceFile, [...(byFile.get(link.sourceFile) ?? []), link]);
  }
  return { totalLinks, brokenLinks: links.length, links, byType, byFile };
}

function createLink(index: number, overrides: Partial<BrokenLink> = {}): BrokenLink {
  return {
    sourceSymbol: `Source${index}`,
    sourceFile: path.join(process.cwd(), 'src', `file${index}.ts`),
    line: index,
    linkType: 'dependency',
    target: `Missing${index}`,
    reason: `Dependency 'Missing${index}' not found`,
    ...overrides,
  };
}

describe('CheckLinksCommand', () => {
  let command: CheckLinksCommand;

  beforeEach(() => {
    command = new CheckLinksCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('check-links');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('broken links');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--help']);
      const out = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('--human');
    });
  });

  describe('output formats', () => {
    let tempDir: string;
    let consoleSpy: jest.SpyInstance;

    const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    const createCommand = (report: MissingLinkReport, failOnBroken = false): CheckLinksCommand => {
      const detector = { analyze: jest.fn().mockReturnValue(report) };
      const configLoader = {
        getLinkCheckConfig: jest.fn().mockReturnValue({ failOnBroken }),
        hasConfigFile: jest.fn().mockReturnValue(true),
        getConfigPath: jest.fn().mockReturnValue('/project/.tsdoc.config.json'),
      };
      return new CheckLinksCommand(
        detector as unknown as MissingLinkDetector,
        configLoader as unknown as ConfigLoader
      );
    };

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'check-links-test-')));
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should report a clean run as XML by default', async () => {
      const result = await createCommand(createReport([])).execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<link-check>')).toBe(true);
      expect(out.trimEnd().endsWith('</link-check>')).toBe(true);
      expect(out).toContain('<totalLinks>10</totalLinks>');
      expect(out).toContain('<brokenLinks>0</brokenLinks>');
      expect(out).toContain('<links count="0">');
      expect(out).toContain('<configFile>/project/.tsdoc.config.json</configFile>');
      expect(out).not.toContain(ANSI);
    });

    it('should list every broken link with its location and suggestion', async () => {
      const links = Array.from({ length: 25 }, (_, i) =>
        createLink(i + 1, i === 0 ? { suggestedFix: 'Did you mean: Thing?' } : {})
      );

      const result = await createCommand(createReport(links)).execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<brokenLinks>25</brokenLinks>');
      expect(out).toContain('<links count="25">');
      expect(out).toContain('<target>Missing25</target>');
      expect(out).toContain('<file>src/file1.ts</file>');
      expect(out).toContain('<suggestedFix>Did you mean: Thing?</suggestedFix>');
      expect(out).toContain('<type>dependency</type>');
      expect(out).toContain('<count>25</count>');
      expect(out).not.toContain(ANSI);
    });

    it('should keep the failOnBroken exit code in XML mode', async () => {
      const result = await createCommand(createReport([createLink(1)]), true).execute([tempDir]);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('<failOnBroken>true</failOnBroken>');
    });

    it('should accept --human before the path', async () => {
      const result = await createCommand(createReport([])).execute(['--human', tempDir]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('All links are valid!');
    });

    it('should keep the colored terminal output with --human', async () => {
      const links = Array.from({ length: 22 }, (_, i) => createLink(i + 1));

      const result = await createCommand(createReport(links)).execute([tempDir, '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('TSDoc Edge - Check Links');
      expect(out).toContain('Using config: /project/.tsdoc.config.json');
      expect(out).toContain('Total Links Checked');
      expect(out).toContain('Broken Links by Type');
      expect(out).toContain('Broken Link Details');
      expect(out).toContain('... and 2 more broken links');
      expect(out).toContain('Found 22 broken link(s)');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<link-check>');
    });

    it('should keep failing for a missing path in both modes', async () => {
      const missing = path.join(tempDir, 'missing');
      const xml = await createCommand(createReport([])).execute([missing]);
      const human = await createCommand(createReport([])).execute([missing, '--human']);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).toContain('Source path not found');
      expect(output()).not.toContain('<link-check>');
    });
  });
});
