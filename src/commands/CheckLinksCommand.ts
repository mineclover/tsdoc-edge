/**
 * Check-links command - Check for broken links in documentation and enhanced TSDoc
 *
 * @packageDocumentation
 * @doc [[CheckLinksCommand]]
 * @doc [[CLI Commands]]
 * @context Broken Markdown, `[[Symbol]]`, `source:`, and enhanced TSDoc link verification via `tsdoc-edge docs check-links`
 * @functionality Scans Markdown documents (relative links, declared `source:` paths, `[[Symbol]]` checkpoints) and TypeScript files (`MissingLinkDetector`), reporting broken links grouped by type and file
 * @sideEffect console: Writes broken link diagnostics, suggestions, or `--json` reports to stdout
 * @sideEffect filesystem: Reads Markdown documentation, TypeScript source files, and configuration files on disk (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type BrokenLink,
  type LinkType,
  MissingLinkDetector,
  type MissingLinkReport,
} from '../analyzer/MissingLinkDetector';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';
import { FrontmatterParser } from '../parser/FrontmatterParser';
import type { ParsedDocSymbols } from '../types/feature';
import { ConfigLoader } from '../utils/ConfigLoader';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for checking broken links across Markdown documentation and TypeScript comments
 *
 * @public
 * @responsibility Check documentation and code comments for broken links
 * @contract Analyze Markdown and TypeScript documentation links, detect broken targets, and report issues
 * @doc [[CheckLinksCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#check-links]]
 * @sideEffect console: Writes broken link reports or JSON output to stdout; reads Markdown and TypeScript files
 *
 * @problem Documentation contains broken file links, stale `source:` paths, or undefined `[[Symbol]]` checkpoints
 * @solves Scans Markdown and TypeScript files and reports all broken links with typo suggestions
 * @context Part of documentation quality assurance system
 *
 * @functionality
 * - Markdown scanning: Verify `[label](target)` file paths, declared `source:` paths, and `[[Symbol]]` checkpoints
 * - TypeScript scanning: Delegate `.ts`/`.tsx` enhanced doc link checks to `MissingLinkDetector`
 * - Typo detection: Suggest fixes for undefined `[[Symbol]]` checkpoints
 * - Categorization: Group broken links by type and file
 * - CI gating: Support `--fail-on-broken` and `--json`
 *
 * @decision Combine `DocumentSymbolParser`/`DocumentSymbolRegistry` for Markdown with `MissingLinkDetector` for TypeScript
 * @rationale Ensures `tsdoc-edge docs check-links managed` checks every Markdown link and checkpoint rather than silently scanning zero `.ts` files
 * @consequences Unified link integrity verification across both `managed/` and `src/`
 */
export class CheckLinksCommand extends BaseCommand {
  constructor(
    private detector?: MissingLinkDetector,
    private configLoader?: ConfigLoader,
    private docParser?: DocumentSymbolParser
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
    return (
      'tsdoc-edge docs check-links [docs-directory] [--fail-on-broken] [--json]\n\n' +
      '  Default: managed (or src if managed/ is absent)\n' +
      '  Options:\n' +
      '    --fail-on-broken   Exit with non-zero code when broken links are found\n' +
      '    --json             Output structured JSON report'
    );
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns `Promise<CommandResult>`
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    if (this.hasHelpFlag(args)) {
      return Promise.resolve(this.displayHelp());
    }

    const flagError = this.validateAllowedFlags(args, ['--json', '--fail-on-broken']);
    if (flagError) {
      return Promise.resolve(flagError);
    }

    return this.executeWithErrorHandling(() => {
      const jsonMode = this.hasFlag(args, '--json');
      const failOnBrokenFlag = this.hasFlag(args, '--fail-on-broken');
      const positional = this.getPositionalArgs(args);
      const defaultPath = fs.existsSync(path.resolve(process.cwd(), 'managed')) ? 'managed' : 'src';
      const sourcePath = positional[0] || defaultPath;
      const resolvedSourcePath = path.resolve(process.cwd(), sourcePath);

      if (!fs.existsSync(resolvedSourcePath)) {
        const message = `Source path not found: ${sourcePath}`;
        if (jsonMode) {
          console.log(
            JSON.stringify(
              {
                sourcePath,
                valid: false,
                error: message,
              },
              null,
              2
            )
          );
        } else {
          this.printError(message);
          console.log();
          console.log('Usage:');
          this.printInfo('  tsdoc-edge docs check-links [path] [--fail-on-broken] [--json]');
          console.log();
        }
        return this.failure(message);
      }

      const configLoader = this.configLoader || new ConfigLoader();
      const linkCheckConfig = configLoader.getLinkCheckConfig();

      if (!jsonMode) {
        this.printHeader('TSDoc Edge - Check Links');
        console.log(`Analyzing links in: ${colors.cyan}${sourcePath}${colors.reset}`);
        console.log();

        if (configLoader.hasConfigFile()) {
          console.log(`${colors.dim}Using config: ${configLoader.getConfigPath()}${colors.reset}`);
          console.log();
        }

        this.printSection('🔍 Scanning Documentation');
      }

      const report = this.analyzePath(sourcePath, resolvedSourcePath, configLoader);

      if (jsonMode) {
        const byTypeRecord: Record<string, BrokenLink[]> = {};
        for (const [type, links] of report.byType.entries()) {
          byTypeRecord[type] = links;
        }
        const byFileRecord: Record<string, BrokenLink[]> = {};
        for (const [file, links] of report.byFile.entries()) {
          const relFile = path.relative(process.cwd(), file) || file;
          byFileRecord[relFile] = links;
        }

        console.log(
          JSON.stringify(
            {
              sourcePath,
              valid: report.brokenLinks === 0,
              totalLinks: report.totalLinks,
              brokenLinks: report.brokenLinks,
              links: report.links,
              byType: byTypeRecord,
              byFile: byFileRecord,
            },
            null,
            2
          )
        );
      } else {
        this.displayHumanReport(report);
      }

      if (report.brokenLinks > 0 && (linkCheckConfig.failOnBroken || failOnBrokenFlag)) {
        return this.failure(`Found ${report.brokenLinks} broken links`);
      }

      return this.success();
    });
  }

