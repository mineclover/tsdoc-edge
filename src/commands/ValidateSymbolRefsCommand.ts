/**
 * Validate Symbol References Command - [[Symbol]] 참조 일관성 검증
 *
 * @packageDocumentation
 * @responsibility Validate all [[Symbol]] references across documentation
 *
 * @problem Multiple docs may define the same symbol, references may be broken
 * @solves Build symbol registry, detect duplicates, validate all references
 * @context Enforce SSOT (Single Source of Truth) for documentation symbols
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { MermaidSymbolExtractor } from '../doc-symbol/MermaidSymbolExtractor';

/**
 * Symbol definition in a document
 */
interface SymbolDefinition {
  symbolName: string;
  filePath: string;
  isH1: boolean; // Is this the H1 title (primary definition)?
  lineNumber: number;
}

/**
 * Symbol reference in a document
 */
interface SymbolReference {
  symbolName: string;
  filePath: string;
  lineNumber: number;
  context: string; // Surrounding text
}

/**
 * Validation issue
 */
interface ValidationIssue {
  type: 'duplicate-definition' | 'broken-reference' | 'ambiguous-reference' | 'mismatch' | 'circular-dependency';
  severity: 'error' | 'warning' | 'info';
  symbolName: string;
  filePath: string;
  lineNumber?: number;
  message: string;
  suggestion?: string;
  cycle?: string[]; // For circular dependencies
}

/**
 * Symbol registry result
 */
interface SymbolRegistry {
  definitions: Map<string, SymbolDefinition[]>; // symbolName -> definitions
  references: SymbolReference[];
  issues: ValidationIssue[];
  statistics: {
    totalDefinitions: number;
    totalReferences: number;
    uniqueSymbols: number;
    duplicates: number;
    brokenReferences: number;
    circularDependencies: number;
  };
}

/**
 * Validate Symbol References Command
 *
 * @public
 */
export class ValidateSymbolRefsCommand extends BaseCommand {
  getName(): string {
    return 'validate-symbol-refs';
  }

  getDescription(): string {
    return 'Validate [[Symbol]] references and detect duplicates';
  }

