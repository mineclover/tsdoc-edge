/**
 * Work Context Command - 작업자 중심 통합 컨텍스트 제공
 *
 * @remarks
 * 특정 파일을 작업할 때 필요한 모든 컨텍스트를 한눈에 제공:
 * - 관련 문서 (기획서, 명세서)
 * - 의존 타입 (이 파일이 사용하는 타입들)
 * - 테스트 파일 (이 파일을 테스트하는 파일들)
 * - 영향 범위 (이 파일을 사용하는 곳들)
 *
 * @doc [[WorkContextCommand]]
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { TSDocParser } from '../parser/TSDocParser';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import type { Symbol } from '../types/graph/graph';

interface WorkContext {
  filePath: string;
  symbols: Symbol[];
  relatedDocs: Array<{
    title: string;
    path: string;
    symbolRef: string;
    sourceFile?: string;
    sourceLine?: number;
  }>;
  dependencies: Array<{
    name: string;
    type: string;
    filePath: string;
  }>;
  typeFlows: Array<{
    from: string;
    to: string;
    chain: string[];
  }>;
  tests: Array<{
    path: string;
    coverage?: number;
    type: 'unit' | 'integration';
  }>;
  usedBy: Array<{
    name: string;
    filePath: string;
    type: string;
  }>;
  contracts: Array<{
    symbolId: string;
    symbolName: string;
    description: string;
    preconditions: string[];
    postconditions: string[];
    invariants: string[];
  }>;
  decisions: Array<{
    title: string;
    decision: string;
    rationale: string;
    status: string;
    date: string;
    symbolName?: string;
  }>;
  errorPatterns: Array<{
    symbolName: string;
    errorType: string;
    message: string;
    solution: string;
    prevention?: string;
  }>;
}

/**
 * Work Context Command - 파일 작업에 필요한 모든 컨텍스트 제공
 *
 * @doc [[WorkContextCommand]]
 * @public
 */
export class WorkContextCommand extends BaseCommand {
  getName(): string {
    return 'work-context';
  }

  getDescription(): string {
    return 'Show all context needed to work on a file (docs, types, tests, impact)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge work-context <file-path>';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const targetFile = args[0];

      if (!targetFile) {
        this.printError('File path required');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge work-context src/services/UserService.ts');
        console.log('  tsdoc-edge work-context src/controllers/AuthController.ts');
        console.log();
        console.log('Tip: Run with --help for more information');
        return this.failure('Missing file path');
      }

      // Resolve absolute path
      const absolutePath = path.resolve(process.cwd(), targetFile);

      if (!fs.existsSync(absolutePath)) {
        this.printError(`File not found: ${targetFile}`);
        return this.failure('File not found');
      }

      this.printHeader(`Work Context: ${path.basename(targetFile)}`);
      console.log(`📄 ${targetFile}`);
      console.log();

      // Load database
      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run: tsdoc-edge build src');
        return this.failure('Database not found');
      }

      const dbManager = new DatabaseManager(dbPath);
      const context = await this.gatherContext(absolutePath, targetFile, dbManager);

      // Display context
      this.displayContext(context);