  /**
   * Analyze both TypeScript and Markdown links under the target path
   */
  private analyzePath(
    sourcePath: string,
    resolvedSourcePath: string,
    configLoader: ConfigLoader
  ): MissingLinkReport {
    let totalLinks = 0;
    const brokenLinks: BrokenLink[] = [];

    const tsFiles = this.findFilesByExtension(resolvedSourcePath, ['.ts', '.tsx'], true);
    const mdFiles = this.findFilesByExtension(resolvedSourcePath, ['.md', '.mdx'], false);

    if (this.detector || (tsFiles.length > 0 && fs.statSync(resolvedSourcePath).isDirectory())) {
      const detector = this.detector || new MissingLinkDetector(configLoader);
      const tsReport = detector.analyze(sourcePath);
      totalLinks += tsReport.totalLinks;
      brokenLinks.push(...tsReport.links);
    }

    if (mdFiles.length > 0) {
      const mdReport = this.analyzeMarkdownFiles(resolvedSourcePath, mdFiles);
      totalLinks += mdReport.totalLinks;
      brokenLinks.push(...mdReport.brokenLinks);
    }

    const byType = new Map<LinkType, BrokenLink[]>();
    const byFile = new Map<string, BrokenLink[]>();

    for (const link of brokenLinks) {
      const typeGroup = byType.get(link.linkType);
      if (typeGroup) {
        typeGroup.push(link);
      } else {
        byType.set(link.linkType, [link]);
      }

      const fileGroup = byFile.get(link.sourceFile);
      if (fileGroup) {
        fileGroup.push(link);
      } else {
        byFile.set(link.sourceFile, [link]);
      }
    }

    return {
      totalLinks,
      brokenLinks: brokenLinks.length,
      links: brokenLinks,
      byType,
      byFile,
    };
  }

