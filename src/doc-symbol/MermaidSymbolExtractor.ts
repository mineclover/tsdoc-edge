/**
 * Mermaid Symbol Extractor
 *
 * @packageDocumentation
 * @responsibility Extract symbols and relationships from Mermaid diagrams (.mmd)
 *
 * @problem Mermaid diagrams contain valuable structural information but not machine-readable
 * @solves Parse .mmd files to extract node names, relationships, and metadata
 * @context Enable .mmd files as SSOT entrypoints for explore-entrypoint command
 *
 * @functionality
 * - Parse Mermaid graph syntax (graph TB, graph LR, etc.)
 * - Extract node definitions with labels
 * - Extract edges (relationships) between nodes
 * - Detect symbol patterns in node labels (e.g., "code-dependency<br/>✅ 1,968 rels")
 * - Generate [[Symbol]] references from node labels
 */

/**
 * Extracted symbol from Mermaid diagram
 */
export interface MermaidSymbol {
  /** Node ID in diagram (e.g., "C1", "M2") */
  nodeId: string;

  /** Display label (may include HTML) */
  label: string;

  /** Extracted symbol name (cleaned) */
  symbolName: string;

  /** Symbol type hint (e.g., "code-dependency", "inheritance") */
  typeHint?: string;

  /** Implementation status (✅, ❌, ⚠️) */
  status?: 'implemented' | 'not-implemented' | 'partial';

  /** Metrics extracted from label (e.g., "1,968 rels") */
  metrics?: {
    count?: number;
    unit?: string;
  };

  /** Subgraph this node belongs to */
  subgraph?: string;
}

/**
 * Extracted relationship from Mermaid diagram
 */
export interface MermaidRelationship {
  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Edge type (-->, -.->、==>, etc.) */
  edgeType: 'solid' | 'dotted' | 'thick';

  /** Edge label if any */
  label?: string;

  /** Direction */
  direction: 'unidirectional' | 'bidirectional';
}

/**
 * Mermaid diagram metadata
 */
export interface MermaidMetadata {
  /** Diagram type (graph, flowchart, classDiagram, etc.) */
  diagramType: string;

  /** Orientation (TB, LR, RL, BT) */
  orientation?: string;

  /** Title from frontmatter or title directive */
  title?: string;

  /** Subgraphs defined */
  subgraphs: Array<{ id: string; title: string }>;
}

/**
 * Complete Mermaid extraction result
 */
export interface MermaidExtractionResult {
  metadata: MermaidMetadata;
  symbols: MermaidSymbol[];
  relationships: MermaidRelationship[];

  /** Auto-generated [[Symbol]] references */
  symbolReferences: string[];

  /** Suggested documentation sections to create */
  suggestedDocs: Array<{
    symbolName: string;
    filename: string;
    skeleton: string;
  }>;
}

/**
 * Mermaid Symbol Extractor
 *
 * @public
 * @responsibility Parse Mermaid diagrams and extract symbols/relationships
 */
