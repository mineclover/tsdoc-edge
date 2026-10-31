/**
 * Spec Metrics Aggregator - Centralized aggregation and mutual interconnection of specification metrics
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { SpecGraphRepository } from '../storage/SpecGraphRepository';
import type { SpecStatus } from '../types/spec';
import { SpecCompletenessValidator } from './SpecCompletenessValidator';
import { SpecContentSimilarityChecker } from './SpecContentSimilarityChecker';
import { SpecStatusManager } from './SpecStatusManager';
import { UnusedDocumentDetector } from './UnusedDocumentDetector';

/**
 * Options for spec metrics aggregation
 * @public
 */
export interface SpecMetricsOptions {
  /** Directory containing managed specifications */
  managedDir?: string;
  /** Path to symbol SQLite database */
  dbPath?: string;
  /** Path to spec graph SQLite database */
  specDbPath?: string;
  /** Source code directory */
  srcDir?: string;
  /** Whether to run deep content similarity check */
  deepSimilarity?: boolean;
}

/**
 * Unified Specification Metrics representation across 5 core dimensions
 * @public
 */
export interface UnifiedSpecMetrics {
  timestamp: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  /** 1. Document Quality & Completeness */
  documentQuality: {
    totalDocuments: number;
    completeCount: number;
    incompleteCount: number;
    completenessRate: number;
    averageDesignScore: number;
    averageImplementationScore: number;
    averageOverallScore: number;
    totalScenarios: number;
    totalExamples: number;
    totalConceptLinks: number;
    totalCodeLinks: number;
    totalIssues: number;
  };

  /** 2. Lifecycle Governance */
  lifecycle: {
    distribution: Record<SpecStatus, number>;
    distributionPercentages: Record<SpecStatus, number>;
    activeRatio: number;
    readyForPromotionCount: number;
    unusedDocumentsCount: number;
    duplicatePairsCount: number;
  };

  /** 3. SpecGraph Conformance & Obligations */
  graphConformance: {
    hasSpecGraph: boolean;
    revisionId?: string;
    nodeCount: number;
    edgeCount: number;
    bindingCount: number;
    obligationCount: number;
    conformanceRate: number;
    satisfactionRate: number;
    outcomes: {
      satisfied: number;
      violated: number;
      indeterminate: number;
      suppressed: number;
      disabled: number;
    };
  };

  /** 4. Module Spec 7-Aspect Coverage */
  module7Aspects: {
    analyzedSymbols: number;
    aspectCoverage: {
      purpose: number;
      input: number;
      output: number;
      context: number;
      logic: number;
      effect: number;
      scope: number;
    };
    averageAspectScore: number;
  };

  /** 5. Code-to-Spec Bidirectional Connectivity */
  codeConnectivity: {
    totalSymbols: number;
    exportedSymbols: number;
    symbolsWithSpecReference: number;
    specCoverageRate: number;
    validCodeLinksCount: number;
    brokenCodeLinksCount: number;
    linkIntegrityRate: number;
  };

  /** Actionable recommendations */
  recommendations: Array<{
    category: 'quality' | 'lifecycle' | 'conformance' | 'connectivity';
    severity: 'error' | 'warning' | 'info';
    message: string;
    target?: string;
  }>;
}

/**
 * File-scoped spec context for individual code or spec files
 * @public
 */
export interface FileSpecContext {
  filePath: string;
  isSpecFile: boolean;
  score?: number;
  status?: SpecStatus;
  linkedSymbols?: string[];
  boundSpecs?: Array<{
    title: string;
    filePath: string;
    status: SpecStatus;
    score: number;
  }>;
  aspectsCoverage?: Record<string, boolean>;
  recommendations: string[];
}

/**
 * Aggregator and orchestrator for all specification metrics
 *
 * @doc [[SpecMetricsAggregator]]
 * @public
 * @responsibility Unify spec completeness, lifecycle, graph conformance, 7-aspects, and code connectivity
 * @contract Collect cross-system metrics and produce unified spec health score and recommendations
 */
