/**
 * Check-links command - Check for broken links in documentation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { MissingLinkDetector } from '../analyzer/MissingLinkDetector';
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
    return 'tsdoc-edge check-links [docs-directory]\n\n  Default: docs';
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
      const sourcePath = args[0] || 'src';

      if (!fs.existsSync(sourcePath)) {
        this.printError(`Source path not found: ${sourcePath}`);
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge check-links [path]');
        console.log();
        return this.failure(`Source path not found: ${sourcePath}`);
      }

      this.printHeader('TSDoc Edge - Check Links');
      console.log(`Analyzing links in: ${colors.cyan}${sourcePath}${colors.reset}`);
      console.log();

      // Load configuration
      const configLoader = this.configLoader || new ConfigLoader();
      const linkCheckConfig = configLoader.getLinkCheckConfig();

      // Show config info if using a config file
      if (configLoader.hasConfigFile()) {
        console.log(`${colors.dim}Using config: ${configLoader.getConfigPath()}${colors.reset}`);
        console.log();
      }

      // Create detector and analyze
      this.printSection('🔍 Scanning Documentation');
      const detector = this.detector || new MissingLinkDetector(configLoader);
      const report = detector.analyze(sourcePath);

      console.log(`   Total Links Checked: ${colors.green}${report.totalLinks}${colors.reset}`);
      console.log(
        `   Broken Links: ${report.brokenLinks > 0 ? colors.red : colors.green}${report.brokenLinks}${colors.reset}`
      );
      console.log();

      if (report.brokenLinks === 0) {
        this.printSuccess('All links are valid!');
        console.log();
        return this.success();
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

      // Exit with error code if configured
      if (linkCheckConfig.failOnBroken) {
        return this.failure(`Found ${report.brokenLinks} broken links`);
      }

      return this.success();
    });
  }
}