      return this.success('Context gathered successfully');
    });
  }

  private async gatherContext(
    absolutePath: string,
    relativePath: string,
    dbManager: DatabaseManager
  ): Promise<WorkContext> {
    const context: WorkContext = {
      filePath: relativePath,
      symbols: [],
      relatedDocs: [],
      dependencies: [],
      typeFlows: [],
      tests: [],
      usedBy: [],
      contracts: [],
      decisions: [],
      errorPatterns: [],
    };

    // 1. Get symbols from this file
    const allSymbols = dbManager.db.prepare(
      'SELECT * FROM symbols WHERE file_path = ?'
    ).all(relativePath) as any[];

    context.symbols = allSymbols.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: Boolean(row.is_exported),
      isPublic: Boolean(row.is_public),
      summary: row.summary,
      tests: [],
      designDecisions: [],
      metadata: {},
    }));

    // 2. Parse file for @doc tags (related documents)
    try {
      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const lines = fileContent.split('\n');

      // Simple regex to find @doc tags
      const docTagRegex = /@doc\s+\[\[([^\]]+)\]\]/g;

      lines.forEach((line, index) => {
        const matches = line.matchAll(docTagRegex);
        for (const match of matches) {
          const symbolRef = match[1];
          context.relatedDocs.push({
            title: symbolRef,
            path: this.findDocumentPath(symbolRef),
            symbolRef,
            sourceFile: relativePath,
            sourceLine: index + 1,
          });
        }
      });
    } catch (error) {
      // Continue even if parsing fails
    }

    // 3. Get dependencies (what this file uses)
    for (const symbol of context.symbols) {
      const deps = dbManager.db.prepare(
        'SELECT * FROM dependencies WHERE symbol_id = ?'
      ).all(symbol.id) as any[];

      for (const dep of deps) {
        const targetSymbol = dbManager.db.prepare(
          'SELECT * FROM symbols WHERE id = ?'
        ).get(dep.target) as any;

        if (targetSymbol && targetSymbol.file_path !== relativePath) {
          context.dependencies.push({
            name: targetSymbol.name,
            type: targetSymbol.type,
            filePath: targetSymbol.file_path,
          });
        }
      }
    }

    // Remove duplicates
    context.dependencies = this.uniqueBy(context.dependencies, 'name');

    // 4. Get test files
    const symbolIds = context.symbols.map(s => s.id);
    if (symbolIds.length > 0) {
      const testMappings = dbManager.db.prepare(
        `SELECT * FROM test_mappings WHERE symbol_id IN (${symbolIds.map(() => '?').join(',')})`
      ).all(...symbolIds) as any[];

      const testPaths = new Set<string>();
      for (const mapping of testMappings) {
        testPaths.add(mapping.test_file_path);
      }

      context.tests = Array.from(testPaths).map(testPath => ({
        path: testPath,
        type: testPath.includes('integration') ? 'integration' : 'unit',
      }));
    }

    // 5. Get usedBy (what uses this file)
    for (const symbol of context.symbols) {
      const usages = dbManager.db.prepare(
        'SELECT * FROM dependencies WHERE target = ?'
      ).all(symbol.id) as any[];

      for (const usage of usages) {
        const userSymbol = dbManager.db.prepare(
          'SELECT * FROM symbols WHERE id = ?'
        ).get(usage.symbol_id) as any;

        if (userSymbol && userSymbol.file_path !== relativePath) {
          context.usedBy.push({
            name: userSymbol.name,
            filePath: userSymbol.file_path,
            type: userSymbol.type,
          });
        }
      }
    }

    // Remove duplicates
    context.usedBy = this.uniqueBy(context.usedBy, 'name');

    // 6. Get contracts (preconditions, postconditions, invariants)
    if (symbolIds.length > 0) {
      const contracts = dbManager.db.prepare(
        `SELECT * FROM contracts WHERE symbol_id IN (${symbolIds.map(() => '?').join(',')})`
      ).all(...symbolIds) as any[];

      for (const contract of contracts) {
        const symbol = context.symbols.find(s => s.id === contract.symbol_id);
        context.contracts.push({
          symbolId: contract.symbol_id,
          symbolName: symbol?.name || 'Unknown',
          description: contract.description,
          preconditions: JSON.parse(contract.preconditions),
          postconditions: JSON.parse(contract.postconditions),
          invariants: JSON.parse(contract.invariants),
        });
      }
    }

    // 7. Get design decisions
    if (symbolIds.length > 0) {
      const decisions = dbManager.db.prepare(
        `SELECT * FROM decision_records WHERE symbol_id IN (${symbolIds.map(() => '?').join(',')}) ORDER BY date DESC`
      ).all(...symbolIds) as any[];

      for (const decision of decisions) {
        const symbol = context.symbols.find(s => s.id === decision.symbol_id);
        context.decisions.push({
          title: decision.title,
          decision: decision.decision,
          rationale: decision.rationale,
          status: decision.status,
          date: decision.date,
          symbolName: symbol?.name,
        });
      }
    }

    // 8. Get error patterns
    if (symbolIds.length > 0) {
      const errors = dbManager.db.prepare(
        `SELECT * FROM error_experiences WHERE symbol_id IN (${symbolIds.map(() => '?').join(',')})`
      ).all(...symbolIds) as any[];

      for (const error of errors) {
        const symbol = context.symbols.find(s => s.id === error.symbol_id);
        context.errorPatterns.push({
          symbolName: symbol?.name || 'Unknown',
          errorType: error.error_type,
          message: error.message,
          solution: error.solution,
          prevention: error.prevention,
        });
      }
    }

    return context;
  }

  private findDocumentPath(symbolRef: string): string {
    // Search in managed directories
    const managedDirs = ['managed/features', 'managed/architecture', 'managed/workflows', 'managed/concepts'];

    for (const dir of managedDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) continue;

      const files = this.getAllMarkdownFiles(dirPath);
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          // Check for H1 definition: # [[SymbolRef]]
          const h1Match = content.match(/^#\s+\[\[([^\]]+)\]\]/m);
          if (h1Match && h1Match[1] === symbolRef) {
            return path.relative(process.cwd(), file);
          }
        } catch {
          continue;
        }
      }
    }

    return '(not found)';
  }

  private getAllMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.getAllMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  private uniqueBy<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  private displayContext(context: WorkContext): void {
    const colors = {
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
    };

    // Section divider
    const divider = '━'.repeat(80);

    // 1. Related Documents
    console.log(colors.bold + divider + colors.reset);
    console.log(colors.blue + '📚 관련 문서' + colors.reset + colors.dim + ` (${context.relatedDocs.length}개)` + colors.reset);
    console.log(colors.bold + divider + colors.reset);

    if (context.relatedDocs.length > 0) {
      for (const doc of context.relatedDocs) {
        const isFound = doc.path !== '(not found)';
        const statusIcon = isFound ? colors.green + '✅' : colors.yellow + '❌';

        console.log(`  ${colors.cyan}•${colors.reset} ${colors.bold}[[${doc.symbolRef}]]${colors.reset} ${statusIcon}${colors.reset}`);

        if (isFound) {
          console.log(`    ${colors.dim}→ ${doc.path}${colors.reset}`);
        } else {
          console.log(`    ${colors.yellow}→ Not found${colors.reset}`);
          console.log(`    ${colors.dim}   Searched in: managed/features/, managed/workflows/, managed/concepts/, managed/architecture/${colors.reset}`);
          if (doc.sourceFile && doc.sourceLine) {
            console.log(`    ${colors.dim}   Referenced in: ${doc.sourceFile}:${doc.sourceLine}${colors.reset}`);
          }
          console.log(`    ${colors.blue}   💡 Create document or remove @doc tag${colors.reset}`);
        }
        console.log();
      }
    } else {
      console.log(`  ${colors.dim}No @doc tags found in file${colors.reset}`);
      console.log();
    }

    // 2. Dependencies (Types this file uses)
    console.log(colors.bold + divider + colors.reset);
    console.log(colors.blue + '🔗 의존 타입' + colors.reset + colors.dim + ` (${context.dependencies.length}개)` + colors.reset);
    console.log(colors.bold + divider + colors.reset);

    if (context.dependencies.length > 0) {
      const displayLimit = 20;
      let displayed = 0;
      let missingCount = 0;

      for (const dep of context.dependencies) {
        if (displayed >= displayLimit) break;

        const absoluteDepPath = path.resolve(process.cwd(), dep.filePath);
        const exists = fs.existsSync(absoluteDepPath);
        const statusIcon = exists ? colors.green + '✅' : colors.yellow + '❌';

        console.log(`  ${colors.cyan}${dep.name.padEnd(20)}${colors.reset} ${statusIcon}${colors.reset}`);
        console.log(`    ${colors.dim}→ ${dep.filePath}${colors.reset}`);

        if (!exists) {
          missingCount++;
          console.log(`    ${colors.yellow}   File missing - dependency may be stale${colors.reset}`);
          console.log(`    ${colors.blue}   💡 Run: tsdoc-edge build src${colors.reset}`);
        }

        displayed++;
      }

      if (context.dependencies.length > displayLimit) {
        console.log();
        console.log(`  ${colors.dim}... ${context.dependencies.length - displayLimit} more (use --all to show all)${colors.reset}`);
      }

      if (missingCount > 0) {
        console.log();
        console.log(`  ${colors.yellow}⚠️  ${missingCount} missing dependencies detected${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.dim}No dependencies found${colors.reset}`);
    }
    console.log();

    // 3. Tests
    console.log(colors.bold + divider + colors.reset);
    console.log(colors.blue + '🧪 테스트' + colors.reset + colors.dim + ` (${context.tests.length}개)` + colors.reset);
    console.log(colors.bold + divider + colors.reset);

    if (context.tests.length > 0) {
      let missingTests = 0;

      for (const test of context.tests) {
        const absoluteTestPath = path.resolve(process.cwd(), test.path);
        const exists = fs.existsSync(absoluteTestPath);
        const icon = exists ? (test.type === 'integration' ? '🔗' : '✅') : '❌';

        console.log(`  ${icon} ${test.path}`);

        if (!exists) {
          missingTests++;
          console.log(`    ${colors.yellow}   File missing - test mapping exists but file deleted${colors.reset}`);
          console.log(`    ${colors.blue}   💡 Run: tsdoc-edge build src to update test mappings${colors.reset}`);
        } else if (test.coverage !== undefined) {
          console.log(`     ${colors.dim}→ 커버리지: ${test.coverage}%${colors.reset}`);
        }
        console.log();
      }

      if (missingTests > 0) {
        console.log(`  ${colors.yellow}⚠️  ${missingTests} test files missing${colors.reset}`);
        console.log();
      }
    } else {
      console.log(`  ${colors.yellow}❌ No tests found for this file${colors.reset}`);
      console.log(`  ${colors.blue}   💡 Create test file in src/__tests__/${colors.reset}`);
      console.log(`  ${colors.blue}   💡 Run: tsdoc-edge untested to see all untested symbols${colors.reset}`);
      console.log();
    }

    // 4. Impact (Used By)
    console.log(colors.bold + divider + colors.reset);
    console.log(colors.blue + '⚠️  영향 범위' + colors.reset + colors.dim + ` (${context.usedBy.length}개 파일이 이 파일 사용)` + colors.reset);
    console.log(colors.bold + divider + colors.reset);

    if (context.usedBy.length > 0) {
      const displayLimit = 10;
      const toDisplay = context.usedBy.slice(0, displayLimit);

      for (const usage of toDisplay) {
        console.log(`  ${colors.cyan}${usage.name.padEnd(20)}${colors.reset} ${colors.dim}→ ${usage.filePath}${colors.reset}`);
      }

      if (context.usedBy.length > displayLimit) {
        console.log(`  ${colors.dim}... ${context.usedBy.length - displayLimit} more${colors.reset}`);
      }

      console.log();
      console.log(`  ${colors.yellow}⚠️  수정 시 위 ${context.usedBy.length}개 파일 영향 받음${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓${colors.reset} ${colors.dim}No files depend on this file${colors.reset}`);
    }
    console.log();

    // 5. Contracts (Preconditions, Postconditions, Invariants)
    if (context.contracts.length > 0) {
      console.log(colors.bold + divider + colors.reset);
      console.log(colors.blue + '📜 계약 (Contracts)' + colors.reset + colors.dim + ` (${context.contracts.length}개)` + colors.reset);
      console.log(colors.bold + divider + colors.reset);

      for (const contract of context.contracts) {
        console.log(`  ${colors.bold}${contract.symbolName}${colors.reset}`);
        console.log(`    ${colors.dim}${contract.description}${colors.reset}`);
        console.log();

        if (contract.preconditions.length > 0) {
          console.log(`    ${colors.green}사전조건 (Preconditions):${colors.reset}`);
          for (const pre of contract.preconditions) {
            console.log(`      ${colors.cyan}•${colors.reset} ${pre}`);
          }
          console.log();
        }

        if (contract.postconditions.length > 0) {
          console.log(`    ${colors.green}사후조건 (Postconditions):${colors.reset}`);
          for (const post of contract.postconditions) {
            console.log(`      ${colors.cyan}•${colors.reset} ${post}`);
          }
          console.log();
        }

        if (contract.invariants.length > 0) {
          console.log(`    ${colors.green}불변식 (Invariants):${colors.reset}`);
          for (const inv of contract.invariants) {
            console.log(`      ${colors.cyan}•${colors.reset} ${inv}`);
          }
          console.log();
        }
      }
    }

    // 6. Design Decisions
    if (context.decisions.length > 0) {
      console.log(colors.bold + divider + colors.reset);
      console.log(colors.blue + '🎯 설계 결정 (Design Decisions)' + colors.reset + colors.dim + ` (${context.decisions.length}개)` + colors.reset);
      console.log(colors.bold + divider + colors.reset);

      for (const decision of context.decisions) {
        const statusIcon = decision.status === 'active' ? colors.green + '✅' :
                          decision.status === 'deprecated' ? colors.yellow + '⚠️' :
                          colors.dim + '📋';

        console.log(`  ${statusIcon}${colors.reset} ${colors.bold}${decision.title}${colors.reset}`);
        if (decision.symbolName) {
          console.log(`    ${colors.dim}Symbol: ${decision.symbolName}${colors.reset}`);
        }
        console.log(`    ${colors.dim}Date: ${decision.date}${colors.reset}`);
        console.log(`    ${colors.cyan}Decision:${colors.reset} ${decision.decision}`);
        console.log(`    ${colors.cyan}Rationale:${colors.reset} ${decision.rationale}`);
        console.log();
      }
    }

    // 7. Error Patterns
    if (context.errorPatterns.length > 0) {
      console.log(colors.bold + divider + colors.reset);
      console.log(colors.blue + '⚠️  일반적인 함정 (Common Pitfalls)' + colors.reset + colors.dim + ` (${context.errorPatterns.length}개)` + colors.reset);
      console.log(colors.bold + divider + colors.reset);

      for (const error of context.errorPatterns) {
        console.log(`  ${colors.yellow}❌${colors.reset} ${colors.bold}${error.errorType}${colors.reset} ${colors.dim}(${error.symbolName})${colors.reset}`);
        console.log(`    ${colors.yellow}Error:${colors.reset} ${error.message}`);
        console.log(`    ${colors.green}Solution:${colors.reset} ${error.solution}`);
        if (error.prevention) {
          console.log(`    ${colors.cyan}Prevention:${colors.reset} ${error.prevention}`);
        }
        console.log();
      }
    }

    // Summary
    console.log(colors.bold + divider + colors.reset);
    console.log(colors.bold + '📊 요약' + colors.reset);
    console.log(colors.bold + divider + colors.reset);
    console.log(`  심볼: ${colors.cyan}${context.symbols.length}개${colors.reset}`);
    console.log(`  문서: ${colors.cyan}${context.relatedDocs.length}개${colors.reset}`);
    console.log(`  의존: ${colors.cyan}${context.dependencies.length}개${colors.reset}`);
    console.log(`  테스트: ${colors.cyan}${context.tests.length}개${colors.reset}`);
    console.log(`  영향: ${colors.cyan}${context.usedBy.length}개 파일${colors.reset}`);
    console.log(`  계약: ${colors.cyan}${context.contracts.length}개${colors.reset}`);
    console.log(`  결정: ${colors.cyan}${context.decisions.length}개${colors.reset}`);
    console.log(`  함정: ${colors.cyan}${context.errorPatterns.length}개${colors.reset}`);
    console.log();
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}
