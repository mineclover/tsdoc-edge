/**
 * Tests for DomainStructureAnalyzer
 */

import type { InterfaceDependencyGraph, InterfaceInfo } from '../../types/domain';
import type { Symbol } from '../../types/graph';
import { DomainStructureAnalyzer } from '../../analyzer/DomainStructureAnalyzer';

const createMockSymbol = (id: string, name: string, filePath: string, line: number): Symbol => ({
  id,
  name,
  type: 'interface',
  filePath,
  line,
  column: 0,
  isExported: false,
  isPublic: false,
  tests: [],
  designDecisions: [],
});

describe('DomainStructureAnalyzer', () => {
  let analyzer: DomainStructureAnalyzer;

  beforeEach(() => {
    analyzer = new DomainStructureAnalyzer();
  });

  describe('constructor', () => {
    it('should create DomainStructureAnalyzer', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(DomainStructureAnalyzer);
    });
  });

  describe('analyzeDomains', () => {
    it('should analyze single domain with single interface', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          [
            'User',
            {
              symbol,
              properties: [],
              methods: [],
              extends: [],
              typeParameters: [],
              domain: 'user',
            },
          ],
        ]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.domains.size).toBe(1);
      expect(result.domains.has('user')).toBe(true);
    });

    it('should group interfaces by domain', () => {
      const userSymbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const profileSymbol = createMockSymbol('profile-1', 'Profile', 'src/user.ts', 10);
      const postSymbol = createMockSymbol('post-1', 'Post', 'src/post.ts', 1);

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['User', { symbol: userSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }],
          [
            'Profile',
            { symbol: profileSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' },
          ],
          ['Post', { symbol: postSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'post' }],
        ]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.domains.size).toBe(2);
      expect(result.domains.get('user')?.interfaces.length).toBe(2);
      expect(result.domains.get('post')?.interfaces.length).toBe(1);
    });

    it('should handle unknown domain', () => {
      const symbol = createMockSymbol('unknown-1', 'Unknown', 'src/unknown.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['Unknown', { symbol, properties: [], methods: [], extends: [], typeParameters: [] }],
        ]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.domains.has('unknown')).toBe(true);
    });

    it('should separate internal and external dependencies', () => {
      const userSymbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const profileSymbol = createMockSymbol('profile-1', 'Profile', 'src/user.ts', 10);
      const postSymbol = createMockSymbol('post-1', 'Post', 'src/post.ts', 1);

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['User', { symbol: userSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }],
          [
            'Profile',
            { symbol: profileSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' },
          ],
          ['Post', { symbol: postSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'post' }],
        ]),
        dependencies: [
          { from: 'User', to: 'Profile', dependencyType: 'composition', location: 'property' },
          { from: 'User', to: 'Post', dependencyType: 'composition', location: 'property' },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const userDomain = result.domains.get('user')!;

      expect(userDomain.internalDependencies.length).toBe(1);
      expect(userDomain.externalDependencies.length).toBe(1);
    });

    it('should calculate cohesion score for single interface', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const userDomain = result.domains.get('user')!;

      expect(userDomain.cohesionScore).toBe(1.0);
    });

    it('should calculate coupling score correctly', () => {
      const userSymbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const postSymbol = createMockSymbol('post-1', 'Post', 'src/post.ts', 1);
      const commentSymbol = createMockSymbol('comment-1', 'Comment', 'src/post.ts', 10);

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['User', { symbol: userSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }],
          ['Post', { symbol: postSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'post' }],
          [
            'Comment',
            { symbol: commentSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'post' },
          ],
        ]),
        dependencies: [
          { from: 'Post', to: 'User', dependencyType: 'composition', location: 'property' },
          { from: 'Comment', to: 'User', dependencyType: 'composition', location: 'property' },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const postDomain = result.domains.get('post')!;

      expect(postDomain.couplingScore).toBeGreaterThan(0);
      expect(postDomain.couplingScore).toBeLessThanOrEqual(1.0);
    });

    it('should preserve existing domains in graph', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.interfaces).toBe(graph.interfaces);
      expect(result.dependencies).toBe(graph.dependencies);
    });
  });

  describe('private calculateCohesion', () => {
    it('should return 1.0 for single interface', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const interfaces: InterfaceInfo[] = [{ symbol, properties: [], methods: [], extends: [], typeParameters: [] }];

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', interfaces[0]]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const domain = result.domains.values().next().value;

      expect(domain).toBeDefined();
      expect(domain!.cohesionScore).toBe(1.0);
    });

    it('should calculate cohesion for multiple interfaces', () => {
      const symbol1 = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const symbol2 = createMockSymbol('profile-1', 'Profile', 'src/user.ts', 10);
      const interfaces: InterfaceInfo[] = [
        { symbol: symbol1, properties: [], methods: [], extends: [], typeParameters: [] },
        { symbol: symbol2, properties: [], methods: [], extends: [], typeParameters: [] },
      ];

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['User', interfaces[0]],
          ['Profile', interfaces[1]],
        ]),
        dependencies: [
          {
            from: 'User',
            to: 'Profile',
            dependencyType: 'composition',
            location: 'property',
          },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const domain = result.domains.values().next().value;

      expect(domain).toBeDefined();
      expect(domain!.cohesionScore).toBeGreaterThan(0);
      expect(domain!.cohesionScore).toBeLessThanOrEqual(1.0);
    });

    it('should return 0 for disconnected interfaces', () => {
      const symbol1 = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const symbol2 = createMockSymbol('profile-1', 'Profile', 'src/user.ts', 10);
      const interfaces: InterfaceInfo[] = [
        { symbol: symbol1, properties: [], methods: [], extends: [], typeParameters: [] },
        { symbol: symbol2, properties: [], methods: [], extends: [], typeParameters: [] },
      ];

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['User', interfaces[0]],
          ['Profile', interfaces[1]],
        ]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const domain = result.domains.values().next().value;

      expect(domain).toBeDefined();
      expect(domain!.cohesionScore).toBe(0);
    });
  });

  describe('private calculateCoupling', () => {
    it('should return 0 for no external dependencies', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const domain = result.domains.get('user')!;

      expect(domain.couplingScore).toBe(0);
    });

    it('should cap coupling at 1.0', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [
          { from: 'User', to: 'Post', dependencyType: 'composition', location: 'property' },
          { from: 'User', to: 'Comment', dependencyType: 'composition', location: 'property' },
          { from: 'User', to: 'Tag', dependencyType: 'composition', location: 'property' },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const domain = result.domains.get('user')!;

      expect(domain.couplingScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateDomainReport', () => {
    it('should generate report for empty domains', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map(),
        dependencies: [],
        domains: new Map(),
      };

      const report = analyzer.generateDomainReport(graph);

      expect(report).toContain('Domain Structure Analysis');
      expect(report).toContain('No domains found');
    });

    it('should generate report with domain summary', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const report = analyzer.generateDomainReport(result);

      expect(report).toContain('Domain Structure Analysis');
      expect(report).toContain('Overview');
      expect(report).toContain('Total Domains: 1');
      expect(report).toContain('Total Interfaces: 1');
    });

    it('should generate report with domain details', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          [
            'User',
            { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user', domainRole: 'Entity' },
          ],
        ]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const report = analyzer.generateDomainReport(result);

      expect(report).toContain('Domain: user');
      expect(report).toContain('Cohesion Score');
      expect(report).toContain('Coupling Score');
    });

    it('should include interface listing by role', () => {
      const userSymbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const repoSymbol = createMockSymbol('repo-1', 'UserRepository', 'src/user.ts', 20);

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          [
            'User',
            { symbol: userSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user', domainRole: 'Entity' },
          ],
          [
            'UserRepository',
            {
              symbol: repoSymbol,
              properties: [],
              methods: [],
              extends: [],
              typeParameters: [],
              domain: 'user',
              domainRole: 'Repository',
            },
          ],
        ]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const report = analyzer.generateDomainReport(result);

      expect(report).toContain('Interfaces by Role');
      expect(report).toContain('Entity');
      expect(report).toContain('Repository');
    });

    it('should include recommendations for problematic domains', () => {
      const userSymbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const userInterface: InterfaceInfo = {
        symbol: userSymbol,
        properties: [],
        methods: [],
        extends: [],
        typeParameters: [],
        domain: 'user',
      };

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', userInterface]]),
        dependencies: [],
        domains: new Map([
          [
            'user',
            {
              domainName: 'user',
              interfaces: [userInterface],
              internalDependencies: [],
              externalDependencies: [],
              cohesionScore: 0.1,
              couplingScore: 0.8,
            },
          ],
        ]),
      };

      const report = analyzer.generateDomainReport(graph);

      expect(report).toContain('Recommendations');
    });

    it('should format coverage percentages in report', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const report = analyzer.generateDomainReport(result);

      expect(report).toMatch(/\d+%/);
    });

    it('should limit internal dependencies in report', () => {
      const interfaces: InterfaceInfo[] = [];
      const dependencies = [];

      for (let i = 0; i < 15; i++) {
        const symbol = createMockSymbol(`int-${i}`, `Interface${i}`, 'src/test.ts', i);
        interfaces.push({ symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'test' });
      }

      for (let i = 0; i < 20; i++) {
        dependencies.push({
          from: `Interface${i % 15}`,
          to: `Interface${(i + 1) % 15}`,
          dependencyType: 'composition' as const,
          location: 'property' as const,
        });
      }

      const interfaceMap = new Map(interfaces.map((i) => [i.symbol.name, i]));
      const graph: InterfaceDependencyGraph = {
        interfaces: interfaceMap,
        dependencies,
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const report = analyzer.generateDomainReport(result);

      expect(report).toBeDefined();
      expect(report.length).toBeGreaterThan(0);
    });

    it('should sort domains by cohesion', () => {
      const userSymbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const postSymbol = createMockSymbol('post-1', 'Post', 'src/post.ts', 1);

      const userInterface: InterfaceInfo = { symbol: userSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' };
      const postInterface: InterfaceInfo = { symbol: postSymbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'post' };

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['User', userInterface],
          ['Post', postInterface],
        ]),
        dependencies: [],
        domains: new Map([
          [
            'user',
            {
              domainName: 'user',
              interfaces: [userInterface],
              internalDependencies: [],
              externalDependencies: [],
              cohesionScore: 0.9,
              couplingScore: 0.1,
            },
          ],
          [
            'post',
            {
              domainName: 'post',
              interfaces: [postInterface],
              internalDependencies: [],
              externalDependencies: [],
              cohesionScore: 0.5,
              couplingScore: 0.5,
            },
          ],
        ]),
      };

      const report = analyzer.generateDomainReport(graph);

      const userIndex = report.indexOf('user');
      const postIndex = report.indexOf('post');
      expect(userIndex).toBeLessThan(postIndex);
    });
  });

  describe('private getDomainQuality', () => {
    it('should rate excellent domain', () => {
      const symbol = createMockSymbol('user-1', 'User', 'src/user.ts', 1);
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['User', { symbol, properties: [], methods: [], extends: [], typeParameters: [], domain: 'user' }]]),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const report = analyzer.generateDomainReport(result);

      expect(report).toContain('Excellent');
    });
  });

  describe('edge cases', () => {
    it('should handle empty interfaces map', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map(),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.domains.size).toBe(0);
    });

    it('should handle large domain with many interfaces', () => {
      const interfaces = new Map<string, InterfaceInfo>();

      for (let i = 0; i < 50; i++) {
        const symbol = createMockSymbol(`int-${i}`, `Interface${i}`, 'src/test.ts', i);
        const iface: InterfaceInfo = {
          symbol,
          properties: [],
          methods: [],
          extends: [],
          typeParameters: [],
          domain: 'large',
        };
        interfaces.set(`Interface${i}`, iface);
      }

      const graph: InterfaceDependencyGraph = {
        interfaces,
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.domains.size).toBe(1);
      expect(result.domains.get('large')?.interfaces.length).toBe(50);
    });

    it('should handle circular dependencies', () => {
      const symbolA = createMockSymbol('a-1', 'A', 'src/a.ts', 1);
      const symbolB = createMockSymbol('b-1', 'B', 'src/b.ts', 1);

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['A', { symbol: symbolA, properties: [], methods: [], extends: [], typeParameters: [], domain: 'test' }],
          ['B', { symbol: symbolB, properties: [], methods: [], extends: [], typeParameters: [], domain: 'test' }],
        ]),
        dependencies: [
          { from: 'A', to: 'B', dependencyType: 'composition', location: 'property' },
          { from: 'B', to: 'A', dependencyType: 'composition', location: 'property' },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);

      expect(result.domains.size).toBe(1);
      expect(result.domains.get('test')?.internalDependencies.length).toBe(2);
    });

    it('should handle self-referencing interfaces', () => {
      const symbolNode = createMockSymbol('node-1', 'Node', 'src/node.ts', 1);

      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([['Node', { symbol: symbolNode, properties: [], methods: [], extends: [], typeParameters: [], domain: 'tree' }]]),
        dependencies: [{ from: 'Node', to: 'Node', dependencyType: 'composition', location: 'property' }],
        domains: new Map(),
      };

      const result = analyzer.analyzeDomains(graph);
      const domain = result.domains.get('tree')!;

      expect(domain.internalDependencies.length).toBe(1);
    });
  });
});
