/**
 * Naming Pattern Relation Analyzer
 * @packageDocumentation
 * @responsibility Detect domain relationships based on naming conventions
 *
 * @purpose Group symbols by shared domain prefix
 * @input Symbol graph with symbol names
 * @output naming-pattern-relation relationships
 * @logic Extract domain prefix, create pairwise relationships
 * @scope Public API for relationship extraction
 *
 * @example
 * Input symbols: DatabaseManager, DatabaseConfig, DatabaseConnection
 * Output relationships:
 *   DatabaseManager ~ DatabaseConfig (naming-pattern)
 *   DatabaseManager ~ DatabaseConnection (naming-pattern)
 *   DatabaseConfig ~ DatabaseConnection (naming-pattern)
 */

import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Domain grouping site
 * @private
 */
interface DomainGroupingSite {
  symbolA: string;
  symbolB: string;
  domain: string;
  filePath: string;
  line: number;
}

/**
 * Analyzes naming pattern relationships
 *
 * @public
 * @responsibility Detect domain-based grouping from symbol names
 *
 * Algorithm:
 * 1. Extract domain prefix from symbol names (remove common suffixes)
 * 2. Group symbols by domain prefix
 * 3. Create pairwise relationships within each domain
 *
 * @example
 * ```typescript
 * // Symbols in graph:
 * UserService, UserRepository, UserController
 *
 * // Domain extracted: "User"
 * // Relationships created:
 * UserService ~ UserRepository (domain: User)
 * UserService ~ UserController (domain: User)
 * UserRepository ~ UserController (domain: User)
 * ```
 */
export class NamingPatternRelationAnalyzer {
  private graph: SymbolGraph;

  /**
   * Create naming pattern analyzer
   *
   * @param graph - Symbol graph to analyze
   */
  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze naming pattern relationships
   *
   * @returns Array of naming-pattern-relation relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const sites = this.detectDomainGroupings();

    for (const site of sites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Detect domain groupings from symbol names
   *
   * @returns Array of domain grouping sites
   * @private
   */
  private detectDomainGroupings(): DomainGroupingSite[] {
    const sites: DomainGroupingSite[] = [];
    const symbolsByDomain = new Map<string, any[]>();

    // Group symbols by domain prefix
    for (const symbol of this.graph.symbols.values()) {
      const domain = this.extractDomain(symbol.name);
      if (domain) {
        if (!symbolsByDomain.has(domain)) {
          symbolsByDomain.set(domain, []);
        }
        symbolsByDomain.get(domain)!.push(symbol);
      }
    }

    // Create pairwise relationships within each domain
    for (const [domain, symbols] of symbolsByDomain.entries()) {
      if (symbols.length >= 2) {
        for (let i = 0; i < symbols.length; i++) {
          for (let j = i + 1; j < symbols.length; j++) {
            sites.push({
              symbolA: symbols[i].id,
              symbolB: symbols[j].id,
              domain,
              filePath: symbols[i].filePath,
              line: symbols[i].line,
            });
          }
        }
      }
    }

    return sites;
  }

  /**
   * Extract domain from symbol name
   *
   * @param name - Symbol name
   * @returns Domain prefix or null
   * @private
   *
   * @example
   * extractDomain('UserService') → 'User'
   * extractDomain('DatabaseManager') → 'Database'
   * extractDomain('AuthController') → 'Auth'
   */
  private extractDomain(name: string): string | null {
    // Common suffixes to remove
    const suffixes = [
      'Service',
      'Controller',
      'Repository',
      'Manager',
      'Handler',
      'Helper',
      'Util',
      'Factory',
      'Builder',
      'Provider',
      'Adapter',
      'Validator',
      'Parser',
      'Generator',
      'Analyzer',
      'Extractor',
      'Collector',
      'Processor',
    ];

    let domain = name;

    // Remove suffix if present
    for (const suffix of suffixes) {
      if (domain.endsWith(suffix)) {
        domain = domain.slice(0, -suffix.length);
        break;
      }
    }

    // Domain must be at least 3 characters
    if (domain.length >= 3) {
      return domain;
    }

    return null;
  }

  /**
   * Create naming-pattern-relation relationship
   *
   * @param site - Domain grouping site
   * @returns Unified relationship
   * @private
   */
  private createRelationship(site: DomainGroupingSite): UnifiedRelationship {
    const timestamp = new Date().toISOString();
    const relationshipId = `naming-pattern-${site.symbolA}-${site.symbolB}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    return {
      id: relationshipId,
      type: 'naming-pattern-relation',
      from: site.symbolA,
      to: site.symbolB,
      direction: 'undirected',
      strength: 'medium',
      category: 'semantic',
      evidence: [
        {
          type: 'code',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `Shared domain: ${site.domain}`,
          confidence: 0.7,
          context: `Both symbols belong to ${site.domain} domain`
        }
      ],
      discoveredBy: 'static-analysis',
      confidence: 0.7,
      filePath: site.filePath,
      line: site.line,
      properties: {
        domain: site.domain,
        detectionMethod: 'naming-pattern',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.symbolA} ~ ${site.symbolB} (${site.domain} domain)`
    };
  }

  /**
   * Get statistics about detected domain groupings
   *
   * @param relationships - Naming pattern relationships
   * @returns Statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    uniqueDomains: number;
    domainCounts: Record<string, number>;
    averageGroupSize: number;
  } {
    const domains = new Set<string>();
    const domainCounts: Record<string, number> = {};

    for (const rel of relationships) {
      const domain = rel.properties?.domain;
      if (domain) {
        domains.add(domain);
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    }

    const totalSymbolsInDomains = Object.values(domainCounts).reduce((sum, count) => sum + count, 0);
    const averageGroupSize = domains.size > 0 ? totalSymbolsInDomains / domains.size : 0;

    return {
      total: relationships.length,
      uniqueDomains: domains.size,
      domainCounts,
      averageGroupSize,
    };
  }
}
