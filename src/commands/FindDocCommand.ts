/**
 * Find Doc Command - Find document symbol definitions and references
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';

/**
 * Helper function to recursively find markdown files
 * @param dir - dir parameter
 * @returns Returns string[]
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const stat = fs.statSync(dir);

  if (stat.isFile()) {
    return [dir];
  }

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const entryStat = fs.statSync(fullPath);

    if (entryStat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Command for finding document symbols
 *
 * @public
 * @responsibility Search for document symbol definitions and references
 * @contract Parses documents, searches registry, displays matches
 * @doc [[FindDocCommand]]
 * @doc [[CLI Commands#find-doc]]
 *
 * @problem Need to find where document symbols are defined/referenced
 * @solves Searches all documents for symbol definitions and usages
 * @context Part of document symbol system
 *
 * @functionality
 * - File scanning: Find all markdown files
 * - Symbol parsing: Extract [[Symbol]] definitions and references
 * - Registry search: Look up symbol in registry
 * - Match display: Show definitions and references
 * - Summary statistics: Total matches and locations
 *
 * @decision Use DocumentSymbolParser and Registry for search
 * @rationale Centralized symbol tracking
 * @consequences Requires documents directory to search
 *
 * @depends DocumentSymbolParser, DocumentSymbolRegistry
 * @depType internal
 * @depReason Symbol parsing and registry
 */
export class FindDocCommand extends BaseCommand {
  private parser?: DocumentSymbolParser;
  private registry?: DocumentSymbolRegistry;

  constructor(parser?: DocumentSymbolParser, registry?: DocumentSymbolRegistry) {
    super();
    this.parser = parser;
    this.registry = registry;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'find-doc';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find document symbol definitions and references';
  }

  protected getUsage(): string {
    return `tsdoc-edge find-doc <symbol-name>

  Example: tsdoc-edge find-doc FeatureName`;
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

      const symbolName = args[0];

      if (!symbolName) {
        this.printError('Usage: tsdoc-edge find-doc <symbol-name>');
        console.log();
        return this.failure('Symbol name required');
      }

      const docsDir = 'docs';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Directory not found: ${docsPath}`);
        console.log();
        return this.failure(`Directory not found: ${docsPath}`);
      }

      // Find and parse documents
      const markdownFiles = findMarkdownFiles(docsPath);
      const parser = this.parser || new DocumentSymbolParser();
      const registry = this.registry || new DocumentSymbolRegistry();

      for (const filePath of markdownFiles) {
        try {
          const parsed = parser.parse(filePath);
          if (parsed) {
            registry.registerDocument(parsed);
          }
        } catch (error) {
          // Silent error - continue parsing other files
        }
      }

      // Search for symbol
      this.printHeader(`Finding Document Symbol: ${symbolName}`);

      const definition = registry.getDefinition(symbolName);
      const references = registry.getReferences(symbolName);

      if (!definition && references.length === 0) {
        console.log(`${colors.yellow}No definitions or references found for "${symbolName}"${colors.reset}`);
        console.log();
        return this.success();
      }

      // Print definition
      if (definition) {
        this.printSection('Definition');
        console.log(`${colors.green}📄${colors.reset} ${definition.filePath}:${definition.line}`);
        if (definition.content) {
          console.log(`   ${colors.dim}${definition.content}${colors.reset}`);
        }
        console.log();
      }

      // Print references
      if (references.length > 0) {
        this.printSection(`References (${references.length})`);
        for (const ref of references) {
          console.log(`${colors.cyan}🔗${colors.reset} ${ref.filePath}:${ref.line}`);
          if (ref.content) {
            console.log(`   ${colors.dim}${ref.content.substring(0, 80)}...${colors.reset}`);
          }
          console.log();
        }
      }

      console.log(`Total: ${colors.bold}${(definition ? 1 : 0) + references.length}${colors.reset} matches`);
      console.log();

      return this.success();
    });
  }
}
