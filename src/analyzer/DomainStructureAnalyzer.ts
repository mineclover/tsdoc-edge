/**
 * Analyzes domain structure from interfaces
 * @packageDocumentation
 */

import type {
  DomainStructure,
  InterfaceDependency,
  InterfaceDependencyGraph,
  InterfaceInfo,
} from '../types/domain';

/**
 * Analyzes domain structure for domain-driven development
 *
 * @doc [[DomainStructureAnalyzer]]
 * @public
 * @responsibility Analyze domain boundaries and cohesion
 * @contract Calculate cohesion and coupling metrics for domains
 */
export class DomainStructureAnalyzer {
  /**
   * Analyze domain structure from dependency graph
   *
   * @param graph - Interface dependency graph
   * @returns Updated graph with domain structures
   * @public
   */
  analyzeDomains(graph: InterfaceDependencyGraph): InterfaceDependencyGraph {
    const domains = new Map<string, DomainStructure>();

    // Group interfaces by domain
    const domainInterfaces = new Map<string, InterfaceInfo[]>();

    for (const iface of graph.interfaces.values()) {
      const domain = iface.domain || 'unknown';

      if (!domainInterfaces.has(domain)) {
        domainInterfaces.set(domain, []);
      }

      domainInterfaces.get(domain)?.push(iface);
    }

    // Analyze each domain
    for (const [domainName, interfaces] of domainInterfaces.entries()) {
      const domainStructure = this.analyzeDomain(domainName, interfaces, graph);
      domains.set(domainName, domainStructure);
    }

    return {
      ...graph,
      domains,
    };
  }

  /**
   * Analyze a single domain
   *
   * @param domainName - Domain name
   * @param interfaces - Interfaces in this domain
   * @param graph - Complete dependency graph
   * @returns Domain structure analysis
   */
  private analyzeDomain(
    domainName: string,
    interfaces: InterfaceInfo[],
    graph: InterfaceDependencyGraph
  ): DomainStructure {
    const interfaceNames = new Set(interfaces.map((i) => i.symbol.name));

    // Split dependencies into internal and external
    const internalDependencies: InterfaceDependency[] = [];
    const externalDependencies: InterfaceDependency[] = [];

    for (const dep of graph.dependencies) {
      if (interfaceNames.has(dep.from)) {
        if (interfaceNames.has(dep.to)) {
          internalDependencies.push(dep);
        } else {
          externalDependencies.push(dep);
        }
      }
    }

    // Calculate cohesion score
    const cohesionScore = this.calculateCohesion(interfaces, internalDependencies);

    // Calculate coupling score
    const couplingScore = this.calculateCoupling(interfaces, externalDependencies);

    return {
      domainName,
      interfaces,
      internalDependencies,
      externalDependencies,
      cohesionScore,
      couplingScore,
    };
  }

  /**
   * Calculate domain cohesion score
   *
   * High cohesion means interfaces within the domain are well connected
   *
   * @param interfaces - Domain interfaces
   * @param internalDeps - Internal dependencies
   * @returns Cohesion score (0-1)
   */
  private calculateCohesion(
    interfaces: InterfaceInfo[],
    internalDeps: InterfaceDependency[]
  ): number {
    if (interfaces.length <= 1) {
      return 1.0; // Single interface domain is perfectly cohesive
    }

    // Maximum possible connections in a fully connected graph
    const maxConnections = (interfaces.length * (interfaces.length - 1)) / 2;

    if (maxConnections === 0) {
      return 1.0;
    }

    // Count unique interface pairs that have dependencies
    const connectedPairs = new Set<string>();

    for (const dep of internalDeps) {
      const pair = [dep.from, dep.to].sort().join('->');
      connectedPairs.add(pair);
    }

    // Cohesion = actual connections / max possible connections
    return connectedPairs.size / maxConnections;
  }

  /**
   * Calculate domain coupling score
   *
   * Lower coupling means less dependency on other domains (better)
   *
   * @param interfaces - Domain interfaces
   * @param externalDeps - External dependencies
   * @returns Coupling score (0-1), lower is better
   */
  private calculateCoupling(
    interfaces: InterfaceInfo[],
    externalDeps: InterfaceDependency[]
  ): number {
    if (interfaces.length === 0) {
      return 0;
    }

    // Count unique external interfaces referenced
    const externalInterfaces = new Set(externalDeps.map((d) => d.to));

    // Coupling = external interfaces / total interfaces in domain
    // Normalized to 0-1 range (capped at 1.0)
    const coupling = externalInterfaces.size / interfaces.length;

    return Math.min(coupling, 1.0);
  }

