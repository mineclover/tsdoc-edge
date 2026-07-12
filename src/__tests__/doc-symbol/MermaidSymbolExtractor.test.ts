/**
 * Tests for MermaidSymbolExtractor
 */

import { MermaidSymbolExtractor } from '../../doc-symbol/MermaidSymbolExtractor';

describe('MermaidSymbolExtractor', () => {
  let extractor: MermaidSymbolExtractor;

  beforeEach(() => {
    extractor = new MermaidSymbolExtractor();
  });

  describe('extract', () => {
    it('should extract nodes from simple graph', () => {
      const mermaid = `
graph TB
  A[Node A]
  B[Node B]
  A --> B
      `;

      const result = extractor.extract(mermaid, 'test.mmd');

      expect(result.symbols.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract relationships from arrows', () => {
      const mermaid = `
graph LR
  A --> B
  B --> C
      `;

      const result = extractor.extract(mermaid, 'test.mmd');

      expect(result.relationships.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle subgraphs', () => {
      const mermaid = `
graph TB
  subgraph Group1
    A[Node A]
    B[Node B]
  end
  C[Node C]
      `;

      const result = extractor.extract(mermaid, 'test.mmd');

      expect(result.symbols.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract status indicators', () => {
      const mermaid = `
graph TB
  A["code-dependency<br/>✅ 1,968 rels"]
      `;

      const result = extractor.extract(mermaid, 'test.mmd');

      const node = result.symbols.find((s) => s.nodeId === 'A');
      expect(node).toBeDefined();
    });

    it('should handle empty input', () => {
      const result = extractor.extract('', 'test.mmd');

      expect(result.symbols).toEqual([]);
      expect(result.relationships).toEqual([]);
    });

    it('should handle flowchart syntax', () => {
      const mermaid = `
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[End]
  B -->|No| D[Loop]
      `;

      const result = extractor.extract(mermaid, 'test.mmd');

      // Should extract some content (nodes and/or relationships)
      expect(result.symbols.length + result.relationships.length).toBeGreaterThanOrEqual(1);
    });
  });
});