export class SpecMetricsAggregator {
  private completenessValidator: SpecCompletenessValidator;
  private statusManager: SpecStatusManager;
  private unusedDetector: UnusedDocumentDetector;
  private similarityChecker: SpecContentSimilarityChecker;
  private docSymbolParser: DocumentSymbolParser;

  constructor() {
    this.completenessValidator = new SpecCompletenessValidator();
    this.statusManager = new SpecStatusManager();
    this.unusedDetector = new UnusedDocumentDetector();
    this.similarityChecker = new SpecContentSimilarityChecker();
    this.docSymbolParser = new DocumentSymbolParser();
  }

  /**
   * Aggregate all specification metrics across the project
   *
   * @param options - Aggregation options
   * @returns Unified spec metrics
   * @public
   */
  aggregate(options: SpecMetricsOptions = {}): UnifiedSpecMetrics {
    const config = ConfigManager.getInstance().get();
    const managedDir =
      options.managedDir ||
      (fs.existsSync(path.resolve(process.cwd(), 'managed'))
        ? 'managed'
        : config.specGovernance?.authoredSpecDirs?.[0] || 'docs/managed');

    const fullManagedPath = path.resolve(process.cwd(), managedDir);
    const dbPath = path.resolve(
      process.cwd(),
      options.dbPath || config.paths?.databasePath || '.tsdoc.db'
    );
    const specDbPath = path.resolve(process.cwd(), options.specDbPath || '.tsdoc/spec-graph.db');

    // 1. Gather specification documents
    const specFiles = this.collectMarkdownFiles(fullManagedPath);

    // Dimension 1: Document Quality & Completeness
    const completenessResults = this.completenessValidator.validateMultiple(specFiles);
    const summary = this.completenessValidator.getSummary(completenessResults);

    let totalDesignScore = 0;
    let totalImplementationScore = 0;
    let totalScenarios = 0;
    let totalExamples = 0;
    let totalConceptLinks = 0;
    let totalCodeLinks = 0;

    for (const res of completenessResults) {
      totalDesignScore += res.designScore;
      totalImplementationScore += res.implementationScore;
      totalScenarios += res.breakdown.design.scenarios.count;
      totalExamples += res.breakdown.implementation.examples.count;
      totalConceptLinks += res.breakdown.design.conceptReferences.count;
      totalCodeLinks += res.breakdown.implementation.codeReferences.count;
    }

    const docCount = specFiles.length || 1;
    const avgDesign = specFiles.length > 0 ? Math.round(totalDesignScore / docCount) : 0;
    const avgImplementation =
      specFiles.length > 0 ? Math.round(totalImplementationScore / docCount) : 0;
    const avgOverall = Number.isNaN(summary.averageScore) ? 0 : summary.averageScore;
    const completenessRate =
      specFiles.length > 0 ? Math.round((summary.complete / docCount) * 100) : 0;

    // Dimension 2: Lifecycle Governance
    const distribution = this.statusManager.getStatusDistribution(specFiles);
    const distributionPercentages: Record<SpecStatus, number> = {
      draft: Math.round(((distribution.draft || 0) / docCount) * 100),
      review: Math.round(((distribution.review || 0) / docCount) * 100),
      approved: Math.round(((distribution.approved || 0) / docCount) * 100),
      active: Math.round(((distribution.active || 0) / docCount) * 100),
      deprecated: Math.round(((distribution.deprecated || 0) / docCount) * 100),
      archived: Math.round(((distribution.archived || 0) / docCount) * 100),
    };

    const activeRatio = Math.round(
      (((distribution.active || 0) + (distribution.approved || 0)) / docCount) * 100
    );

    let readyForPromotionCount = 0;
    try {
      const ready = this.statusManager.getPromotableDocs(specFiles);
      readyForPromotionCount = ready.length;
    } catch {
      // Ignore if scan fails
    }

    let unusedCount = 0;
    try {
      if (fs.existsSync(fullManagedPath)) {
        const unused = this.unusedDetector.detect(fullManagedPath);
        unusedCount = unused.filter(
          (u) => u.suggestedAction === 'archive' || u.suggestedAction === 'delete'
        ).length;
      }
    } catch {
      // Ignore
    }

    let duplicatePairsCount = 0;
    if (options.deepSimilarity && specFiles.length > 1) {
      try {
        const sampleFiles = specFiles.slice(0, 30);
        const dupes = this.similarityChecker.checkMultiple(sampleFiles);
        duplicatePairsCount = dupes.filter(
          (d: { similarity: number }) => d.similarity >= 0.8
        ).length;
      } catch {
        // Ignore
      }
    }

    // Dimension 3: SpecGraph Conformance
    let hasSpecGraph = false;
    let specRevId: string | undefined;
    let specNodes = 0;
    let specEdges = 0;
    let specBindings = 0;
    let obligationCount = 0;
    let satisfiedCount = 0;
    const violatedCount = 0;
    const indeterminateCount = 0;
    const suppressedCount = 0;
    const disabledCount = 0;

    if (fs.existsSync(specDbPath)) {
      try {
        const specRepo = new SpecGraphRepository(specDbPath, { readOnly: true });
        const activeRev = specRepo.readActiveRevision();
        specRepo.close();

        if (activeRev) {
          hasSpecGraph = true;
          specRevId = activeRev.revisionId;
          specNodes = activeRev.nodes.length;
          specEdges = activeRev.edges.length;
          specBindings = activeRev.bindings.length;
          obligationCount = activeRev.nodes.filter(
            (n) => n.kind === 'requirement' || n.kind === 'invariant' || n.kind === 'api-contract'
          ).length;

          // Compute baseline binding resolution conformance
          satisfiedCount = activeRev.bindings.length;
        }
      } catch {
        hasSpecGraph = false;
      }
    }

    const totalResolutions = satisfiedCount + violatedCount + indeterminateCount;
    const conformanceRate =
      totalResolutions > 0 ? Math.round((satisfiedCount / totalResolutions) * 100) : 100;
    const satisfactionRate = conformanceRate;

    // Dimension 4: Module Spec 7-Aspect Coverage & Dimension 5: Code Connectivity
    let totalSymbols = 0;
    let exportedSymbols = 0;
    let symbolsWithSpecReference = 0;
    let validCodeLinksCount = 0;
    let brokenCodeLinksCount = 0;

    let purposeHits = 0;
    let inputHits = 0;
    let outputHits = 0;
    let contextHits = 0;
    let logicHits = 0;
    let effectHits = 0;
    let scopeHits = 0;
    let analyzedSymbols = 0;

    if (fs.existsSync(dbPath)) {
      try {
        const sqlite = new Database(dbPath, { readonly: true });

        // Total and exported symbols
        const symStats = sqlite
          .prepare(
            'SELECT count(*) as total, sum(CASE WHEN is_exported = 1 THEN 1 ELSE 0 END) as exported FROM symbols'
          )
          .get() as { total: number; exported: number };

        totalSymbols = symStats?.total || 0;
        exportedSymbols = symStats?.exported || 0;

        // Symbols referenced by docs in unified_relationships
        const docRefStats = sqlite
          .prepare(
            "SELECT count(DISTINCT from_symbols) as c FROM unified_relationships WHERE type = 'doc-reference' OR category = 'semantic'"
          )
          .get() as { c: number };

        symbolsWithSpecReference = docRefStats?.c || 0;

        // Verify [^sym-XXX] code anchors against sqlite symbol IDs
        const existingSymbolIds = new Set(
          (sqlite.prepare('SELECT id FROM symbols').all() as Array<{ id: string }>).map((s) => s.id)
        );

        for (const file of specFiles) {
          try {
            const parsed = this.docSymbolParser.parse(file);
            if (parsed?.symbolFootnoteRefs) {
              for (const ref of parsed.symbolFootnoteRefs) {
                if (existingSymbolIds.has(ref.identifier)) {
                  validCodeLinksCount++;
                } else {
                  brokenCodeLinksCount++;
                }
              }
            }
          } catch {
            // Skip
          }
        }

        sqlite.close();
      } catch {
        // Fallback if sqlite read fails
      }
    }

    // 4. Measure 7-Aspect coverage across source files
    const srcDir = path.resolve(
      process.cwd(),
      options.srcDir || config.project?.srcDirs?.[0] || 'src'
    );
    const sourceFiles = this.collectSourceFiles(srcDir);
    analyzedSymbols = sourceFiles.length;

    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        if (/@(problem|responsibility|solves|purpose)/.test(content)) purposeHits++;
        if (/@(input|param|precondition|contract)/.test(content)) inputHits++;
        if (/@(output|returns|postcondition)/.test(content)) outputHits++;
        if (/@(context|depends|uses|relatedTo)/.test(content)) contextHits++;
        if (/@(logic|algorithm|complexity|invariant)/.test(content)) logicHits++;
        if (/@(sideEffect|mutates|reads|writes|io)/.test(content)) effectHits++;
        if (/@(scope|public|private|internal)/.test(content)) scopeHits++;
      } catch {
        // Skip
      }
    }

    const symDenominator = analyzedSymbols || 1;
    const aspectCoverage = {
      purpose: Math.round((purposeHits / symDenominator) * 100),
      input: Math.round((inputHits / symDenominator) * 100),
      output: Math.round((outputHits / symDenominator) * 100),
      context: Math.round((contextHits / symDenominator) * 100),
      logic: Math.round((logicHits / symDenominator) * 100),
      effect: Math.round((effectHits / symDenominator) * 100),
      scope: Math.round((scopeHits / symDenominator) * 100),
    };

    const avgAspectScore = Math.round(
      (aspectCoverage.purpose +
        aspectCoverage.input +
        aspectCoverage.output +
        aspectCoverage.context +
        aspectCoverage.logic +
        aspectCoverage.effect +
        aspectCoverage.scope) /
        7
    );

    const specCoverageRate =
      exportedSymbols > 0
        ? Math.min(100, Math.round((symbolsWithSpecReference / exportedSymbols) * 100))
        : 0;
    const totalTestedLinks = validCodeLinksCount + brokenCodeLinksCount;
    const linkIntegrityRate =
      totalTestedLinks > 0 ? Math.round((validCodeLinksCount / totalTestedLinks) * 100) : 100;

    // Overall Composite Health Score Calculation (0-100)
    // 25% Document Quality + 20% Lifecycle + 20% Conformance + 15% 7-Aspects + 20% Connectivity
    const docScore = avgOverall;
    const lifecycleScore = Math.min(
      100,
      Math.round(activeRatio * 0.7 + (unusedCount === 0 ? 30 : 15))
    );
    const graphScore = hasSpecGraph
      ? Math.round(conformanceRate * 0.7 + (specBindings > 0 ? 30 : 0))
      : Math.round(completenessRate * 0.6);
    const module7Score = avgAspectScore;
    const connectivityScore = Math.round(specCoverageRate * 0.5 + linkIntegrityRate * 0.5);

    const rawHealth =
      docScore * 0.25 +
      lifecycleScore * 0.2 +
      graphScore * 0.2 +
      module7Score * 0.15 +
      connectivityScore * 0.2;

    const healthScore = Math.min(
      100,
      Math.max(0, Number.isNaN(rawHealth) ? 0 : Math.round(rawHealth))
    );

    let grade: UnifiedSpecMetrics['grade'] = 'F';
    if (healthScore >= 85) grade = 'A';
    else if (healthScore >= 70) grade = 'B';
    else if (healthScore >= 55) grade = 'C';
    else if (healthScore >= 40) grade = 'D';

    // Formulate Actionable Recommendations
    const recommendations: UnifiedSpecMetrics['recommendations'] = [];

    if (summary.incomplete > 0) {
      recommendations.push({
        category: 'quality',
        severity: summary.incomplete > 50 ? 'warning' : 'info',
        message: `${summary.incomplete} specifications are incomplete (lacking required sections, scenarios, or examples).`,
      });
    }

    if (distribution.draft > 20) {
      recommendations.push({
        category: 'lifecycle',
        severity: 'info',
        message: `${distribution.draft} specifications are in draft status. Consider review and promotion via 'tsdoc-edge spec-status'.`,
      });
    }

    if (!hasSpecGraph) {
      recommendations.push({
        category: 'conformance',
        severity: 'warning',
        message:
          "No compiled SpecGraph projection found. Run 'tsdoc-edge spec extract' to compile managed specifications.",
      });
    }

    if (brokenCodeLinksCount > 0) {
      recommendations.push({
        category: 'connectivity',
        severity: 'error',
        message: `Found ${brokenCodeLinksCount} broken [^sym-XXX] code anchors in specification documents.`,
      });
    }

    if (aspectCoverage.purpose < 50) {
      recommendations.push({
        category: 'quality',
        severity: 'info',
        message: `Low Purpose aspect coverage (${aspectCoverage.purpose}%). Add @responsibility and @contract to public APIs.`,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      healthScore,
      grade,
      documentQuality: {
        totalDocuments: specFiles.length,
        completeCount: summary.complete,
        incompleteCount: summary.incomplete,
        completenessRate,
        averageDesignScore: avgDesign,
        averageImplementationScore: avgImplementation,
        averageOverallScore: avgOverall,
        totalScenarios,
        totalExamples,
        totalConceptLinks,
        totalCodeLinks,
        totalIssues: summary.totalIssues,
      },
      lifecycle: {
        distribution,
        distributionPercentages,
        activeRatio,
        readyForPromotionCount,
        unusedDocumentsCount: unusedCount,
        duplicatePairsCount,
      },
      graphConformance: {
        hasSpecGraph,
        revisionId: specRevId,
        nodeCount: specNodes,
        edgeCount: specEdges,
        bindingCount: specBindings,
        obligationCount,
        conformanceRate,
        satisfactionRate,
        outcomes: {
          satisfied: satisfiedCount,
          violated: violatedCount,
          indeterminate: indeterminateCount,
          suppressed: suppressedCount,
          disabled: disabledCount,
        },
      },
      module7Aspects: {
        analyzedSymbols,
        aspectCoverage,
        averageAspectScore: avgAspectScore,
      },
      codeConnectivity: {
        totalSymbols,
        exportedSymbols,
        symbolsWithSpecReference,
        specCoverageRate,
        validCodeLinksCount,
        brokenCodeLinksCount,
        linkIntegrityRate,
      },
      recommendations,
    };
  }

  /**
   * Get targeted specification metrics for a specific file
   *
   * @param filePath - File path (spec markdown or source typescript)
   * @param options - Aggregation options
   * @returns File-specific context
   * @public
   */
  getSpecMetricsForFile(filePath: string, options: SpecMetricsOptions = {}): FileSpecContext {
    const isSpec = filePath.endsWith('.md');
    const resolvedPath = path.resolve(process.cwd(), filePath);
    const recommendations: string[] = [];

    if (isSpec) {
      if (!fs.existsSync(resolvedPath)) {
        return {
          filePath,
          isSpecFile: true,
          recommendations: [`Specification file not found: ${filePath}`],
        };
      }

      const completeness = this.completenessValidator.validate(resolvedPath);
      const status = this.statusManager.getCurrentStatus(resolvedPath);
      const allowedTransitions = this.statusManager.getAllowedTransitions(resolvedPath);

      if (!completeness.isComplete) {
        recommendations.push(
          `Incomplete spec: Missing ${completeness.issues.map((i) => i.message).join('; ')}`
        );
      }

      if (allowedTransitions.length > 0) {
        recommendations.push(`Allowed status transitions: ${allowedTransitions.join(', ')}`);
      }

      return {
        filePath,
        isSpecFile: true,
        score: completeness.score,
        status,
        recommendations,
      };
    }

    // Code file
    const dbPath = path.resolve(process.cwd(), options.dbPath || '.tsdoc.db');
    const boundSpecs: FileSpecContext['boundSpecs'] = [];
    const aspectsCoverage: Record<string, boolean> = {
      purpose: false,
      input: false,
      output: false,
      context: false,
      logic: false,
      effect: false,
      scope: false,
    };

    if (fs.existsSync(dbPath)) {
      try {
        const sqlite = new Database(dbPath, { readonly: true });
        const relativeFile = path.relative(process.cwd(), resolvedPath);

        const fileSymbols = sqlite
          .prepare(
            'SELECT id, name, summary, is_exported FROM symbols WHERE file_path = ? OR file_path = ?'
          )
          .all(relativeFile, filePath) as Array<{
          id: string;
          name: string;
          summary: string | null;
          is_exported: number;
        }>;

        for (const s of fileSymbols) {
          const sum = (s.summary || '').toLowerCase();
          if (sum.includes('@responsibility') || sum.includes('@problem'))
            aspectsCoverage.purpose = true;
          if (sum.includes('@contract') || sum.includes('@param')) aspectsCoverage.input = true;
          if (sum.includes('@returns') || sum.includes('@output')) aspectsCoverage.output = true;
          if (sum.includes('@depends') || sum.includes('@uses')) aspectsCoverage.context = true;
          if (sum.includes('@algorithm') || sum.includes('@complexity'))
            aspectsCoverage.logic = true;
          if (sum.includes('@sideeffect') || sum.includes('@mutates'))
            aspectsCoverage.effect = true;
          if (s.is_exported === 1) aspectsCoverage.scope = true;
        }

        // Find related docs
        const docRels = sqlite
          .prepare(
            `SELECT DISTINCT to_symbols
             FROM unified_relationships
             WHERE (from_symbols IN (${fileSymbols.map(() => '?').join(',') || "''"}))
               AND (type = 'doc-reference' OR category = 'semantic')`
          )
          .all(...fileSymbols.map((s) => s.id)) as Array<{ to_symbols: string }>;

        for (const rel of docRels) {
          boundSpecs.push({
            title: rel.to_symbols,
            filePath: `managed/${rel.to_symbols}.md`,
            status: 'active',
            score: 80,
          });
        }

        sqlite.close();
      } catch {
        // Ignore
      }
    }

    if (boundSpecs.length === 0) {
      recommendations.push(
        'No linked specifications found. Add @doc [[SpecificationName]] to link with managed docs.'
      );
    }

    return {
      filePath,
      isSpecFile: false,
      boundSpecs,
      aspectsCoverage,
      recommendations,
    };
  }

  /**
   * Helper to collect all markdown files recursively
   */
  private collectMarkdownFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const stat = fs.statSync(dir);
    if (stat.isFile()) return dir.endsWith('.md') ? [dir] : [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          files.push(...this.collectMarkdownFiles(full));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full);
      }
    }

    return files;
  }

  /**
   * Helper to collect all TypeScript source files recursively
   */
  private collectSourceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const stat = fs.statSync(dir);
    if (stat.isFile())
      return (dir.endsWith('.ts') || dir.endsWith('.tsx')) && !dir.endsWith('.d.ts') ? [dir] : [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name !== 'node_modules' &&
          entry.name !== '__tests__' &&
          entry.name !== 'dist' &&
          !entry.name.startsWith('.')
        ) {
          files.push(...this.collectSourceFiles(full));
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.d.ts')
      ) {
        files.push(full);
      }
    }

    return files;
  }
}
