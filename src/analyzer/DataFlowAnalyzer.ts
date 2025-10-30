/**
 * Analyzes data flow and transformation chains between interfaces
 * @packageDocumentation
 */

import type {
  DataFlowAnalysisResult,
  DataTransformationChain,
  DTOClassification,
  DTOPattern,
  TransformationPath,
  TransformationStep,
} from '../types/domain/data-flow';
import type {
  InterfaceDependency,
  InterfaceDependencyGraph,
  InterfaceInfo,
} from '../types/domain/interface';

/**
 * Analyzes data transformation flows and DTO patterns
 *
 * @public
 * @responsibility Track data transformation chains and validate DTO conventions
 * @contract Provide insights into data flow patterns and transformation chains
 */
export class DataFlowAnalyzer {
  /**
   * Analyze data flows in the interface graph
   *
   * @param graph - Interface dependency graph
   * @returns Data flow analysis result
   * @public
   */
  analyzeDataFlows(graph: InterfaceDependencyGraph): DataFlowAnalysisResult {
    const interfaces = Array.from(graph.interfaces.values());

    // Step 1: Classify DTOs
    const dtos = this.classifyDTOs(interfaces);

    // Step 2: Find transformation chains
    const transformationChains = this.findTransformationChains(graph, dtos);

    // Step 3: Find orphaned DTOs
    const orphanedDTOs = this.findOrphanedDTOs(dtos, transformationChains);

    // Step 4: Detect bidirectional transformations
    const bidirectionalTransformations = this.detectBidirectionalTransformations(graph);

    // Step 5: Calculate summary
    const summary = this.calculateSummary(dtos, transformationChains);

    return {
      timestamp: new Date().toISOString(),
      totalInterfaces: interfaces.length,
      dtos,
      transformationChains,
      orphanedDTOs,
      bidirectionalTransformations,
      summary,
    };
  }

  /**
   * Classify interfaces as DTOs based on naming patterns
   *
   * @param interfaces - Array of interfaces
   * @returns Array of DTO classifications
   */
  classifyDTOs(interfaces: InterfaceInfo[]): DTOClassification[] {
    const classifications: DTOClassification[] = [];

    for (const iface of interfaces) {
      const name = iface.symbol.name;
      const classification = this.classifyInterface(name, iface);
      classifications.push(classification);
    }

    return classifications.filter((c) => c.isDTO);
  }

  /**
   * Classify a single interface
   *
   * @param name - Interface name
   * @param iface - Interface info
   * @returns Classification result
   */
  private classifyInterface(name: string, iface: InterfaceInfo): DTOClassification {
    // Check suffix patterns
    const patterns: Array<{
      suffix: string;
      pattern: DTOPattern;
      role?: 'input' | 'output' | 'transfer';
    }> = [
      { suffix: 'DTO', pattern: 'suffix-dto', role: 'transfer' },
      { suffix: 'Request', pattern: 'suffix-request', role: 'input' },
      { suffix: 'Response', pattern: 'suffix-response', role: 'output' },
      { suffix: 'Payload', pattern: 'suffix-payload', role: 'input' },
      { suffix: 'Input', pattern: 'suffix-input', role: 'input' },
      { suffix: 'Output', pattern: 'suffix-output', role: 'output' },
      { suffix: 'Data', pattern: 'suffix-data', role: 'transfer' },
    ];

    for (const { suffix, pattern, role } of patterns) {
      if (name.endsWith(suffix)) {
        return {
          interfaceName: name,
          pattern,
          isDTO: true,
          confidence: 0.9,
          role,
        };
      }
    }

    // Check if it's a simple data structure (high property count, no methods)
    const propertyCount = iface.properties.length;
    const methodCount = iface.methods.length;

    if (
      propertyCount > 3 &&
      methodCount === 0 &&
      !name.endsWith('Options') &&
      !name.endsWith('Config')
    ) {
      return {
        interfaceName: name,
        pattern: 'unknown',
        isDTO: true,
        confidence: 0.5,
        role: 'transfer',
      };
    }

    return {
      interfaceName: name,
      pattern: 'unknown',
      isDTO: false,
      confidence: 0,
    };
  }