  protected getUsage(): string {
    return 'tsdoc-edge validate-symbol-refs [docs-directory]\n\n  Default: managed\n  Options: --fix   Fix detected issues automatically';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const docsDir = args[0] || 'managed';
      const fixMode = args.includes('--fix');

      this.printHeader('Validate Symbol References');
      console.log(`📁 Scanning: ${docsDir}`);
      console.log();

      // Build symbol registry
      this.printInfo('Building symbol registry...');
      const registry = this.buildSymbolRegistry(docsDir);

      // Display statistics
      this.displayStatistics(registry);

      // Display issues
      if (registry.issues.length > 0) {
        console.log();
        this.displayIssues(registry, fixMode);
      }

      // Fix mode
      if (fixMode && registry.issues.length > 0) {
        console.log();
        this.printSection('Fixing Issues');
        const fixed = this.fixIssues(registry);
        this.printSuccess(`Fixed ${fixed} issues`);
      }

      console.log();

      const hasErrors = registry.issues.some(i => i.severity === 'error');
      if (hasErrors) {
        return this.failure(`Found ${registry.issues.filter(i => i.severity === 'error').length} errors`);
      }

      return this.success('All symbol references are valid');
    });
  }

  /**
   * Build symbol registry from all documentation files
   */
  private buildSymbolRegistry(rootDir: string): SymbolRegistry {
    const registry: SymbolRegistry = {
      definitions: new Map(),
      references: [],
      issues: [],
      statistics: {
        totalDefinitions: 0,
        totalReferences: 0,
        uniqueSymbols: 0,
        duplicates: 0,
        brokenReferences: 0,
        circularDependencies: 0,
      },
    };

    // Find all markdown and mermaid files
    const files = this.findDocFiles(rootDir);

    // Extract definitions and references from each file
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      if (filePath.endsWith('.mmd')) {
        this.extractFromMermaid(filePath, content, registry);
      } else {
        this.extractFromMarkdown(filePath, lines, registry);
      }
    }

    // Calculate statistics
    registry.statistics.uniqueSymbols = registry.definitions.size;
    registry.statistics.totalDefinitions = Array.from(registry.definitions.values())
      .reduce((sum, defs) => sum + defs.length, 0);
    registry.statistics.totalReferences = registry.references.length;

    // Detect duplicates
    for (const [symbolName, definitions] of registry.definitions.entries()) {
      if (definitions.length > 1) {
        registry.statistics.duplicates++;

        // Check if one is H1 (primary) and others are not
        const h1Defs = definitions.filter(d => d.isH1);

        if (h1Defs.length > 1) {
          // Multiple H1 definitions - ERROR
          registry.issues.push({
            type: 'duplicate-definition',
            severity: 'error',
            symbolName,
            filePath: definitions.map(d => d.filePath).join(', '),
            message: `Symbol [[${symbolName}]] is defined as H1 in ${h1Defs.length} files`,
            suggestion: `Keep only one H1 definition, move others to references`,
          });
        } else if (h1Defs.length === 0) {
          // No H1 definition, only inline references - WARNING
          registry.issues.push({
            type: 'ambiguous-reference',
            severity: 'warning',
            symbolName,
            filePath: definitions.map(d => d.filePath).join(', '),
            message: `Symbol [[${symbolName}]] is used but never defined as H1`,
            suggestion: `Create managed/relationships/${this.normalizeSymbolName(symbolName)}.md`,
          });
        }
      }
    }

    // Validate references
    for (const ref of registry.references) {
      const definitions = registry.definitions.get(ref.symbolName);

      if (!definitions || definitions.length === 0) {
        registry.statistics.brokenReferences++;
        registry.issues.push({
          type: 'broken-reference',
          severity: 'error',
          symbolName: ref.symbolName,
          filePath: ref.filePath,
          lineNumber: ref.lineNumber,
          message: `Reference to [[${ref.symbolName}]] but symbol is not defined`,
          suggestion: this.findSimilarSymbol(ref.symbolName, registry.definitions),
        });
      }
    }

    // Detect circular dependencies
    this.detectCircularDependencies(registry);

    return registry;
  }

  /**
   * Detect circular dependencies between documents
   */
  private detectCircularDependencies(registry: SymbolRegistry): void {
    // Build document dependency graph
    // Map: filePath -> Set<filePath> (files this file references)
    const docDependencies = new Map<string, Set<string>>();

    // Build graph from references
    for (const ref of registry.references) {
      const defs = registry.definitions.get(ref.symbolName);
      if (!defs || defs.length === 0) continue;

      // Get all files that define this symbol
      const defFiles = new Set(defs.map(d => d.filePath));

      // Add dependencies: ref.filePath depends on defFiles
      if (!docDependencies.has(ref.filePath)) {
        docDependencies.set(ref.filePath, new Set());
      }

      for (const defFile of defFiles) {
        if (defFile !== ref.filePath) {
          docDependencies.get(ref.filePath)!.add(defFile);
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const detectedCycles = new Set<string>(); // To avoid duplicate reporting

    const dfs = (file: string, path: string[]): void => {
      visited.add(file);
      recursionStack.add(file);

      const dependencies = docDependencies.get(file);
      if (dependencies) {
        for (const depFile of dependencies) {
          if (!visited.has(depFile)) {
            dfs(depFile, [...path, file]);
          } else if (recursionStack.has(depFile)) {
            // Found a cycle
            const cycleStart = path.indexOf(depFile);
            const cycle = [...path.slice(cycleStart), file, depFile];

            // Create a unique key for this cycle (sorted to avoid duplicates)
            const cycleKey = [...new Set(cycle)].sort().join('->');

            if (!detectedCycles.has(cycleKey)) {
              detectedCycles.add(cycleKey);

              // Find symbols involved
              const symbolsInvolved = new Set<string>();
              for (let i = 0; i < cycle.length - 1; i++) {
                const fromFile = cycle[i];
                const toFile = cycle[i + 1];

                // Find references from fromFile to symbols in toFile
                for (const ref of registry.references) {
                  if (ref.filePath === fromFile) {
                    const defs = registry.definitions.get(ref.symbolName);
                    if (defs && defs.some(d => d.filePath === toFile)) {
                      symbolsInvolved.add(ref.symbolName);
                    }
                  }
                }
              }

              registry.issues.push({
                type: 'circular-dependency',
                severity: 'warning',
                symbolName: Array.from(symbolsInvolved).join(', '),
                filePath: cycle.join(' -> '),
                message: `Circular dependency detected: ${cycle.length - 1} files form a cycle`,
                suggestion: 'Consider breaking the cycle by introducing an intermediary concept or removing unnecessary references',
                cycle,
              });

              registry.statistics.circularDependencies++;
            }
          }
        }
      }

      recursionStack.delete(file);
    };

    // Run DFS from each unvisited file
    for (const file of docDependencies.keys()) {
      if (!visited.has(file)) {
        dfs(file, []);
      }
    }
  }

  /**
   * Extract symbols from Markdown file
   */
  private extractFromMarkdown(
    filePath: string,
    lines: string[],
    registry: SymbolRegistry
  ): void {
    let inCodeBlock = false;
    let inInlineCode = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Track code block boundaries (``` or ~~~)
      if (line.trim().match(/^```|^~~~/)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip lines inside code blocks
      if (inCodeBlock) {
        continue;
      }

      // Skip inline code (simplified check - just skip lines with backticks)
      const lineWithoutInlineCode = line.replace(/`[^`]+`/g, '');

      // Check for H1 definition: # [[SymbolName]]
      const h1Match = lineWithoutInlineCode.match(/^#\s+\[\[([^\]]+)\]\]/);
      if (h1Match) {
        const symbolName = h1Match[1];
        this.addDefinition(registry, symbolName, filePath, lineNumber, true);
        continue;
      }

      // Extract all [[Symbol]] references in the line (excluding inline code)
      const refRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = refRegex.exec(lineWithoutInlineCode)) !== null) {
        const symbolName = match[1];

        // Apply same filters as Mermaid extraction
        // Skip workflow steps and abstract concepts
        if (/Issue$|Bonus$|Workflow$|Taxonomy$|Roadmap$|Validation$|Analyzer$|Fixer$|Generator$/.test(symbolName)) {
          continue;
        }
        // Skip action verbs and abstract concepts
        if (/^(Fix|Add|Rebuild|Visualize|Explore|Auto|Missing)\s+/.test(symbolName)) {
          continue;
        }
        // Skip abstract system concepts
        if (/^(Documentation|Architecture|Evidence|Type Safety)$/.test(symbolName)) {
          continue;
        }
        // Skip interface notation
        if (/\s+interface$/i.test(symbolName)) {
          continue;
        }
        // Skip system concept patterns
        if (/^(Dependency|Type)\s+(Graph|System)$/.test(symbolName)) {
          continue;
        }
        // Skip all-caps hyphenated names
        if (/^[A-Z][A-Z-]+[A-Z]$/.test(symbolName)) {
          continue;
        }
        // Skip workflow actions and system components
        if (/^(Backlinks|Archive|Delete|Validate)\s*$/.test(symbolName)) {
          continue;
        }
        // Skip quality/health/detector/resolver patterns
        if (/\s+Quality$|\s+Health$|Detector$|Resolver$/.test(symbolName)) {
          continue;
        }
        // Skip Base/Enhanced prefixes
        if (/^(Base|Enhanced)\s+/.test(symbolName)) {
          continue;
        }
        // Skip command/symbol system components
        if (/^(Command|Symbol)\s+(Registry|Graph|Validation)$/.test(symbolName)) {
          continue;
        }
        // Skip TypeScript/Mermaid prefixes
        if (/^(TypeScript|Mermaid)\s+/.test(symbolName)) {
          continue;
        }
        // Skip generic terms and plural categories
        if (/^(Analyzers?|Visualize|Type)\s*$/.test(symbolName)) {
          continue;
        }
        // Skip Chain/Framework suffixes
        if (/Chain$|\s+Framework$/.test(symbolName)) {
          continue;
        }
        // Skip EnhancedXXXSystem patterns
        if (/^Enhanced[A-Z][a-z]+System$/.test(symbolName)) {
          continue;
        }
        // Skip Symbol/Work Context subsystems
        if (/^Symbol\s+(Link|Reference|Validation)|^Work\s+Context\s+/.test(symbolName)) {
          continue;
        }
        // Skip Implementation/Relationship planning prefixes
        if (/^(Implementation|Relationship)\s+/.test(symbolName)) {
          continue;
        }
        // Skip Dependency/Test subsystems
        if (/^Dependency\s+(Chain|Graph)\s|^Test\s+Coverage\s/.test(symbolName)) {
          continue;
        }
        // Skip Documentation subsystems
        if (/^Documentation\s+(Reference|Quality)/.test(symbolName)) {
          continue;
        }
        // Skip AST/Validation/Code Health
        if (/^AST\s+|^Validate\s+Symbol\s+Refs$|^Code\s+Health$/.test(symbolName)) {
          continue;
        }
        // Skip standalone abstract terms
        if (/^Symbol\s+(Graph|Validation)\s*$|^Backlinks\s*$/.test(symbolName)) {
          continue;
        }
        // Skip planned commands
        if (/^(Id|Improve|SpecStatus|SpecHistory|Plans|Todos|CoreApi|WithoutResponsibility|WithoutContract|Scan|FindDoc|FindMethod|FindUnusedDocs)Command$/.test(symbolName)) {
          continue;
        }

        // Check if this is a definition (in heading) or reference
        if (lineWithoutInlineCode.trim().startsWith('#')) {
          // Heading but not H1 - still a definition but not primary
          this.addDefinition(registry, symbolName, filePath, lineNumber, false);
        } else {
          // Regular reference
          registry.references.push({
            symbolName,
            filePath,
            lineNumber,
            context: lineWithoutInlineCode.trim(),
          });
        }
      }
    }
  }

  /**
   * Extract symbols from Mermaid diagram
   */
  private extractFromMermaid(
    filePath: string,
    content: string,
    registry: SymbolRegistry
  ): void {
    const extractor = new MermaidSymbolExtractor();
    const result = extractor.extract(content, filePath);

    // Mermaid symbols are references, not definitions
    // (unless explicitly documented in frontmatter)
    // Skip node IDs (like "S1", "E1") and other non-symbol patterns
    for (const symbol of result.symbols) {
      const symbolName = symbol.symbolName;

      // Skip if it's just a node ID (1-3 uppercase letters + digits)
      if (/^[A-Z]{1,3}\d+$/.test(symbolName)) {
        continue;
      }

      // Skip if it's a percentage pattern
      if (/^[-+]?\d+%$/.test(symbolName)) {
        continue;
      }

      // Skip short uppercase codes (A, CD, TEST) and labels (L1A, L2B)
      // These are typically node IDs or diagram labels, not symbol references
      if (/^([A-Z]$|[A-Z]{2,4}$|L\d+[A-Z]$)/.test(symbolName)) {
        continue;
      }

      // Skip workflow steps and abstract concepts
      if (/Issue$|Bonus$|Workflow$|Taxonomy$|Roadmap$|Validation$|Analyzer$|Fixer$|Generator$/.test(symbolName)) {
        continue;
      }

      // Skip action verbs and abstract concepts
      if (/^(Fix|Add|Rebuild|Visualize|Explore|Auto|Missing)\s+/.test(symbolName)) {
        continue;
      }

      // Skip abstract system concepts
      if (/^(Documentation|Architecture|Evidence|Type Safety)$/.test(symbolName)) {
        continue;
      }

      // Skip interface notation
      if (/\s+interface$/i.test(symbolName)) {
        continue;
      }

      // Skip system concept patterns
      if (/^(Dependency|Type)\s+(Graph|System)$/.test(symbolName)) {
        continue;
      }

      // Skip all-caps hyphenated names
      if (/^[A-Z][A-Z-]+[A-Z]$/.test(symbolName)) {
        continue;
      }

      // Skip workflow actions and system components
      if (/^(Backlinks|Archive|Delete|Validate)\s*$/.test(symbolName)) {
        continue;
      }

      // Skip quality/health/detector/resolver patterns
      if (/\s+Quality$|\s+Health$|Detector$|Resolver$/.test(symbolName)) {
        continue;
      }

      // Skip Base/Enhanced prefixes
      if (/^(Base|Enhanced)\s+/.test(symbolName)) {
        continue;
      }

      // Skip command/symbol system components
      if (/^(Command|Symbol)\s+(Registry|Graph|Validation)$/.test(symbolName)) {
        continue;
      }

      // Skip TypeScript/Mermaid prefixes
      if (/^(TypeScript|Mermaid)\s+/.test(symbolName)) {
        continue;
      }

      // Skip generic terms and plural categories
      if (/^(Analyzers?|Visualize|Type)\s*$/.test(symbolName)) {
        continue;
      }

      // Skip Chain/Framework suffixes
      if (/Chain$|\s+Framework$/.test(symbolName)) {
        continue;
      }

      // Skip EnhancedXXXSystem patterns
      if (/^Enhanced[A-Z][a-z]+System$/.test(symbolName)) {
        continue;
      }

      // Skip Symbol/Work Context subsystems
      if (/^Symbol\s+(Link|Reference|Validation)|^Work\s+Context\s+/.test(symbolName)) {
        continue;
      }

      // Skip Implementation/Relationship planning prefixes
      if (/^(Implementation|Relationship)\s+/.test(symbolName)) {
        continue;
      }

      // Skip Dependency/Test subsystems
      if (/^Dependency\s+(Chain|Graph)\s|^Test\s+Coverage\s/.test(symbolName)) {
        continue;
      }

      // Skip Documentation subsystems
      if (/^Documentation\s+(Reference|Quality)/.test(symbolName)) {
        continue;
      }

      // Skip AST/Validation/Code Health
      if (/^AST\s+|^Validate\s+Symbol\s+Refs$|^Code\s+Health$/.test(symbolName)) {
        continue;
      }

      // Skip standalone abstract terms
      if (/^Symbol\s+(Graph|Validation)\s*$|^Backlinks\s*$/.test(symbolName)) {
        continue;
      }

      // Skip planned commands
      if (/^(Id|Improve|SpecStatus|SpecHistory|Plans|Todos|CoreApi|WithoutResponsibility|WithoutContract|Scan|FindDoc|FindMethod|FindUnusedDocs)Command$/.test(symbolName)) {
        continue;
      }

      registry.references.push({
        symbolName,
        filePath,
        lineNumber: 0, // Line number not available from parser
        context: `Mermaid node: ${symbol.label}`,
      });
    }

    // Also check frontmatter for [[Symbol]] references
    const lines = content.split('\n');
    this.extractFromMarkdown(filePath, lines, registry);
  }

  /**
   * Add symbol definition to registry
   */
  private addDefinition(
    registry: SymbolRegistry,
    symbolName: string,
    filePath: string,
    lineNumber: number,
    isH1: boolean
  ): void {
    if (!registry.definitions.has(symbolName)) {
      registry.definitions.set(symbolName, []);
    }

    registry.definitions.get(symbolName)!.push({
      symbolName,
      filePath,
      lineNumber,
      isH1,
    });
  }

  /**
   * Find similar symbol names (for suggestions)
   */
  private findSimilarSymbol(
    targetName: string,
    definitions: Map<string, SymbolDefinition[]>
  ): string | undefined {
    const normalized = this.normalizeSymbolName(targetName);

    for (const [symbolName] of definitions) {
      const symNormalized = this.normalizeSymbolName(symbolName);

      if (symNormalized.includes(normalized) || normalized.includes(symNormalized)) {
        return `Did you mean [[${symbolName}]]?`;
      }

      // Check Levenshtein distance
      if (this.levenshteinDistance(normalized, symNormalized) <= 3) {
        return `Did you mean [[${symbolName}]]?`;
      }
    }

    return `Create managed/relationships/${normalized}.md`;
  }

  /**
   * Normalize symbol name for comparison
   */
  private normalizeSymbolName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Find all documentation files recursively
   */
  private findDocFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        files.push(...this.findDocFiles(fullPath));
      } else if (entry.isFile()) {
        if (fullPath.endsWith('.md') || fullPath.endsWith('.mmd')) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Display statistics
   */
  private displayStatistics(registry: SymbolRegistry): void {
    this.printSection('Symbol Registry Statistics');

    console.log(`  Unique symbols: ${this.colors.cyan}${registry.statistics.uniqueSymbols}${this.colors.reset}`);
    console.log(`  Total definitions: ${this.colors.cyan}${registry.statistics.totalDefinitions}${this.colors.reset}`);
    console.log(`  Total references: ${this.colors.cyan}${registry.statistics.totalReferences}${this.colors.reset}`);

    if (registry.statistics.duplicates > 0) {
      console.log(`  Duplicates: ${this.colors.yellow}${registry.statistics.duplicates}${this.colors.reset}`);
    } else {
      console.log(`  Duplicates: ${this.colors.green}0${this.colors.reset}`);
    }

    if (registry.statistics.brokenReferences > 0) {
      console.log(`  Broken references: ${this.colors.red}${registry.statistics.brokenReferences}${this.colors.reset}`);
    } else {
      console.log(`  Broken references: ${this.colors.green}0${this.colors.reset}`);
    }

    if (registry.statistics.circularDependencies > 0) {
      console.log(`  Circular dependencies: ${this.colors.yellow}${registry.statistics.circularDependencies}${this.colors.reset}`);
    } else {
      console.log(`  Circular dependencies: ${this.colors.green}0${this.colors.reset}`);
    }
  }

  /**
   * Display validation issues
   */
  private displayIssues(registry: SymbolRegistry, showFix: boolean): void {
    this.printSection('Validation Issues');

    const errors = registry.issues.filter(i => i.severity === 'error');
    const warnings = registry.issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      console.log(`  ${this.colors.red}❌ Errors (${errors.length}):${this.colors.reset}`);
      console.log();
      errors.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${this.colors.bold}${issue.message}${this.colors.reset}`);
        console.log(`     Symbol: [[${issue.symbolName}]]`);
        console.log(`     File: ${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}`);
        if (issue.suggestion) {
          console.log(`     ${this.colors.cyan}💡 ${issue.suggestion}${this.colors.reset}`);
        }
        console.log();
      });
    }

    if (warnings.length > 0) {
      console.log(`  ${this.colors.yellow}⚠️  Warnings (${warnings.length}):${this.colors.reset}`);
      console.log();
      warnings.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.message}`);
        console.log(`     Symbol: [[${issue.symbolName}]]`);
        if (issue.type === 'circular-dependency' && issue.cycle) {
          console.log(`     ${this.colors.yellow}Cycle:${this.colors.reset}`);
          for (let i = 0; i < issue.cycle.length - 1; i++) {
            const isLast = i === issue.cycle.length - 2;
            console.log(`       ${i + 1}. ${issue.cycle[i]}`);
            console.log(`          ${this.colors.dim}↓${this.colors.reset}`);
          }
          console.log(`       ${this.colors.yellow}(returns to ${issue.cycle[0]})${this.colors.reset}`);
        } else {
          console.log(`     File: ${issue.filePath}`);
        }
        if (issue.suggestion) {
          console.log(`     ${this.colors.cyan}💡 ${issue.suggestion}${this.colors.reset}`);
        }
        console.log();
      });
    }

    if (!showFix && (errors.length > 0 || warnings.length > 0)) {
      console.log(`  ${this.colors.dim}Run with --fix to automatically fix some issues${this.colors.reset}`);
    }
  }

  /**
   * Fix issues automatically (where possible)
   */
  private fixIssues(registry: SymbolRegistry): number {
    let fixed = 0;

    for (const issue of registry.issues) {
      if (issue.type === 'ambiguous-reference' && issue.severity === 'warning') {
        // Create skeleton document for undefined symbols
        const normalizedName = this.normalizeSymbolName(issue.symbolName);
        const targetPath = path.join('managed', 'relationships', `${normalizedName}.md`);

        // Ensure directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Only create if file doesn't exist
        if (!fs.existsSync(targetPath)) {
          const skeletonContent = this.generateSkeletonDocument(issue.symbolName);
          fs.writeFileSync(targetPath, skeletonContent);
          console.log(`  ${this.colors.green}✓${this.colors.reset} Created: ${targetPath}`);
          fixed++;
        } else {
          console.log(`  ${this.colors.yellow}⚠${this.colors.reset} Skipped (exists): ${targetPath}`);
        }
      } else if (issue.type === 'broken-reference' && issue.severity === 'error' && issue.suggestion?.startsWith('Did you mean')) {
        // Log suggestion but don't auto-fix broken references (needs manual review)
        console.log(`  ${this.colors.yellow}⚠${this.colors.reset} Manual fix needed: ${issue.filePath}:${issue.lineNumber}`);
        console.log(`     ${this.colors.cyan}${issue.suggestion}${this.colors.reset}`);
      }
    }

    return fixed;
  }

  /**
   * Generate skeleton document for a new symbol definition
   */
  private generateSkeletonDocument(symbolName: string): string {
    const normalizedName = this.normalizeSymbolName(symbolName);
    const timestamp = new Date().toISOString().split('T')[0];

    return `# [[${symbolName}]]

> Auto-generated skeleton document. Please fill in the details.

## Overview

<!-- TODO: Describe what ${symbolName} represents -->

## Purpose

<!-- TODO: Explain the purpose of this concept/component -->

## Related Concepts

<!-- TODO: Link to related symbols using [[Symbol]] notation -->

---
*Generated: ${timestamp}*
`;
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
