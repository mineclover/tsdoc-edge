/**
 * Check-links command - Check for broken links in documentation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { MissingLinkDetector, type MissingLinkReport } from '../analyzer/MissingLinkDetector';
import { ConfigLoader } from '../utils/ConfigLoader';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for checking broken links
 *
 * @public
 * @responsibility Check documentation for broken links
 * @contract Analyze documentation, detect broken links, report issues
 * @doc [[Check Links Command]]
 * @doc [[CLI Commands#check-links]]
 *
 * @problem Documentation contains broken links that break documentation flow
 * @solves Scans all documentation and reports broken links with suggestions
 * @context Part of documentation quality assurance system
 *
 * @functionality
 * - Link scanning: Find all links in documentation
 * - Link validation: Check if links point to valid targets
 * - Typo detection: Suggest fixes for common typos
 * - Categorization: Group broken links by type and file
 * - Detailed reporting: Show link details with file locations
 *
 * @decision Use ConfigLoader for link check settings
 * @rationale Allows project-specific external module configuration
 * @consequences Users can customize link checking behavior via config file
 *
 * @depends MissingLinkDetector, ConfigLoader
 * @depType internal
 * @depReason Link analysis and configuration infrastructure
 */
export class CheckLinksCommand extends BaseCommand {
  constructor(
    private detector?: MissingLinkDetector,
    private configLoader?: ConfigLoader
  ) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'check-links';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Check for broken links in documentation';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge check-links [docs-directory] [options]\n\n  Default: docs\n\n  Options:\n    --human          Output in human-readable format (default: XML)';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    // Check for help flag
    if (this.hasHelpFlag(args)) {
      return this.displayHelp();
    }

    return this.executeWithErrorHandling(async () => {
      const isHuman = this.hasFlag(args, '--human');
      const sourcePath = args.find((arg) => !arg.startsWith('-')) || 'src';

      if (!fs.existsSync(sourcePath)) {
        this.printError(`Source path not found: ${sourcePath}`);
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge check-links [path]');
        console.log();
        return this.failure(`Source path not found: ${sourcePath}`);
      }

      if (isHuman) {
        this.printHeader('TSDoc Edge - Check Links');
        console.log(`Analyzing links in: ${colors.cyan}${sourcePath}${colors.reset}`);
        console.log();
      }

      // Load configuration
      const configLoader = this.configLoader || new ConfigLoader();
      const linkCheckConfig = configLoader.getLinkCheckConfig();

      // Show config info if using a config file
      if (isHuman && configLoader.hasConfigFile()) {
        console.log(`${colors.dim}Using config: ${configLoader.getConfigPath()}${colors.reset}`);
        console.log();
      }

      // Create detector and analyze
      if (isHuman) this.printSection('🔍 Scanning Documentation');
      const detector = this.detector || new MissingLinkDetector(configLoader);
      const report = detector.analyze(sourcePath);

      if (isHuman) {
        this.printHumanReport(report);
      } else {
        this.printLinkCheckXml(
          args,
          sourcePath,
          report,
          configLoader,
          linkCheckConfig.failOnBroken === true
        );
      }

      // Exit with error code if configured
      if (report.brokenLinks > 0 && linkCheckConfig.failOnBroken) {
        return this.failure(`Found ${report.brokenLinks} broken links`);
      }

      return this.success();
    });
  }

  /**
   * Print the colored terminal report (--human)
   */
  private printHumanReport(report: MissingLinkReport): void {
    console.log(`   Total Links Checked: ${colors.green}${report.totalLinks}${colors.reset}`);
    console.log(
      `   Broken Links: ${report.brokenLinks > 0 ? colors.red : colors.green}${report.brokenLinks}${colors.reset}`
    );
    console.log();

    if (report.brokenLinks === 0) {
      this.printSuccess('All links are valid!');
      console.log();
      return;
    }

    // Show broken links by type
    this.printSection('❌ Broken Links by Type');
    for (const [type, links] of report.byType.entries()) {
      console.log(`   ${type}: ${colors.red}${links.length}${colors.reset}`);
    }
    console.log();

    // Show broken links by file
    this.printSection('📁 Broken Links by File');
    for (const [file, links] of report.byFile.entries()) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`   ${relPath}: ${colors.red}${links.length}${colors.reset}`);
    }
    console.log();

    // Show detailed broken links
    this.printSection('🔗 Broken Link Details');
    for (const link of report.links.slice(0, 20)) {
      const relPath = path.relative(process.cwd(), link.sourceFile);
      console.log(`   ${colors.yellow}${link.linkType}${colors.reset}: ${link.target}`);
      console.log(`     in ${relPath}:${link.line} (${link.sourceSymbol})`);
      console.log(`     ${colors.dim}${link.reason}${colors.reset}`);
      if (link.suggestedFix) {
        console.log(`     ${colors.cyan}💡 ${link.suggestedFix}${colors.reset}`);
      }
      console.log();
    }

    if (report.links.length > 20) {
      console.log(`   ... and ${report.links.length - 20} more broken links`);
      console.log();
    }

    this.printError(`Found ${report.brokenLinks} broken link(s)`);
    console.log();
  }

  /**
   * Print the default XML document (lists every broken link, not just the first 20)
   */
  private printLinkCheckXml(
    args: string[],
    sourcePath: string,
    report: MissingLinkReport,
    configLoader: ConfigLoader,
    failOnBroken: boolean
  ): void {
    this.printOutput(
      'link-check',
      {
        summary: {
          sourcePath,
          ...(configLoader.hasConfigFile() ? { configFile: configLoader.getConfigPath() } : {}),
          totalLinks: report.totalLinks,
          brokenLinks: report.brokenLinks,
          failOnBroken,
        },
        byType: Array.from(report.byType.entries()).map(([type, links]) => ({
          type,
          count: links.length,
        })),
        byFile: Array.from(report.byFile.entries()).map(([file, links]) => ({
          file: path.relative(process.cwd(), file),
          count: links.length,
        })),
        links: report.links.map((link) => ({
          type: link.linkType,
          target: link.target,
          file: path.relative(process.cwd(), link.sourceFile),
          line: link.line,
          symbol: link.sourceSymbol,
          reason: link.reason,
          ...(link.suggestedFix ? { suggestedFix: link.suggestedFix } : {}),
        })),
      },
      args
    );
  }
}
