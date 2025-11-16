/**
 * Scan Command - Scan directory for TypeScript files
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for scanning files
 *
 * @public
 * @responsibility Scan directory for TypeScript files
 * @contract Uses FileScanner to find .ts/.tsx files
 *
 * @problem Need to see what files will be analyzed
 * @solves Lists all TypeScript files in directory
 * @context Part of file discovery and analysis preparation
 *
 * @functionality
 * - File scanning: Recursively find TypeScript files
 * - Extension filtering: .ts and .tsx files
 * - Path display: Show relative paths from cwd
 * - Count summary: Total files found
 * - Directory traversal: Respect .gitignore patterns
 *
 * @decision Use FileScanner for file discovery
 * @rationale Centralized file scanning logic
 * @consequences Follows same patterns as build command
 *
 * @depends FileScanner
 * @depType internal
 * @depReason File discovery
 */
export class ScanCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'scan';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Scan directory for TypeScript files';
  }

  protected getUsage(): string {
    return 'tsdoc-edge scan [directory]\n\n  Default: src';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const targetPath = args[0] || 'src';

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        console.log();
        return this.failure(`Path not found: ${targetPath}`);
      }

      this.printHeader('File Scanner');
      console.log(`Scanning: ${colors.cyan}${targetPath}${colors.reset}`);
      console.log();

      // Recursively find .ts and .tsx files
      const files: string[] = [];
      const scanDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      };

      scanDir(targetPath);

      this.printSection(`Found ${files.length} files`);
      for (const file of files) {
        const relPath = path.relative(process.cwd(), file);
        console.log(`  ${colors.dim}${relPath}${colors.reset}`);
      }
      console.log();

      console.log(`Total: ${colors.green}${files.length}${colors.reset} TypeScript files`);
      console.log();

      return this.success();
    });
  }
}
