/**
 * Validate TSDoc command - Validate TSDoc syntax and tsdoc.json configuration
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { generateTsdocJson, TSDOC_EDGE_CUSTOM_TAGS, TSDocParser } from '../parser/TSDocParser';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Single TSDoc validation issue
 * @public
 */
export interface TsdocValidationIssue {
  filePath: string;
  line: number;
  messageId: string;
  message: string;
}

/**
 * Result of TSDoc validation
 * @public
 */
export interface TsdocValidationReport {
  tsdocConfig: {
    exists: boolean;
    valid: boolean;
    path: string;
    tagCount: number;
    missingTags: string[];
  };
  filesScanned: number;
  commentsScanned: number;
  issues: TsdocValidationIssue[];
  passed: boolean;
}

/**
 * Command to validate TSDoc comments and tsdoc.json compliance with Microsoft TSDoc specification
 *
 * @doc [[ValidateTsdocCommand]]
 * @public
 * @responsibility Validate TypeScript source comments and tsdoc.json against official TSDoc standards
 * @contract Scan project files, verify tsdoc.json, parse comments with TSDoc parser, report issues
 */
export class ValidateTsdocCommand extends BaseCommand {
  /**
   * Get command name
   * @returns Command name
   * @public
   */
  getName(): string {
    return 'validate-tsdoc';
  }

  /**
   * Get command aliases
   * @returns Command aliases
   * @public
   */
  getAlias(): string[] {
    return ['tsdoc-val', 'tsdoc-validate'];
  }

  /**
   * Get command description
   * @returns Command description
   * @public
   */
  getDescription(): string {
    return 'Validate TSDoc syntax and tsdoc.json configuration';
  }

  /**
   * Get command usage
   * @returns Usage string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge validate-tsdoc [path] [options]

  Options:
    --config <path>   Custom path to tsdoc.json
    --fix             Auto-generate or update tsdoc.json
    --json            Output results as JSON
    --strict          Treat all TSDoc parser warnings as errors`;
  }

  /**
   * Execute validation
   * @param args - Command line arguments
   * @returns Command result
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const json = args.includes('--json');
      const fix = args.includes('--fix');
      const strict = args.includes('--strict');

      // Extract custom config path if provided
      let customConfigPath: string | undefined;
      const configIdx = args.indexOf('--config');
      if (configIdx !== -1 && args[configIdx + 1]) {
        customConfigPath = path.resolve(process.cwd(), args[configIdx + 1]);
      }

      // Extract target scan path (positional arg that is not a flag)
      const positionalArgs = args.filter(
        (arg, i) =>
          !arg.startsWith('-') && (configIdx === -1 || (i !== configIdx && i !== configIdx + 1))
      );
      const targetPath = positionalArgs[0]
        ? path.resolve(process.cwd(), positionalArgs[0])
        : path.resolve(process.cwd(), 'src');

      if (!fs.existsSync(targetPath)) {
        return this.failure(`Target path does not exist: ${targetPath}`);
      }

      const configPath = customConfigPath || path.join(process.cwd(), 'tsdoc.json');

      // 1. Verify tsdoc.json
      let configExists = fs.existsSync(configPath);
      let configValid = false;
      let tagCount = 0;
      let missingTags: string[] = [];

      if (configExists) {
        try {
          const raw = fs.readFileSync(configPath, 'utf-8');
          const parsed = JSON.parse(raw);
          configValid = true;
          const declaredTags: Set<string> = new Set(
            (parsed.tagDefinitions || []).map((t: { tagName?: string }) => t.tagName)
          );
          tagCount = declaredTags.size;

          for (const spec of TSDOC_EDGE_CUSTOM_TAGS) {
            if (!declaredTags.has(spec.tagName)) {
              missingTags.push(spec.tagName);
            }
          }
        } catch {
          configValid = false;
        }
      }

      if ((!configExists || missingTags.length > 0) && fix) {
        fs.writeFileSync(configPath, `${JSON.stringify(generateTsdocJson(), null, 2)}\n`);
        configExists = true;
        configValid = true;
        missingTags = [];
        tagCount = TSDOC_EDGE_CUSTOM_TAGS.length;
      }

      // 2. Scan source files
      const parser = new TSDocParser(configExists && configValid ? configPath : undefined);
      const files = this.collectSourceFiles(targetPath);
      const issues: TsdocValidationIssue[] = [];
      let commentsScanned = 0;

      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

          this.scanNodeComments(sourceFile, filePath, parser, issues, () => {
            commentsScanned++;
          });
        } catch {
          // Skip unparseable files
        }
      }

      const passed =
        configValid &&
        missingTags.length === 0 &&
        (strict
          ? issues.length === 0
          : issues.filter((i) => i.messageId.includes('error')).length === 0);

      const report: TsdocValidationReport = {
        tsdocConfig: {
          exists: configExists,
          valid: configValid,
          path: configPath,
          tagCount,
          missingTags,
        },
        filesScanned: files.length,
        commentsScanned,
        issues,
        passed,
      };

      if (json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        this.printReport(report, fix);
      }

      if (!passed) {
        return {
          exitCode: 1,
          message: `TSDoc validation found ${issues.length} issues`,
        };
      }

      return {
        exitCode: 0,
        message: 'TSDoc validation passed',
      };
    });
  }

  /**
   * Recursively collect all TypeScript source files
   */
  private collectSourceFiles(targetPath: string): string[] {
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) {
      return targetPath.endsWith('.ts') || targetPath.endsWith('.tsx') ? [targetPath] : [];
    }