  /**
   * Analyze Markdown files for relative links, declared `source:` files, and `[[Symbol]]` checkpoints
   */
  private analyzeMarkdownFiles(
    resolvedSourcePath: string,
    markdownFiles: string[]
  ): {
    totalLinks: number;
    brokenLinks: BrokenLink[];
  } {
    const parser = this.docParser || new DocumentSymbolParser();
    const frontmatterParser = new FrontmatterParser();
    const registry = new DocumentSymbolRegistry();
    const parsedByFile = new Map<string, ParsedDocSymbols>();

    for (const filePath of markdownFiles) {
      const parsed = parser.parse(filePath, { forceManaged: true });
      if (!parsed) {
        continue;
      }
      parsedByFile.set(filePath, parsed);

      try {
        registry.registerDocument(parsed);
      } catch (_dupError) {
        // If duplicate H1 exists across files, still register auxiliaries so unique hubs resolve
        for (const aux of parsed.auxiliaries) {
          registry.registerDocument({
            filePath: parsed.filePath,
            auxiliaries: [aux],
            references: [],
            codeReferences: [],
            symbolFootnoteRefs: [],
          });
        }
      }
    }

    const externalAuxResolvable = this.preloadCanonicalDefinitions(
      resolvedSourcePath,
      parser,
      registry
    );

    const resolvableNames = new Set<string>([
      ...registry.getAllResolvableSymbolNames(),
      ...externalAuxResolvable,
    ]);

    let totalLinks = 0;
    const brokenLinks: BrokenLink[] = [];

    for (const filePath of markdownFiles) {
      const parsed = parsedByFile.get(filePath);
      const sourceSymbol = parsed?.primary?.name ?? path.basename(filePath, path.extname(filePath));

      // 1. Check standard Markdown [label](target) and local ![alt](target) links
      const mdFileLinks = this.checkStandardMarkdownLinks(
        filePath,
        sourceSymbol,
        parser,
        frontmatterParser
      );
      totalLinks += mdFileLinks.checkedCount;
      brokenLinks.push(...mdFileLinks.brokenLinks);

      if (!parsed) {
        continue;
      }

      // 2. Check declared frontmatter source: / **Source**: path
      if (parsed.sourceFilePath) {
        const cleanSource = parsed.sourceFilePath.split(':')[0].trim();
        if (cleanSource.length > 0 && !cleanSource.includes('*')) {
          totalLinks++;
          const resolvedDeclaredSource = path.resolve(process.cwd(), cleanSource);
          if (!fs.existsSync(resolvedDeclaredSource)) {
            brokenLinks.push({
              sourceSymbol,
              sourceFile: filePath,
              line: 1,
              linkType: 'file',
              target: parsed.sourceFilePath,
              reason: `Declared source file '${parsed.sourceFilePath}' not found`,
            });
          }
        }
      }

      // 3. Check [[Symbol]] checkpoint references (outside fenced code, inline code, and ## Backlinks)
      for (const ref of parsed.references) {
        totalLinks++;
        const isDefined =
          registry.resolveDefinition(ref.name) !== undefined || externalAuxResolvable.has(ref.name);

        if (!isDefined) {
          const targetDisplay = ref.section ? `[[${ref.name}#${ref.section}]]` : `[[${ref.name}]]`;
          brokenLinks.push({
            sourceSymbol,
            sourceFile: filePath,
            line: ref.line,
            linkType: 'symbol',
            target: targetDisplay,
            reason: `Document symbol '[[${ref.name}]]' is not defined`,
            suggestedFix: this.findSimilarSymbolSuggestion(ref.name, resolvableNames),
          });
        }
      }
    }

    return { totalLinks, brokenLinks };
  }

  /**
   * Check `[label](target)` and `![alt](target)` links in a Markdown file outside fenced/inline code and `## Backlinks`
   */
  private checkStandardMarkdownLinks(
    filePath: string,
    sourceSymbol: string,
    parser: DocumentSymbolParser,
    frontmatterParser: FrontmatterParser
  ): {
    checkedCount: number;
    brokenLinks: BrokenLink[];
  } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { body } = frontmatterParser.parse(content);
    const frontmatterLines = (content.slice(0, content.length - body.length).match(/\n/g) || [])
      .length;
    const withoutFences = parser.removeFencedCodeBlocks(body);
    const lines = withoutFences.split('\n');

    let checkedCount = 0;
    const brokenLinks: BrokenLink[] = [];
    let inBacklinksSection = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const lineNum = frontmatterLines + i + 1;

      if (/^\s*##?\s+Backlinks\b/i.test(rawLine)) {
        inBacklinksSection = true;
        continue;
      }
      if (inBacklinksSection && /^\s*#{1,2}\s+/i.test(rawLine)) {
        inBacklinksSection = false;
      }
      if (inBacklinksSection) {
        continue;
      }