export class MermaidSymbolExtractor {
  /**
   * Extract symbols and relationships from Mermaid diagram content
   *
   * @param content - Mermaid diagram source code
   * @param filePath - Path to .mmd file (for context)
   * @returns Extraction result with symbols, relationships, and suggestions
   * @public
   */
  extract(content: string, filePath: string): MermaidExtractionResult {
    const result: MermaidExtractionResult = {
      metadata: {
        diagramType: 'unknown',
        subgraphs: [],
      },
      symbols: [],
      relationships: [],
      symbolReferences: [],
      suggestedDocs: [],
    };

    // Parse diagram type and orientation
    const diagramMatch = content.match(/^(graph|flowchart|classDiagram|sequenceDiagram)\s+(TB|LR|RL|BT)?/m);
    if (diagramMatch) {
      result.metadata.diagramType = diagramMatch[1];
      result.metadata.orientation = diagramMatch[2];
    }

    // Parse subgraphs
    const subgraphRegex = /subgraph\s+"([^"]+)"/g;
    let subgraphMatch;
    let currentSubgraph: string | undefined;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Track current subgraph
      if (trimmed.startsWith('subgraph')) {
        const match = trimmed.match(/subgraph\s+"([^"]+)"/);
        if (match) {
          currentSubgraph = match[1];
          result.metadata.subgraphs.push({ id: currentSubgraph, title: currentSubgraph });
        }
      } else if (trimmed === 'end') {
        currentSubgraph = undefined;
      }

      // Parse node definitions: NodeID[Label] or NodeID[Label<br/>More]
      const nodeMatch = trimmed.match(/^([A-Z0-9]+)\[([^\]]+)\]/);
      if (nodeMatch) {
        const nodeId = nodeMatch[1];
        const label = nodeMatch[2];

        const symbol = this.parseNodeLabel(nodeId, label, currentSubgraph);
        result.symbols.push(symbol);
        // Only add to symbolReferences if valid symbol name exists and looks like a real symbol
        // Skip short uppercase codes (A, CD, L1A, etc.) which are typically node IDs
        const looksLikeNodeId = /^([A-Z]$|[A-Z]{2,4}$|L\d+[A-Z]$)/.test(symbol.symbolName);
        if (symbol.symbolName && symbol.symbolName.trim() !== '' && !looksLikeNodeId) {
          result.symbolReferences.push(symbol.symbolName);
        }
      }

      // Parse relationships: A --> B, A -.-> B, A ==> B
      const relMatch = trimmed.match(/^([A-Z0-9]+)\s+(-->|\.\.->|-\.->|==>|<-->)\s+([A-Z0-9]+)/);
      if (relMatch) {
        const from = relMatch[1];
        const edgeType = this.parseEdgeType(relMatch[2]);
        const to = relMatch[3];

        result.relationships.push({
          from,
          to,
          edgeType,
          direction: relMatch[2].includes('<') ? 'bidirectional' : 'unidirectional',
        });
      }

      // Parse relationships with labels: A -->|"label"| B
      const relLabelMatch = trimmed.match(/^([A-Z0-9]+)\s+(-->|\.\.->|-\.->|==>)\|"([^"]+)"\|\s+([A-Z0-9]+)/);
      if (relLabelMatch) {
        const from = relLabelMatch[1];
        const edgeType = this.parseEdgeType(relLabelMatch[2]);
        const label = relLabelMatch[3];
        const to = relLabelMatch[4];

        result.relationships.push({
          from,
          to,
          edgeType,
          label,
          direction: 'unidirectional',
        });
      }
    }

    // Store current context for relationship generation
    this.currentSymbols = result.symbols;
    this.currentRelationships = result.relationships;

    // Generate suggested documentation
    result.suggestedDocs = this.generateDocSuggestions(result.symbols);

    return result;
  }

  /**
   * Parse node label to extract symbol information
   *
   * Pattern: "code-dependency<br/>✅ 1,968 rels<br/>import A from B"
   */
  private parseNodeLabel(nodeId: string, label: string, subgraph?: string): MermaidSymbol {
    // Remove HTML tags for parsing
    const cleanLabel = label.replace(/<br\/?>/g, '\n').replace(/<[^>]+>/g, '');
    const lines = cleanLabel.split('\n').map(l => l.trim()).filter(l => l);

    // First line is usually the symbol name
    let symbolName = lines[0] || nodeId;

    // Map known relationship types and common patterns to their canonical symbol names
    const relationshipTypeMap: Record<string, string> = {
      // Relationship types
      'code-dependency': 'Code Dependency',
      'io-dependency': 'IO Dependency',
      'I/O Dependency': 'IO Dependency',  // Handle slash variant
      'inheritance': 'Inheritance',
      'interface-impl': 'Interface Implementation',
      'calls': 'Call Relationships',
      'callback': 'Callback Pattern',
      'composition': 'Composition Relationship',
      'circular': 'Circular Dependency',
      'pipeline': 'Pipeline',
      'event-flow': 'Event Flow',
      'type-dependency': 'Type Dependency',
      'generic-constraint': 'Generic Constraint',
      'layer-dependency': 'Layer Dependency',
      'module-boundary': 'Module Boundary',
      'test-coverage': 'Test Coverage',
      'doc-reference': 'Documentation Reference',
      'enhancement': 'Enhancement',
      'Function Calls': 'Call Relationships',  // Alias for calls
      // Common command/workflow patterns
      'work-context': 'WorkContextCommand',
    };

    // Check if this is a known relationship type
    if (relationshipTypeMap[symbolName]) {
      symbolName = relationshipTypeMap[symbolName];
    } else if (symbolName && /^[a-z][a-z-]*$/.test(symbolName)) {
      // Clean up symbol name - if it starts with lowercase and has hyphens,
      // it's likely a data label not a symbol reference.
      // Convert to Title Case to match actual symbol names
      symbolName = symbolName.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Filter out obvious non-symbols (SQL queries, statistics, problems, commands)
    const nonSymbolPatterns = [
      /^SELECT\s+/i,
      /^INSERT\s+/i,
      /^UPDATE\s+/i,
      /^DELETE\s+/i,
      /^Base:\s*/,
      /^Problem:\s*/,
      /^Run:\s*/,
      /^TODO:/,
      /^Note:/,
      /^Filter:/,
      /^\d+%$/,  // Pure percentages
      /^\d+\.\s+/,  // Numbered lists (1., 2., etc.)
      /^✅\s*/,  // Just checkmark
      /^❌\s*/,  // Just X mark
      /^🧪\s*/,  // Test tube emoji
      /^🟢|^🔴|^🟡/,  // Colored circles
      /[\u{1F300}-\u{1F9FF}]/u,  // Contains any emoji
      /^Before:\s*/i,  // Before: prefixes
      /^After:\s*/i,   // After: prefixes
      /^Added:\s*/i,   // Added: prefixes
      /^IDE:\s*/,      // IDE: labels
      /^Editor:\s*/,   // Editor: labels
      /^Reverse:\s*/,  // Reverse: labels
      /\s+from\s+/i,   // Algorithm descriptions (DFS from each node)
      /\s*\+\s*/,      // Contains plus signs (Code + Data + Behavior)
      /\s*=\s*\?/,     // Query patterns (target = ?)
      /^(Target|Confidence|Priority|Impact|Effort)$/,  // Single property names
      /^I\/O\s+/,      // I/O prefix
      /Deps$/i,        // Ends with Deps (I/O Deps, Code Deps)
      /Detect$/i,      // Ends with Detect (Circular Detect)
      /^⚠️\s*/,        // Warning emoji prefix
      /^→\s*/,         // Arrow prefix
      /Test\[/,        // TypeScript type syntax (Test[)
      /Usage\[/,       // TypeScript type syntax (Usage[)
      /Symbol\[/,      // TypeScript type syntax (Symbol[)
      /DocRef\[/,      // TypeScript type syntax (DocRef[)
      /Dep\[/,         // TypeScript type syntax (Dep[)
      /^usedBy:/,      // usedBy: prefix
      /^tests:/,       // tests: prefix
      /^symbols:/,     // symbols: prefix
      /^dependencies:/,// dependencies: prefix
      /^relatedDocs:/, // relatedDocs: prefix
      /^path:/,        // path: prefix
      /^canonical:/,   // canonical: prefix
      /[\uAC00-\uD7AF]/,  // Contains Korean characters
      /_id$/,          // Ends with _id (symbol_id, etc.)
      /^[a-z][a-zA-Z]+By$/,  // camelCase ending in By (uniqueBy, etc.)
      /^(get|find|display|execute|gather)[A-Z]/,  // Function names (getAll, findDoc, etc.)
      /^fs:/,          // fs: prefix
      /\s*\/\s*/,      // Contains slash (deps / who-uses)
      /\s*\*\s*/,      // Contains asterisk (analyze-*)
      /🆕/,            // New feature emoji
      /^[A-Z][a-z]+:\s*/,  // Label patterns (Linter:, Test:, Extract:, Result:)
      /^Confidence:\s*/,   // Confidence: prefix
      /\.(mmd|db|jsonl|md|ts|js)$/,  // File extensions
      /^\(/,           // Starts with parenthesis (file paths)
      /[≥≤]/,          // Comparison operators
      /^(Return|Parameter|Import|Extends)\s+(Type|Keyword|Statements?)$/,  // Type keywords
      /\s+Types?$/,    // Ends with Type or Types
      /\s+(Analysis|Detection|Drift|Coverage|Tests)$/,  // Analysis categories
      /^(Create|Define|Parse|Generate|Extract|Follow|Find)\s+/,  // Workflow verbs
      /^(Code|Doc|Test)\s+/i,  // Category prefixes
      /Patterns?$/,    // Ends with Pattern/Patterns
      /^L\d+[A-Z]$/,   // Labels like L2C, L3B
      /Product$/,      // Ends with Product (Cartesian Product)
      /Chains$/,       // Ends with Chains
      /Hotspots?$/,    // Ends with Hotspot/Hotspots
      /^(Graph|Relationship)\s+/,  // System prefixes
      /^[A-Z]$/,       // Single uppercase letter (A, B, C, D - node IDs)
      /^[A-Z]{2,4}$/,  // Short uppercase abbreviations (CD, TEST, FS, PATH, EWE, GC, UB)
      /^L\d+[A-Z]$/,   // Labels with numbers (L1A, L2A, L2B, L3A, etc.)
      /^--/,           // CLI flags (--detect-orphans)
      /\[0\]?$/,       // Array index (args[0)
      /^(Structural|Behavioral|Architectural|Data Flow)$/,  // Category names
      /^(Add to|Archive|Delete|Promote|Show|Scan)\s+/,  // Workflow/action verbs
      /^(Read|Write|Resolve|Check|Query|Group|Build)\s+/i,  // Process verbs
      /\s+(file|table|path|symbols?|content|exists)$/i,  // Technical suffixes
      /^(Orphaned|All)\s+/,  // Status prefixes
      /Stats$/,        // Ends with Stats
      /Workflow$/,     // Ends with Workflow
      /Taxonomy$/,     // Ends with Taxonomy
      /Roadmap$/,      // Ends with Roadmap
      /^(FS|PATH|CommandResult)$/,  // Technical constants/types
      /Validation$/,   // Ends with Validation
      /Resolved$/,     // Ends with Resolved
      /Issue$/,        // Ends with Issue (Docs Issue, Tests Issue, etc.)
      /Bonus$/,        // Ends with Bonus (Coverage Bonus)
      /^(Fix|Add|Rebuild|Visualize|Explore)\s+/,  // Action verbs
      /^(Documentation|Architecture|Evidence|Type Safety)$/,  // Abstract concepts
      /\s+interface$/i,  // Ends with interface (WorkContext interface)
      /^(Auto|Missing)\s+/,  // Automation prefixes
      /^(Dependency|Type)\s+(Graph|System)$/,  // System concepts
      /Analyzer$/,     // Ends with Analyzer (as standalone workflow step)
      /Fixer$/,        // Ends with Fixer
      /Generator$/,    // Ends with Generator
      /^[A-Z][A-Z-]+[A-Z]$/,  // All caps with hyphens (EXAMPLE-WORKFLOW, FINAL-SUMMARY)
      /^(Backlinks|Archive|Delete|Validate)\s*$/,  // Workflow actions
      /\s+Quality$/,   // Ends with Quality
      /\s+Health$/,    // Ends with Health
      /^(Command|Symbol)\s+(Registry|Graph|Validation)$/,  // System components
      /Detector$/,     // Ends with Detector
      /Resolver$/,     // Ends with Resolver
      /^Base\s+/,      // Starts with Base
      /^Enhanced\s+/,  // Starts with Enhanced
    ];

    const isNonSymbol = nonSymbolPatterns.some(pattern => pattern.test(symbolName));
    if (isNonSymbol) {
      // This is data/text, not a symbol reference - check nodeId
      const isNodeIdNonSymbol = nonSymbolPatterns.some(pattern => pattern.test(nodeId));
      if (!isNodeIdNonSymbol) {
        // Use nodeId as fallback if it's a valid symbol
        symbolName = nodeId;
      } else {
        // Both label and nodeId are non-symbols, use nodeId but mark as non-reference
        symbolName = nodeId;
      }
    }

    // Detect status from emoji/symbol
    let status: MermaidSymbol['status'] = undefined;
    if (label.includes('✅') || label.includes('IMPLEMENTED')) {
      status = 'implemented';
    } else if (label.includes('❌') || label.includes('NOT YET')) {
      status = 'not-implemented';
    } else if (label.includes('⚠️') || label.includes('PARTIAL')) {
      status = 'partial';
    }

    // Extract metrics (e.g., "1,968 rels")
    let metrics: MermaidSymbol['metrics'] = undefined;
    for (const line of lines) {
      const metricMatch = line.match(/([\d,]+)\s+(\w+)/);
      if (metricMatch) {
        const count = parseInt(metricMatch[1].replace(/,/g, ''), 10);
        const unit = metricMatch[2];
        metrics = { count, unit };
        break;
      }
    }

    // Type hint is the symbol name normalized
    const typeHint = symbolName.toLowerCase().replace(/\s+/g, '-');

    return {
      nodeId,
      label,
      symbolName,
      typeHint,
      status,
      metrics,
      subgraph,
    };
  }

  /**
   * Parse edge type from Mermaid syntax
   */
  private parseEdgeType(edge: string): 'solid' | 'dotted' | 'thick' {
    if (edge.includes('==>')) return 'thick';
    if (edge.includes('.') || edge.includes('-.-')) return 'dotted';
    return 'solid';
  }

  /**
   * Generate documentation suggestions based on extracted symbols
   */
  private generateDocSuggestions(symbols: MermaidSymbol[]): Array<{
    symbolName: string;
    filename: string;
    skeleton: string;
  }> {
    const suggestions: Array<{ symbolName: string; filename: string; skeleton: string }> = [];

    for (const symbol of symbols) {
      if (symbol.status === 'not-implemented') {
        // Don't suggest docs for unimplemented features
        continue;
      }

      const filename = (symbol.typeHint || symbol.symbolName)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''); // Remove special characters
      const skeleton = this.generateDocSkeleton(symbol);

      suggestions.push({
        symbolName: symbol.symbolName,
        filename: `${filename}.md`,
        skeleton,
      });
    }

    return suggestions;
  }

  /**
   * Generate documentation skeleton for a symbol
   *
   * Note: Generated as H2 (reference definition), not H1 (canonical definition)
   * This allows multiple .mmd files to generate reference docs without conflicts.
   * Manually promote to H1 when establishing as canonical SSOT.
   */
  private generateDocSkeleton(symbol: MermaidSymbol): string {
    const status = symbol.status === 'implemented' ? 'implemented' : 'planned';
    const progress = symbol.status === 'implemented' ? '100%' : '0%';

    // Generate relationship sections
    const relationshipSections = this.generateRelationshipSections(symbol);

    return `---
title: ${symbol.symbolName}
type: reference
category: ${symbol.subgraph || 'unknown'}
status: ${status}
implementation-progress: ${progress}
${symbol.metrics ? `relationships-count: ${symbol.metrics.count}` : ''}
generated-from: mermaid-diagram
canonical: false
---

# Reference: ${symbol.symbolName}

> ⚠️ **This is a reference definition (H2), not canonical (H1)**
>
> Generated from Mermaid diagram. To make this the canonical SSOT definition:
> 1. Change title to: \`# [[${symbol.symbolName}]]\`
> 2. Update frontmatter: \`canonical: true\`
> 3. Fill in all TODO sections

## [[${symbol.symbolName}]]

> **Type**: \`${symbol.typeHint}\`
> **Category**: ${symbol.subgraph || 'TBD'}
> **Status**: ${symbol.status === 'implemented' ? '✅ Implemented' : '❌ Not Implemented'}

## Purpose

TODO: Describe the purpose of this relationship type

## Pattern

\`\`\`typescript
// TODO: Add code example showing this pattern
\`\`\`

## Implementation

### Extractor

**File**: \`src/analyzer/TODO.ts\`

TODO: Document implementation details

## Properties

| Property | Type | Description |
|----------|------|-------------|
| \`type\` | \`'${symbol.typeHint}'\` | Fixed value |
| \`category\` | \`'TODO'\` | TBD |

## Commands

\`\`\`bash
# TODO: Document relevant commands
\`\`\`

${relationshipSections}

## Related Checkpoints

- [[Relationship Types]]: Parent index
${symbol.metrics?.count ? `\n## Statistics\n\n**Current Count**: ${symbol.metrics.count.toLocaleString()} ${symbol.metrics.unit}` : ''}

---

**Implementation File**: TBD
**Command**: TBD
`;
  }

  /**
   * Generate relationship sections based on edges
   */
  private generateRelationshipSections(symbol: MermaidSymbol): string {
    if (!this.currentRelationships || this.currentRelationships.length === 0) {
      return '';
    }

    const outgoing = this.currentRelationships.filter(r => r.from === symbol.nodeId);
    const incoming = this.currentRelationships.filter(r => r.to === symbol.nodeId);

    if (outgoing.length === 0 && incoming.length === 0) {
      return '';
    }

    let sections = '\n## Relationships\n\n';

    if (outgoing.length > 0) {
      sections += '### Depends On\n\n';
      sections += 'This relationship type builds upon or uses:\n\n';
      for (const rel of outgoing) {
        const targetSymbol = this.findSymbolByNodeId(rel.to);
        const edgeStyle = this.getEdgeStyleDescription(rel.edgeType);
        sections += `- **[[${targetSymbol?.symbolName || rel.to}]]** (${edgeStyle})`;
        if (rel.label) {
          sections += ` - ${rel.label}`;
        }
        sections += '\n';
      }
      sections += '\n';
    }

    if (incoming.length > 0) {
      sections += '### Used By\n\n';
      sections += 'This relationship type is used by:\n\n';
      for (const rel of incoming) {
        const sourceSymbol = this.findSymbolByNodeId(rel.from);
        const edgeStyle = this.getEdgeStyleDescription(rel.edgeType);
        sections += `- **[[${sourceSymbol?.symbolName || rel.from}]]** (${edgeStyle})`;
        if (rel.label) {
          sections += ` - ${rel.label}`;
        }
        sections += '\n';
      }
      sections += '\n';
    }

    return sections;
  }

  /**
   * Find symbol by node ID
   */
  private findSymbolByNodeId(nodeId: string): MermaidSymbol | undefined {
    return this.currentSymbols?.find(s => s.nodeId === nodeId);
  }

  /**
   * Get edge style description
   */
  private getEdgeStyleDescription(edgeType: 'solid' | 'dotted' | 'thick'): string {
    switch (edgeType) {
      case 'solid':
        return 'direct dependency';
      case 'dotted':
        return 'indirect/inferred';
      case 'thick':
        return 'strong coupling';
      default:
        return 'related';
    }
  }

  // Store current extraction context for relationship generation
  private currentSymbols?: MermaidSymbol[];
  private currentRelationships?: MermaidRelationship[];

  /**
   * Validate symbol reference consistency
   *
   * Check if [[Symbol]] reference matches existing documentation
   *
   * @param symbolRef - Symbol reference string (e.g., "Code Dependency")
   * @param existingDocs - Map of symbol name to doc file path
   * @returns Validation result
   * @public
   */
  validateSymbolReference(
    symbolRef: string,
    existingDocs: Map<string, string>
  ): {
    isValid: boolean;
    status: 'first-use' | 'exists' | 'mismatch';
    suggestion?: string;
    docPath?: string;
  } {
    // Normalize symbol reference
    const normalized = symbolRef.toLowerCase().replace(/\s+/g, '-');

    // Check if doc exists
    for (const [docSymbol, docPath] of existingDocs.entries()) {
      const docNormalized = docSymbol.toLowerCase().replace(/\s+/g, '-');

      if (docNormalized === normalized) {
        return {
          isValid: true,
          status: 'exists',
          docPath,
        };
      }

      // Fuzzy match for suggestions
      if (docNormalized.includes(normalized) || normalized.includes(docNormalized)) {
        return {
          isValid: false,
          status: 'mismatch',
          suggestion: `Did you mean [[${docSymbol}]]? (found at ${docPath})`,
        };
      }
    }

    // First use - suggest creating doc
    return {
      isValid: true,
      status: 'first-use',
      suggestion: `Create managed/relationships/${normalized}.md`,
    };
  }
}