  /**
   * Find transformation chains in the graph
   *
   * @param graph - Interface dependency graph
   * @param dtos - Classified DTOs
   * @returns Array of transformation chains
   */
  findTransformationChains(
    graph: InterfaceDependencyGraph,
    dtos: DTOClassification[]
  ): DataTransformationChain[] {
    const chains: DataTransformationChain[] = [];
    const dtoNames = new Set(dtos.map((d) => d.interfaceName));

    // For each DTO, try to find transformation chains
    for (const dto of dtos) {
      const paths = this.findPathsFromInterface(dto.interfaceName, graph, 5); // Max depth 5

      for (const path of paths) {
        if (path.length > 1) {
          const chain = this.buildTransformationChain(path, graph, dtoNames);
          chains.push(chain);
        }
      }
    }

    // Remove duplicate chains
    return this.deduplicateChains(chains);
  }

  /**
   * Find all paths from an interface up to max depth
   *
   * @param startInterface - Starting interface name
   * @param graph - Interface dependency graph
   * @param maxDepth - Maximum path depth
   * @returns Array of paths (each path is an array of interface names)
   */
  private findPathsFromInterface(
    startInterface: string,
    graph: InterfaceDependencyGraph,
    maxDepth: number
  ): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[], depth: number) => {
      if (depth > maxDepth) {
        return;
      }

      if (visited.has(current)) {
        return;
      }

      visited.add(current);
      path.push(current);

      // Get all dependencies from current interface
      const deps = graph.dependencies.filter((d) => d.from === current);

      if (deps.length === 0) {
        // End of path
        if (path.length > 1) {
          paths.push([...path]);
        }
      } else {
        for (const dep of deps) {
          dfs(dep.to, path, depth + 1);
        }
      }

      path.pop();
      visited.delete(current);
    };

    dfs(startInterface, [], 0);

    return paths;
  }

  /**
   * Build transformation chain from path
   *
   * @param path - Array of interface names
   * @param graph - Interface dependency graph
   * @param dtoNames - Set of DTO names
   * @returns Transformation chain
   */
  private buildTransformationChain(
    path: string[],
    graph: InterfaceDependencyGraph,
    dtoNames: Set<string>
  ): DataTransformationChain {
    const steps: TransformationStep[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      const dependency = graph.dependencies.find((d) => d.from === from && d.to === to);

      if (dependency) {
        steps.push({
          from,
          to,
          transformer: dependency.via,
          dependency,
          stepNumber: i + 1,
        });
      }
    }

    const source = path[0];
    const destination = path[path.length - 1];

    const chainType = this.classifyChainType(source, destination, dtoNames);
    const { isValid, issues } = this.validateChain(steps, chainType);

    return {
      id: `${source}-to-${destination}`,
      source,
      destination,
      steps,
      length: steps.length,
      chainType,
      isValid,
      issues,
    };
  }

  /**
   * Classify chain type
   *
   * @param source - Source interface name
   * @param destination - Destination interface name
   * @param dtoNames - Set of DTO names
   * @returns Chain type
   */
  private classifyChainType(
    source: string,
    destination: string,
    dtoNames: Set<string>
  ): DataTransformationChain['chainType'] {
    const sourceIsDTO = dtoNames.has(source);
    const destIsDTO = dtoNames.has(destination);

    if (sourceIsDTO && !destIsDTO) {
      return 'dto-to-entity';
    }
    if (!sourceIsDTO && destIsDTO) {
      return 'entity-to-dto';
    }
    if (sourceIsDTO && destIsDTO) {
      return 'dto-to-dto';
    }
    if (!sourceIsDTO && !destIsDTO) {
      return 'entity-to-entity';
    }

    return 'unknown';
  }

  /**
   * Validate transformation chain
   *
   * @param steps - Transformation steps
   * @param chainType - Chain type
   * @returns Validation result
   */
  private validateChain(
    steps: TransformationStep[],
    chainType: DataTransformationChain['chainType']
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for bidirectional dependencies in chain
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        if (steps[i].from === steps[j].to && steps[i].to === steps[j].from) {
          issues.push(`Bidirectional dependency detected: ${steps[i].from} ↔ ${steps[i].to}`);
        }
      }
    }

    // Check data flow consistency
    for (const step of steps) {
      if (step.dependency.dataFlow === 'bidirectional') {
        issues.push(`Bidirectional data flow in step: ${step.from} → ${step.to}`);
      }
    }

    // Check chain type validity
    if (chainType === 'entity-to-entity' && steps.length > 3) {
      issues.push('Entity-to-entity transformation chain is too long (> 3 steps)');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Deduplicate transformation chains
   *
   * @param chains - Array of chains
   * @returns Deduplicated chains
   */
  private deduplicateChains(chains: DataTransformationChain[]): DataTransformationChain[] {
    const seen = new Set<string>();
    const result: DataTransformationChain[] = [];

    for (const chain of chains) {
      if (!seen.has(chain.id)) {
        seen.add(chain.id);
        result.push(chain);
      }
    }

    return result;
  }

  /**
   * Find orphaned DTOs (no transformation chains)
   *
   * @param dtos - Classified DTOs
   * @param chains - Transformation chains
   * @returns Array of orphaned DTO names
   */
  private findOrphanedDTOs(dtos: DTOClassification[], chains: DataTransformationChain[]): string[] {
    const dtoNames = new Set(dtos.map((d) => d.interfaceName));
    const usedDTOs = new Set<string>();

    for (const chain of chains) {
      if (dtoNames.has(chain.source)) {
        usedDTOs.add(chain.source);
      }
      if (dtoNames.has(chain.destination)) {
        usedDTOs.add(chain.destination);
      }
    }

    return Array.from(dtoNames).filter((name) => !usedDTOs.has(name));
  }

  /**
   * Detect bidirectional transformations
   *
   * @param graph - Interface dependency graph
   * @returns Array of bidirectional transformations
   */
  private detectBidirectionalTransformations(
    graph: InterfaceDependencyGraph
  ): Array<{ typeA: string; typeB: string; issue: string }> {
    const bidirectional: Array<{ typeA: string; typeB: string; issue: string }> = [];
    const checked = new Set<string>();

    for (const depA of graph.dependencies) {
      const key = `${depA.from}-${depA.to}`;
      if (checked.has(key)) {
        continue;
      }

      // Look for reverse dependency
      const depB = graph.dependencies.find((d) => d.from === depA.to && d.to === depA.from);

      if (depB) {
        bidirectional.push({
          typeA: depA.from,
          typeB: depA.to,
          issue: `Bidirectional dependency: ${depA.from} ↔ ${depA.to}`,
        });
        checked.add(key);
        checked.add(`${depA.to}-${depA.from}`);
      }
    }

    return bidirectional;
  }

  /**
   * Calculate summary statistics
   *
   * @param dtos - Classified DTOs
   * @param chains - Transformation chains
   * @returns Summary statistics
   */
  private calculateSummary(
    dtos: DTOClassification[],
    chains: DataTransformationChain[]
  ): DataFlowAnalysisResult['summary'] {
    const totalDTOs = dtos.length;
    const totalChains = chains.length;
    const validChains = chains.filter((c) => c.isValid).length;
    const invalidChains = totalChains - validChains;
    const dtoToEntityChains = chains.filter((c) => c.chainType === 'dto-to-entity').length;
    const entityToDTOChains = chains.filter((c) => c.chainType === 'entity-to-dto').length;

    const averageChainLength =
      totalChains > 0 ? chains.reduce((sum, c) => sum + c.length, 0) / totalChains : 0;

    return {
      totalDTOs,
      totalChains,
      averageChainLength,
      validChains,
      invalidChains,
      dtoToEntityChains,
      entityToDTOChains,
    };
  }

  /**
   * Trace transformation path between two interfaces
   *
   * @param from - Source interface name
   * @param to - Target interface name
   * @param graph - Interface dependency graph
   * @returns Transformation path or null if not found
   * @public
   */
  traceTransformation(
    from: string,
    to: string,
    graph: InterfaceDependencyGraph
  ): TransformationPath | null {
    const path = this.findShortestPath(from, to, graph);

    if (!path) {
      return {
        from,
        to,
        path: [],
        dependencies: [],
        length: 0,
        exists: false,
      };
    }

    const dependencies: InterfaceDependency[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const dep = graph.dependencies.find((d) => d.from === path[i] && d.to === path[i + 1]);
      if (dep) {
        dependencies.push(dep);
      }
    }

    return {
      from,
      to,
      path,
      dependencies,
      length: path.length - 1,
      exists: true,
    };
  }

  /**
   * Find shortest path between two interfaces using BFS
   *
   * @param from - Source interface
   * @param to - Target interface
   * @param graph - Interface dependency graph
   * @returns Path array or null if no path exists
   */
  private findShortestPath(
    from: string,
    to: string,
    graph: InterfaceDependencyGraph
  ): string[] | null {
    if (from === to) {
      return [from];
    }

    const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { node, path } = item;

      // Get all outgoing dependencies
      const deps = graph.dependencies.filter((d) => d.from === node);

      for (const dep of deps) {
        if (dep.to === to) {
          return [...path, to];
        }

        if (!visited.has(dep.to)) {
          visited.add(dep.to);
          queue.push({ node: dep.to, path: [...path, dep.to] });
        }
      }
    }

    return null;
  }
}
