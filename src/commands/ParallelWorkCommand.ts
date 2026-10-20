/**
 * Parallel Work Command - 병렬 개발 가능 영역 탐지
 * @packageDocumentation
 */

import * as path from 'node:path';
import { ParallelWorkDetector } from '../analyzer/ParallelWorkDetector';
import { ConfigManager } from '../config/ConfigManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Parallel Work Command
 *
 * @doc [[ParallelWorkCommand]]
 * @public
 * @responsibility 병렬 개발 가능 영역 탐지 CLI 제공
 * @contract 작업 중인 모듈과 frozen 모듈을 입력받아 충돌 분석 및 병렬 영역 제시
 *
 * @functionality
 * - 작업 가능한 모듈 목록 출력
 * - 충돌 감지 및 상세 분석
 * - 병렬 작업 영역 제안
 * - Isolation barrier 추천
 *
 * @depends ParallelWorkDetector, SymbolGraphBuilder
 * @depType internal
 * @depReason 의존성 분석 로직 필요
 */
export class ParallelWorkCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'parallel-work';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Detect parallel development zones based on dependency graph';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge parallel-work --working "Module1,Module2" [--frozen "Module3"]

  Options:
    --working "M1,M2"    Modules currently being worked on
    --frozen "M3,M4"     Modules that are frozen
    --human              Output in human-readable format (default: XML)`;
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

      const isHuman = this.hasFlag(args, '--human');

      if (isHuman) {
        this.printHeader('TSDoc Edge - Parallel Work Detection');
      }

      // Parse arguments
      const options = this.parseArgs(args);

      if (!options.working || options.working.length === 0) {
        this.printError('No working modules specified. Use --working "Module1,Module2"');
        return this.failure('No working modules specified');
      }

      // Load graph
      const config = ConfigManager.getInstance().get();
      const dbPath = path.join(process.cwd(), config.paths.databasePath || '.tsdoc/symbols.db');
      const dbManager = new DatabaseManager(dbPath, '');

      if (isHuman) this.printInfo('Building dependency graph...');
      const graphBuilder = new SymbolGraphBuilder();
      const { symbols: symbolRows, dependencies: depRows } = dbManager.getGraphData();

      for (const row of symbolRows) {
        graphBuilder.addSymbol({
          id: row.id,
          name: row.name,
          type: row.type as SymbolType,
          filePath: row.file_path,
          line: row.line || 0,
          column: row.column || 0,
          isExported: Boolean(row.is_exported),
          isPublic: Boolean(row.is_public),
          summary: row.summary ?? '',
          tests: [],
          designDecisions: [],
          metadata: {},
        });
      }

      for (const rel of depRows) {
        graphBuilder.addRelationship({
          from: rel.symbol_id,
          to: rel.target,
          type: (rel.type || 'dependsOn') as SymbolRelationship['type'],
          filePath: '',
        });
      }

      const graph = graphBuilder.getGraph();
      dbManager.close();

      if (isHuman) {
        this.printSuccess(`Graph loaded: ${graph.symbols.size} modules`);
        console.log();
      }

      // Detect parallel work
      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(options.working, options.frozen);

      // Display results
      if (!isHuman) {
        this.printParallelWorkXml(detector, result, options, graph.symbols.size, args);
      } else if (options.command === 'conflicts') {
        this.displayConflicts(result.conflicts);
      } else if (options.command === 'suggest-barriers') {
        this.displayBarrierSuggestions(detector, options.working);
      } else {
        // Default: full report
        this.displayFullReport(result, options);
      }

      return this.success('Parallel work analysis complete');
    });
  }

  /**
   * Parse command arguments
   */
  private parseArgs(args: string[]): {
    working: string[];
    frozen: string[];
    command?: string;
  } {
    const working: string[] = [];
    const frozen: string[] = [];
    let command: string | undefined;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--working' && i + 1 < args.length) {
        working.push(...args[++i].split(',').map((s) => s.trim()));
      } else if (arg === '--frozen' && i + 1 < args.length) {
        frozen.push(...args[++i].split(',').map((s) => s.trim()));
      } else if (!arg.startsWith('--')) {
        command = arg;
      }
    }

    return { working, frozen, command };
  }

  /**
   * Display full analysis report
   */
  private displayFullReport(
    result: ReturnType<ParallelWorkDetector['detectParallelWork']>,
    options: { working: string[]; frozen: string[] }
  ): void {
    // Working & Frozen summary
    this.printSection('Configuration');
    console.log(
      `  Working modules (${options.working.length}): ${colors.yellow}${options.working.join(', ')}${colors.reset}`
    );
    if (options.frozen.length > 0) {
      console.log(
        `  Frozen modules (${options.frozen.length}): ${colors.cyan}${options.frozen.join(', ')}${colors.reset}`
      );
    }
    console.log();

    // Available modules
    this.printSection(`Available Modules (${result.availableModules.length})`);
    if (result.availableModules.length === 0) {
      console.log(`  ${colors.dim}No available modules${colors.reset}`);
    } else {
      const display = result.availableModules.slice(0, 10);
      display.forEach((module) => {
        console.log(`  ${colors.green}✓${colors.reset} ${module}`);
      });
      if (result.availableModules.length > 10) {
        console.log(
          `  ${colors.dim}... and ${result.availableModules.length - 10} more${colors.reset}`
        );
      }
    }
    console.log();

    // Conflicts
    if (result.conflicts.length > 0) {
      this.printSection(`Conflicts (${result.conflicts.length})`);
      result.conflicts.forEach((conflict) => {
        const icon =
          conflict.conflictType === 'direct'
            ? '⛔'
            : conflict.conflictType === 'transitive'
              ? '🔄'
              : '🔗';
        console.log(
          `  ${icon} ${colors.red}${conflict.module1}${colors.reset} ↔ ${colors.red}${conflict.module2}${colors.reset}`
        );
        console.log(`     Type: ${colors.yellow}${conflict.conflictType}${colors.reset}`);
        console.log(`     Path: ${colors.dim}${conflict.path.join(' → ')}${colors.reset}`);
        console.log();
      });
    } else {
      this.printSuccess('No conflicts detected');
      console.log();
    }

    // Parallel zones
    if (result.parallelZones.length > 0) {
      this.printSection(`Parallel Zones (${result.parallelZones.length})`);
      result.parallelZones.forEach((zone) => {
        if (zone.modules.length === 1) return; // Skip single-module zones

        console.log(
          `  ${colors.cyan}${zone.id}${colors.reset}: ${zone.modules.length} modules can work in parallel`
        );
        zone.modules.slice(0, 5).forEach((module) => {
          console.log(`    • ${module}`);
        });
        if (zone.modules.length > 5) {
          console.log(`    ${colors.dim}... and ${zone.modules.length - 5} more${colors.reset}`);
        }

        if (zone.isolationBarrier.length > 0) {
          console.log(
            `    ${colors.dim}Isolation barrier: ${zone.isolationBarrier.join(', ')}${colors.reset}`
          );
        }
        console.log();
      });
    }

    // Isolation barriers
    if (result.isolationBarriers.length > 0) {
      this.printSection(`Isolation Barriers (${result.isolationBarriers.length})`);
      console.log(
        `  ${colors.dim}Modules acting as barriers between working modules:${colors.reset}`
      );
      result.isolationBarriers.forEach((barrier) => {
        console.log(`  ${colors.cyan}⚪${colors.reset} ${barrier}`);
      });
      console.log();
    }
  }

  /**
   * Display conflicts only
   */
  private displayConflicts(
    conflicts: ReturnType<ParallelWorkDetector['detectParallelWork']>['conflicts']
  ): void {
    this.printSection(`Conflict Analysis (${conflicts.length} conflicts)`);

    if (conflicts.length === 0) {
      this.printSuccess('No conflicts detected - all working modules are independent');
      return;
    }

    conflicts.forEach((conflict, index) => {
      console.log(`\n${colors.bold}Conflict ${index + 1}:${colors.reset}`);
      console.log(
        `  ${colors.red}${conflict.module1}${colors.reset} ↔ ${colors.red}${conflict.module2}${colors.reset}`
      );
      console.log(`  Type: ${colors.yellow}${conflict.conflictType}${colors.reset}`);
      console.log(`  Path: ${colors.dim}${conflict.path.join(' → ')}${colors.reset}`);
      console.log(`  Reason: ${conflict.reason}`);

      // Resolution suggestions
      console.log(`\n  ${colors.cyan}Resolution options:${colors.reset}`);
      this.getResolutionOptions(conflict).forEach((option, optionIndex) => {
        console.log(`    ${optionIndex + 1}. ${option}`);
      });
    });
  }

  /**
   * Resolution suggestions for a conflict, in priority order
   */
  private getResolutionOptions(
    conflict: ReturnType<ParallelWorkDetector['detectParallelWork']>['conflicts'][number]
  ): string[] {
    if (conflict.conflictType === 'shared-mutable') {
      return [
        'Freeze the shared dependency interface',
        'Work on modules sequentially',
        'Extract interface from shared dependency',
      ];
    }
    if (conflict.conflictType === 'direct') {
      return [
        `Work on ${conflict.module2} first (dependency)`,
        `Freeze ${conflict.module2} interface`,
        'Use feature flags for parallel work',
      ];
    }
    return [
      'Work on dependencies first (bottom-up)',
      'Freeze intermediate modules',
      'Consider breaking the dependency chain',
    ];
  }

  /**
   * Print the analysis as an XML document (default output mode).
   * The sections follow the selected command: full report, conflicts, or suggest-barriers.
   */
  private printParallelWorkXml(
    detector: ParallelWorkDetector,
    result: ReturnType<ParallelWorkDetector['detectParallelWork']>,
    options: { working: string[]; frozen: string[]; command?: string },
    graphModuleCount: number,
    args: string[]
  ): void {
    const names = (modules: string[]) => modules.map((name) => ({ name }));
    const config = {
      command: options.command ?? 'full-report',
      graphModules: graphModuleCount,
      workingModules: options.working.join(','),
      frozenModules: options.frozen.join(','),
    };
    const conflicts = (withResolutions: boolean) =>
      result.conflicts.map((conflict) => ({
        module1: conflict.module1,
        module2: conflict.module2,
        type: conflict.conflictType,
        path: names(conflict.path),
        reason: conflict.reason,
        ...(withResolutions
          ? {
              resolutionOptions: this.getResolutionOptions(conflict).map((option) => ({ option })),
            }
          : {}),
      }));

    if (options.command === 'conflicts') {
      this.printOutput('parallel-work', { config, conflicts: conflicts(true) }, args);
    } else if (options.command === 'suggest-barriers') {
      const suggestions = detector.suggestIsolationBarriers(options.working);
      this.printOutput(
        'parallel-work',
        {
          config,
          barrierSuggestions: suggestions.map((suggestion) => ({
            barrier: suggestion.barrier,
            isolatedCount: suggestion.score,
            isolatedModules: names(suggestion.isolatedModules),
          })),
        },
        args
      );
    } else {
      this.printOutput(
        'parallel-work',
        {
          config,
          availableModules: names(result.availableModules),
          conflicts: conflicts(false),
          parallelZones: result.parallelZones.map((zone) => ({
            id: zone.id,
            moduleCount: zone.modules.length,
            canWorkInParallel: zone.canWorkInParallel,
            modules: names(zone.modules),
            isolationBarrier: names(zone.isolationBarrier),
          })),
          isolationBarriers: names(result.isolationBarriers),
        },
        args
      );
    }
  }

  /**
   * Display barrier suggestions
   */
  private displayBarrierSuggestions(detector: ParallelWorkDetector, modules: string[]): void {
    const suggestions = detector.suggestIsolationBarriers(modules);

    this.printSection(`Isolation Barrier Suggestions`);

    if (suggestions.length === 0) {
      console.log(`  ${colors.dim}No common dependencies found${colors.reset}`);
      return;
    }

    console.log(`  ${colors.dim}Modules that can act as stable interfaces:${colors.reset}\n`);

    suggestions.forEach((suggestion, index) => {
      console.log(`  ${colors.cyan}${index + 1}. ${suggestion.barrier}${colors.reset}`);
      console.log(`     Isolates: ${colors.green}${suggestion.score} modules${colors.reset}`);
      console.log(`     Modules: ${suggestion.isolatedModules.join(', ')}`);
      console.log();
    });

    console.log(
      `  ${colors.dim}💡 Tip: Freeze these modules to enable parallel development${colors.reset}`
    );
  }
}
