/**
 * Analyzer Registry
 * Provides unified access to all relationship analyzers
 * @packageDocumentation
 */

import type { AnalyzerContext, AnalyzerMetadata, AnalyzerType, RelationshipAnalyzer } from './types';
import type { UnifiedRelationship } from '../types/relationships';

// Import existing analyzers
import { AlternativesAnalyzer } from './AlternativesAnalyzer';
import { BehavioralAnalyzer } from './BehavioralAnalyzer';
import { CallbackAnalyzer } from './CallbackAnalyzer';
import { CallGraphAnalyzer } from './CallGraphAnalyzer';
import { CollaborationAnalyzer } from './CollaborationAnalyzer';
import { CompositionAnalyzer } from './CompositionAnalyzer';
import { ConstraintAnalyzer } from './ConstraintAnalyzer';
import { DependencyChainAnalyzer } from './DependencyChainAnalyzer';
import { DocReferenceAnalyzer } from './DocReferenceAnalyzer';
import { EnhancementAnalyzer } from './EnhancementAnalyzer';
import { EventFlowAnalyzer } from './EventFlowAnalyzer';
import { FallbackAnalyzer } from './FallbackAnalyzer';
import { IODependencyAnalyzer } from './IODependencyAnalyzer';
import { LayerDependencyAnalyzer } from './LayerDependencyAnalyzer';
import { ImplementationAnalyzer } from './ImplementationAnalyzer';
import { SubstitutionAnalyzer } from './SubstitutionAnalyzer';
import { TemporalOrderAnalyzer } from './TemporalOrderAnalyzer';
import { TestCoverageUnifier } from './TestCoverageUnifier';
import { TypeDependencyAnalyzer } from './TypeDependencyAnalyzer';

/**
 * Wrapper to adapt existing analyzers to common interface
 */
class AnalyzerAdapter implements RelationshipAnalyzer {
  constructor(
    public readonly name: string,
    public readonly type: string,
    public readonly category: string,
    public readonly description: string,
    private readonly analyzeFunc: (ctx: AnalyzerContext) => UnifiedRelationship[]
  ) {}

  /**
   * Run analysis and return relationships
   * @param context - Analysis context with graph and program
   * @returns Array of discovered relationships
   */
  analyze(context: AnalyzerContext): UnifiedRelationship[] {
    return this.analyzeFunc(context);
  }
}

/**
 * Analyzer metadata definitions
 */
const ANALYZER_METADATA: Record<AnalyzerType, AnalyzerMetadata> = {
  alternatives: {
    type: 'alternatives',
    name: 'Alternatives',
    description: 'Substitution and fallback patterns',
    category: 'alternative',
    requires: ['graph', 'program'],
  },
  behavioral: {
    type: 'behavioral',
    name: 'Behavioral',
    description: 'Collaboration, composition, temporal-order',
    category: 'behavioral',
    requires: ['graph', 'program'],
  },
  callbacks: {
    type: 'callbacks',
    name: 'Callbacks',
    description: 'Callback registration patterns',
    category: 'behavioral',
    requires: ['graph', 'program'],
  },
  calls: {
    type: 'calls',
    name: 'Calls',
    description: 'Function/method call relationships',
    category: 'behavioral',
    requires: ['graph', 'program'],
  },
  chains: {
    type: 'chains',
    name: 'Chains',
    description: 'Dependency chains and circular detection',
    category: 'structural',
    requires: ['graph'],
  },
  collaboration: {
    type: 'collaboration',
    name: 'Collaboration',
    description: 'Multi-symbol collaboration patterns',
    category: 'behavioral',
    requires: ['graph'],
  },
  composition: {
    type: 'composition',
    name: 'Composition',
    description: 'Feature composition relationships',
    category: 'behavioral',
    requires: ['graph', 'program'],
  },
  constraints: {
    type: 'constraints',
    name: 'Constraints',
    description: 'Mutual-exclusion, co-requirement',
    category: 'constraint',
    requires: ['graph', 'program'],
  },
  'doc-reference': {
    type: 'doc-reference',
    name: 'Doc Reference',
    description: 'Documentation symbol references',
    category: 'semantic',
    requires: ['graph'],
  },
  enhancement: {
    type: 'enhancement',
    name: 'Enhancement',
    description: 'Enhancement relationships',
    category: 'semantic',
    requires: ['graph'],
  },
  events: {
    type: 'events',
    name: 'Events',
    description: 'Event flow patterns',
    category: 'data-flow',
    requires: ['graph', 'program'],
  },
  fallback: {
    type: 'fallback',
    name: 'Fallback',
    description: 'Fallback patterns',
    category: 'alternative',
    requires: ['graph', 'program'],
  },
  io: {
    type: 'io',
    name: 'I/O',
    description: 'Input/output dependencies',
    category: 'data-flow',
    requires: ['graph'],
  },
  'layer-dependency': {
    type: 'layer-dependency',
    name: 'Layer Dependency',
    description: 'Architectural layer violations',
    category: 'architectural',
    requires: ['graph'],
  },
  structural: {
    type: 'structural',
    name: 'Structural',
    description: 'Code dependencies, inheritance',
    category: 'structural',
    requires: ['graph', 'program'],
  },
  substitution: {
    type: 'substitution',
    name: 'Substitution',
    description: 'Interface substitution patterns',
    category: 'alternative',
    requires: ['graph'],
  },
  'temporal-order': {
    type: 'temporal-order',
    name: 'Temporal Order',
    description: 'Execution order dependencies',
    category: 'behavioral',
    requires: ['graph', 'program'],
  },
  tests: {
    type: 'tests',
    name: 'Tests',
    description: 'Test coverage relationships',
    category: 'verification',
    requires: ['graph', 'db'],
  },
  types: {
    type: 'types',
    name: 'Types',
    description: 'Type dependencies and generics',
    category: 'type-system',
    requires: ['graph', 'program'],
  },
};