      const lineWithoutInlineCode = rawLine.replace(/`[^`\n]+`/g, '');
      const linkRegex = /!?\[([^[\]]*)\]\(([^)]+)\)/g;

      for (const match of lineWithoutInlineCode.matchAll(linkRegex)) {
        const rawTarget = match[2].trim();
        if (!rawTarget) {
          continue;
        }

        const targetToken = rawTarget.split(/\s+/)[0];
        if (!targetToken || this.shouldSkipMarkdownTarget(targetToken)) {
          continue;
        }

        const withoutFragment = targetToken.split('#')[0].trim();
        const pathOnly = withoutFragment.split(':')[0].trim();
        if (!pathOnly) {
          continue;
        }

        let decodedPath = pathOnly;
        try {
          decodedPath = decodeURIComponent(pathOnly);
        } catch (_err) {
          decodedPath = pathOnly;
        }

        checkedCount++;

        if (!this.markdownTargetExists(filePath, decodedPath)) {
          brokenLinks.push({
            sourceSymbol,
            sourceFile: filePath,
            line: lineNum,
            linkType: 'file',
            target: targetToken,
            reason: `File '${decodedPath}' not found`,
          });
        }
      }
    }

    return { checkedCount, brokenLinks };
  }

  /**
   * Determine whether a Markdown link target is an external URI, anchor-only link, or template placeholder
   */
  private shouldSkipMarkdownTarget(target: string): boolean {
    if (target.startsWith('#')) {
      return true;
    }
    if (/^[a-z][a-z0-9+.-]+:/i.test(target)) {
      return true;
    }
    if (
      target.includes('<') ||
      target.includes('>') ||
      target.includes('*') ||
      target.includes('{') ||
      target.includes('}')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check whether a local Markdown link target exists relative to the Markdown file or workspace root
   */
  private markdownTargetExists(markdownFilePath: string, decodedTargetPath: string): boolean {
    const relativeToDoc = path.resolve(path.dirname(markdownFilePath), decodedTargetPath);
    if (fs.existsSync(relativeToDoc)) {
      return true;
    }

    if (
      decodedTargetPath.startsWith('managed/') ||
      decodedTargetPath.startsWith('src/') ||
      decodedTargetPath.startsWith('mcp-server/') ||
      decodedTargetPath.startsWith('scripts/')
    ) {
      const relativeToWorkspace = path.resolve(process.cwd(), decodedTargetPath);
      if (fs.existsSync(relativeToWorkspace)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Preload canonical definitions from `managed/` when checking a subdirectory or secondary docs directory
   */
  private preloadCanonicalDefinitions(
    resolvedSourcePath: string,
    parser: DocumentSymbolParser,
    registry: DocumentSymbolRegistry
  ): Set<string> {
    const managedPath = path.resolve(process.cwd(), 'managed');
    const uniqueExternalAux = new Set<string>();

    if (resolvedSourcePath === managedPath || !fs.existsSync(managedPath)) {
      return uniqueExternalAux;
    }

    const externalAuxCounts = new Map<string, number>();

    for (const filePath of this.findFilesByExtension(managedPath, ['.md', '.mdx'], false)) {
      const resolvedFile = path.resolve(filePath);
      if (
        resolvedFile === resolvedSourcePath ||
        resolvedFile.startsWith(`${resolvedSourcePath}${path.sep}`)
      ) {
        continue;
      }

      try {
        const parsed = parser.parse(filePath);
        if (!parsed) {
          continue;
        }
        if (parsed.primary) {
          registry.registerKnownPrimaryDefinition(parsed.primary);
        }
        for (const aux of parsed.auxiliaries) {
          externalAuxCounts.set(aux.name, (externalAuxCounts.get(aux.name) ?? 0) + 1);
        }
      } catch (_error) {
        // Keep link checking scoped to the requested target path.
      }
    }

    for (const [auxName, count] of externalAuxCounts.entries()) {
      if (count === 1 && registry.resolveDefinition(auxName) === undefined) {
        uniqueExternalAux.add(auxName);
      }
    }

    return uniqueExternalAux;
  }

  /**
   * Suggest a close symbol match for a broken `[[Symbol]]` reference
   */
  private findSimilarSymbolSuggestion(
    target: string,
    candidates: ReadonlySet<string>
  ): string | undefined {
    const lowerTarget = target.toLowerCase();
    for (const candidate of candidates) {
      const lowerCandidate = candidate.toLowerCase();
      if (lowerCandidate.includes(lowerTarget) || lowerTarget.includes(lowerCandidate)) {
        return `Did you mean [[${candidate}]]?`;
      }
    }
    return undefined;
  }

  /**
   * Find files matching given extensions under a file or directory path
   */
  private findFilesByExtension(
    targetPath: string,
    extensions: readonly string[],
    excludeTests: boolean,
    excludeDirs?: readonly string[]
  ): string[] {
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) {
      const matchesExt = extensions.some((ext) => targetPath.endsWith(ext));
      if (!matchesExt) {
        return [];
      }
      if (excludeTests && (targetPath.endsWith('.test.ts') || targetPath.endsWith('.test.tsx'))) {
        return [];
      }
      return [targetPath];
    }

    const resolvedExcludeDirs =
      excludeDirs ?? ConfigManager.getInstance().get().validation?.excludeDirs ?? [];
    const results: string[] = [];
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '.git' ||
          (excludeTests && entry.name === '__tests__') ||
          resolvedExcludeDirs.includes(entry.name)
        ) {
          continue;
        }
        results.push(
          ...this.findFilesByExtension(fullPath, extensions, excludeTests, resolvedExcludeDirs)
        );
      } else if (entry.isFile()) {
        const matchesExt = extensions.some((ext) => entry.name.endsWith(ext));
        if (!matchesExt) {
          continue;
        }
        if (excludeTests && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx'))) {
          continue;
        }
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Print human-readable link check report
   */
  private displayHumanReport(report: MissingLinkReport): void {
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

    this.printSection('❌ Broken Links by Type');
    for (const [type, links] of report.byType.entries()) {
      console.log(`   ${type}: ${colors.red}${links.length}${colors.reset}`);
    }
    console.log();

    this.printSection('📁 Broken Links by File');
    for (const [file, links] of report.byFile.entries()) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`   ${relPath}: ${colors.red}${links.length}${colors.reset}`);
    }
    console.log();

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
}