  /**
   * Generate domain boundary report
   *
   * @param graph - Interface dependency graph with domains
   * @returns Markdown report
   * @public
   */
  generateDomainReport(graph: InterfaceDependencyGraph): string {
    let report = '# Domain Structure Analysis\n\n';

    if (graph.domains.size === 0) {
      report += 'No domains found.\n';
      return report;
    }

    report += `## Overview\n\n`;
    report += `Total Domains: ${graph.domains.size}\n`;
    report += `Total Interfaces: ${graph.interfaces.size}\n\n`;

    // Summary table
    report += '| Domain | Interfaces | Cohesion | Coupling | Quality |\n';
    report += '|--------|------------|----------|----------|----------|\n';

    const sortedDomains = Array.from(graph.domains.values()).sort(
      (a, b) => b.cohesionScore - a.cohesionScore
    );

    for (const domain of sortedDomains) {
      const quality = this.getDomainQuality(domain.cohesionScore, domain.couplingScore);
      report += `| ${domain.domainName} | ${domain.interfaces.length} | ${(domain.cohesionScore * 100).toFixed(0)}% | ${(domain.couplingScore * 100).toFixed(0)}% | ${quality} |\n`;
    }

    report += '\n';

    // Detailed analysis for each domain
    for (const domain of sortedDomains) {
      report += `## Domain: ${domain.domainName}\n\n`;
      report += `**Cohesion Score:** ${(domain.cohesionScore * 100).toFixed(1)}% ${this.getCohesionLevel(domain.cohesionScore)}\n\n`;
      report += `**Coupling Score:** ${(domain.couplingScore * 100).toFixed(1)}% ${this.getCouplingLevel(domain.couplingScore)}\n\n`;

      // Interfaces by role
      report += '### Interfaces by Role\n\n';
      const byRole = new Map<string, InterfaceInfo[]>();

      for (const iface of domain.interfaces) {
        const role = iface.domainRole || 'Unknown';
        if (!byRole.has(role)) {
          byRole.set(role, []);
        }
        byRole.get(role)?.push(iface);
      }

      for (const [role, interfaces] of Array.from(byRole.entries()).sort()) {
        report += `**${role}** (${interfaces.length}):\n`;
        for (const iface of interfaces) {
          report += `- \`${iface.symbol.name}\` - ${iface.symbol.filePath}:${iface.symbol.line}\n`;
        }
        report += '\n';
      }

      // Internal dependencies
      if (domain.internalDependencies.length > 0) {
        report += '### Internal Dependencies\n\n';
        report += `${domain.internalDependencies.length} dependencies within domain:\n\n`;

        const depsByType = new Map<string, InterfaceDependency[]>();
        for (const dep of domain.internalDependencies) {
          if (!depsByType.has(dep.dependencyType)) {
            depsByType.set(dep.dependencyType, []);
          }
          depsByType.get(dep.dependencyType)?.push(dep);
        }

        for (const [type, deps] of depsByType.entries()) {
          report += `**${type}** (${deps.length}):\n`;
          for (const dep of deps.slice(0, 10)) {
            // Limit to 10
            const via = dep.via ? ` (via ${dep.via})` : '';
            report += `- ${dep.from} → ${dep.to}${via}\n`;
          }
          if (deps.length > 10) {
            report += `- ... and ${deps.length - 10} more\n`;
          }
          report += '\n';
        }
      }

      // External dependencies
      if (domain.externalDependencies.length > 0) {
        report += '### External Dependencies\n\n';
        report += `${domain.externalDependencies.length} dependencies to other domains:\n\n`;

        // Group by target interface
        const externalTargets = new Map<string, number>();
        for (const dep of domain.externalDependencies) {
          externalTargets.set(dep.to, (externalTargets.get(dep.to) || 0) + 1);
        }

        const sortedTargets = Array.from(externalTargets.entries()).sort((a, b) => b[1] - a[1]);

        for (const [target, count] of sortedTargets.slice(0, 10)) {
          report += `- ${target}: ${count} reference(s)\n`;
        }

        if (sortedTargets.length > 10) {
          report += `- ... and ${sortedTargets.length - 10} more\n`;
        }

        report += '\n';
      }

      report += '---\n\n';
    }

    // Recommendations
    report += '## Recommendations\n\n';

    for (const domain of sortedDomains) {
      const issues: string[] = [];

      if (domain.cohesionScore < 0.3) {
        issues.push(
          `Low cohesion (${(domain.cohesionScore * 100).toFixed(0)}%) - Consider splitting or better organizing interfaces`
        );
      }

      if (domain.couplingScore > 0.7) {
        issues.push(
          `High coupling (${(domain.couplingScore * 100).toFixed(0)}%) - Too many external dependencies`
        );
      }

      if (domain.interfaces.length > 20) {
        issues.push(
          `Large domain (${domain.interfaces.length} interfaces) - Consider splitting into sub-domains`
        );
      }

      if (issues.length > 0) {
        report += `### ${domain.domainName}\n\n`;
        for (const issue of issues) {
          report += `- ⚠️ ${issue}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }

  /**
   * Get domain quality assessment
   *
   * @param cohesion - Cohesion score
   * @param coupling - Coupling score
   * @returns Quality label
   */
  private getDomainQuality(cohesion: number, coupling: number): string {
    // High cohesion, low coupling = Good
    // Low cohesion, high coupling = Bad

    const score = cohesion - coupling;

    if (score > 0.5) return '✅ Excellent';
    if (score > 0.2) return '👍 Good';
    if (score > -0.2) return '⚠️ Fair';
    return '❌ Poor';
  }

  /**
   * Get cohesion level description
   *
   * @param cohesion - Cohesion score
   * @returns Description
   */
  private getCohesionLevel(cohesion: number): string {
    if (cohesion >= 0.7) return '(High - Well connected)';
    if (cohesion >= 0.4) return '(Medium - Moderately connected)';
    return '(Low - Loosely connected)';
  }

  /**
   * Get coupling level description
   *
   * @param coupling - Coupling score
   * @returns Description
   */
  private getCouplingLevel(coupling: number): string {
    if (coupling >= 0.7) return '(High - Too many external dependencies)';
    if (coupling >= 0.4) return '(Medium - Moderate external dependencies)';
    return '(Low - Well isolated)';
  }
}