/**
 * Analyzer Registry
 * Provides unified access to all relationship analyzers
 * @public
 */
export class AnalyzerRegistry {
  private static instance: AnalyzerRegistry;

  private constructor() {}

  static getInstance(): AnalyzerRegistry {
    if (!AnalyzerRegistry.instance) {
      AnalyzerRegistry.instance = new AnalyzerRegistry();
    }
    return AnalyzerRegistry.instance;
  }

  /**
   * Get all available analyzer types
   */
  getTypes(): AnalyzerType[] {
    return Object.keys(ANALYZER_METADATA) as AnalyzerType[];
  }

  /**
   * Get metadata for an analyzer type
   * @param type - The analyzer type
   * @returns Metadata or undefined if not found
   */
  getMetadata(type: AnalyzerType): AnalyzerMetadata | undefined {
    return ANALYZER_METADATA[type];
  }

  /**
   * Get all metadata grouped by category
   */
  getMetadataByCategory(): Map<string, AnalyzerMetadata[]> {
    const byCategory = new Map<string, AnalyzerMetadata[]>();

    for (const metadata of Object.values(ANALYZER_METADATA)) {
      if (!byCategory.has(metadata.category)) {
        byCategory.set(metadata.category, []);
      }
      byCategory.get(metadata.category)!.push(metadata);
    }

    return byCategory;
  }

  /**
   * Create an analyzer instance
   * @param type - The analyzer type
   * @param context - Analysis context
   * @returns Analyzer instance
   */
  create(type: AnalyzerType, context: AnalyzerContext): RelationshipAnalyzer {
    const metadata = ANALYZER_METADATA[type];
    if (!metadata) {
      throw new Error(`Unknown analyzer type: ${type}`);
    }

    // Validate required context
    for (const req of metadata.requires) {
      if (!context[req]) {
        throw new Error(`Analyzer '${type}' requires '${req}' in context`);
      }
    }

    // Create adapter wrapping existing analyzer
    return new AnalyzerAdapter(
      metadata.name,
      metadata.type,
      metadata.category,
      metadata.description,
      (ctx) => this.runAnalyzer(type, ctx)
    );
  }

  /**
   * Run a specific analyzer and return discovered relationships
   * @param type - The analyzer type to run
   * @param context - Analysis context with graph, program, and db
   * @returns Array of unified relationships discovered
   */
  analyze(type: AnalyzerType, context: AnalyzerContext): UnifiedRelationship[] {
    const analyzer = this.create(type, context);
    return analyzer.analyze(context);
  }

  /**
   * Run all analyzers
   * @param context - Analysis context
   * @returns All discovered relationships
   */
  analyzeAll(context: AnalyzerContext): UnifiedRelationship[] {
    const results: UnifiedRelationship[] = [];

    for (const type of this.getTypes()) {
      try {
        const metadata = ANALYZER_METADATA[type];
        // Check if context has required dependencies
        const hasRequired = metadata.requires.every(req => context[req]);
        if (hasRequired) {
          results.push(...this.runAnalyzer(type, context));
        }
      } catch (error) {
        // Skip analyzers that fail
        console.warn(`Analyzer '${type}' failed:`, error instanceof Error ? error.message : error);
      }
    }

    return results;
  }

  /**
   * Internal: Run specific analyzer
   */
  private runAnalyzer(type: AnalyzerType, ctx: AnalyzerContext): UnifiedRelationship[] {
    const { graph, program, dbManager } = ctx;

    switch (type) {
      case 'alternatives':
        return new AlternativesAnalyzer(graph, program).analyze();

      case 'behavioral':
        return new BehavioralAnalyzer(graph, program).analyze();

      case 'callbacks':
        return new CallbackAnalyzer(graph, program).analyze();

      case 'calls':
        return new CallGraphAnalyzer(graph, program).analyze();

      case 'chains':
        return new DependencyChainAnalyzer(graph).analyzeCircularDependencies();

      case 'collaboration':
        return new CollaborationAnalyzer(graph).analyze();

      case 'composition':
        return new CompositionAnalyzer(graph, program).analyze();

      case 'constraints':
        return new ConstraintAnalyzer(graph, ctx.projectRoot || process.cwd(), program).analyze();

      case 'doc-reference':
        return new DocReferenceAnalyzer(graph).analyze(ctx.projectRoot || process.cwd());

      case 'enhancement':
        return new EnhancementAnalyzer(graph).analyze(ctx.projectRoot || process.cwd());

      case 'events':
        return new EventFlowAnalyzer(graph, program).analyze();

      case 'fallback':
        return new FallbackAnalyzer(graph, program).analyze();

      case 'io':
        return new IODependencyAnalyzer(graph).analyze();

      case 'layer-dependency':
        return new LayerDependencyAnalyzer(graph).analyze();

      case 'structural':
        return new ImplementationAnalyzer(ctx.graph, ctx.program).analyze();

      case 'substitution':
        return new SubstitutionAnalyzer(graph).analyze();

      case 'temporal-order':
        return new TemporalOrderAnalyzer(graph, program).analyze();

      case 'tests':
        return new TestCoverageUnifier(graph, ctx.db!).analyze();

      case 'types':
        return new TypeDependencyAnalyzer(graph, program).analyze();

      default:
        return [];
    }
  }
}

/**
 * Get the singleton AnalyzerRegistry instance
 * @returns AnalyzerRegistry singleton
 */
export const getAnalyzerRegistry = () => AnalyzerRegistry.getInstance();