    const results: string[] = [];
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== '.test-dist' &&
          !entry.name.startsWith('.')
        ) {
          results.push(...this.collectSourceFiles(fullPath));
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.d.ts')
      ) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Scan node for JSDoc comments and validate with TSDoc parser
   */
  private scanNodeComments(
    node: ts.Node,
    filePath: string,
    parser: TSDocParser,
    issues: TsdocValidationIssue[],
    onCommentParsed: () => void
  ): void {
    const jsDocComments = (node as { jsDoc?: ts.JSDoc[] }).jsDoc;

    if (jsDocComments && jsDocComments.length > 0) {
      for (const jsDoc of jsDocComments) {
        onCommentParsed();
        const fullText = jsDoc.getFullText();
        const ctx = parser.parseString(fullText);

        if (ctx.log.messages.length > 0) {
          const { line } = node.getSourceFile().getLineAndCharacterOfPosition(jsDoc.getStart());
          for (const msg of ctx.log.messages) {
            issues.push({
              filePath: path.relative(process.cwd(), filePath),
              line: line + 1,
              messageId: msg.messageId,
              message: msg.text,
            });
          }
        }
      }
    }

    ts.forEachChild(node, (child) =>
      this.scanNodeComments(child, filePath, parser, issues, onCommentParsed)
    );
  }

  /**
   * Print human-readable report
   */
  private printReport(report: TsdocValidationReport, fixed: boolean): void {
    console.log();
    this.printHeader('TSDoc Ecosystem & Syntax Validation');

    // 1. tsdoc.json status
    console.log(`${colors.bold}1. Configuration (tsdoc.json):${colors.reset}`);
    if (report.tsdocConfig.exists && report.tsdocConfig.valid) {
      console.log(
        `  ${colors.green}✓${colors.reset} File: ${path.relative(process.cwd(), report.tsdocConfig.path)} (${report.tsdocConfig.tagCount} tags declared)`
      );
      if (report.tsdocConfig.missingTags.length > 0) {
        console.log(
          `  ${colors.yellow}⚠${colors.reset} Missing custom tags (${report.tsdocConfig.missingTags.length}): ${report.tsdocConfig.missingTags.slice(0, 5).join(', ')}${report.tsdocConfig.missingTags.length > 5 ? '...' : ''}`
        );
        console.log(
          `    Run with ${colors.cyan}--fix${colors.reset} to update tsdoc.json automatically.`
        );
      }
    } else if (fixed) {
      console.log(
        `  ${colors.green}✓${colors.reset} Generated official tsdoc.json schema with all ${report.tsdocConfig.tagCount} custom tags.`
      );
    } else {
      console.log(
        `  ${colors.red}✗${colors.reset} Missing or invalid tsdoc.json at ${report.tsdocConfig.path}`
      );
      console.log(
        `    Run with ${colors.cyan}--fix${colors.reset} to generate standard tsdoc.json.`
      );
    }

    console.log();

    // 2. Syntax validation
    console.log(`${colors.bold}2. Source Comments Validation:${colors.reset}`);
    console.log(`  Scanned ${report.filesScanned} files (${report.commentsScanned} comments)`);

    if (report.issues.length === 0) {
      console.log(
        `  ${colors.green}✓${colors.reset} All comments comply with official Microsoft TSDoc specifications (0 issues).`
      );
    } else {
      console.log(
        `  ${colors.yellow}⚠${colors.reset} Found ${report.issues.length} syntax issues across source comments:`
      );

      // Group by messageId
      const groups = new Map<string, TsdocValidationIssue[]>();
      for (const issue of report.issues) {
        const list = groups.get(issue.messageId) || [];
        list.push(issue);
        groups.set(issue.messageId, list);
      }

      for (const [id, list] of groups.entries()) {
        console.log(`\n  ${colors.bold}[${id}]${colors.reset} (${list.length} occurrences):`);
        for (const item of list.slice(0, 3)) {
          console.log(`    - ${item.filePath}:${item.line}: ${item.message}`);
        }
        if (list.length > 3) {
          console.log(`    ... and ${list.length - 3} more`);
        }
      }
    }
    console.log();
  }
}
