/**
 * DomainStructureAnalyzer tests
 * @public
 */

import { DomainStructureAnalyzer } from '../analyzer/DomainStructureAnalyzer';
import { InterfaceAnalyzer } from '../analyzer/InterfaceAnalyzer';
import { InterfaceDependencyMapper } from '../analyzer/InterfaceDependencyMapper';

describe('DomainStructureAnalyzer', () => {
  let analyzer: DomainStructureAnalyzer;
  let interfaceAnalyzer: InterfaceAnalyzer;
  let dependencyMapper: InterfaceDependencyMapper;

  beforeEach(() => {
    analyzer = new DomainStructureAnalyzer();
    interfaceAnalyzer = new InterfaceAnalyzer({
      inferDomainFromPath: true,
      inferDomainRole: true,
    });
    dependencyMapper = new InterfaceDependencyMapper();
  });

  describe('analyzeDomains', () => {
    it('should analyze domain structure', () => {
      const userCode = `
export interface User {
  id: string;
  name: string;
}
`;

      const userRepoCode = `
export interface UserRepository {
  findById(id: string): Promise<User>;
  save(user: User): Promise<void>;
}
`;

      const userInterfaces = interfaceAnalyzer.analyzeFile('src/domain/user/User.ts', userCode);
      const repoInterfaces = interfaceAnalyzer.analyzeFile(
        'src/domain/user/UserRepository.ts',
        userRepoCode
      );

      const allInterfaces = [...userInterfaces, ...repoInterfaces];
      let graph = dependencyMapper.buildDependencyGraph(allInterfaces);
      graph = analyzer.analyzeDomains(graph);

      expect(graph.domains.size).toBeGreaterThan(0);

      const userDomain = graph.domains.get('user');
      expect(userDomain).toBeDefined();
      expect(userDomain?.interfaces.length).toBe(2);
    });

    it('should calculate cohesion score', () => {
      const entityCode = `
export interface Order {
  id: string;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
}
`;

      const interfaces = interfaceAnalyzer.analyzeFile('src/domain/order/Order.ts', entityCode);
      let graph = dependencyMapper.buildDependencyGraph(interfaces);
      graph = analyzer.analyzeDomains(graph);

      const orderDomain = graph.domains.get('order');
      expect(orderDomain).toBeDefined();

      // Cohesion should be > 0 since OrderItem is referenced by Order
      expect(orderDomain?.cohesionScore).toBeGreaterThan(0);
    });

    it('should calculate coupling score', () => {
      const orderCode = `
export interface Order {
  id: string;
  userId: string;
}
`;

      const userCode = `
export interface User {
  id: string;
}
`;

      const paymentCode = `
export interface Payment {
  orderId: string;
  order: Order;
}
`;

      const orderInterfaces = interfaceAnalyzer.analyzeFile('src/domain/order/Order.ts', orderCode);
      const userInterfaces = interfaceAnalyzer.analyzeFile('src/domain/user/User.ts', userCode);
      const paymentInterfaces = interfaceAnalyzer.analyzeFile(
        'src/domain/payment/Payment.ts',
        paymentCode
      );

      const allInterfaces = [...orderInterfaces, ...userInterfaces, ...paymentInterfaces];
      let graph = dependencyMapper.buildDependencyGraph(allInterfaces);
      graph = analyzer.analyzeDomains(graph);

      const paymentDomain = graph.domains.get('payment');
      expect(paymentDomain).toBeDefined();

      // Payment domain should have external dependency to Order
      expect(paymentDomain?.externalDependencies.length).toBeGreaterThan(0);
      expect(paymentDomain?.couplingScore).toBeGreaterThan(0);
    });

    it('should identify internal vs external dependencies', () => {
      const domainCode = `
export interface EntityA {
  id: string;
  b: EntityB;
}

export interface EntityB {
  id: string;
}

export interface EntityC {
  id: string;
  external: ExternalEntity;
}
`;

      const externalCode = `
export interface ExternalEntity {
  id: string;
}
`;

      const domainInterfaces = interfaceAnalyzer.analyzeFile(
        'src/domain/mydomain/entities.ts',
        domainCode
      );
      const externalInterfaces = interfaceAnalyzer.analyzeFile(
        'src/domain/other/external.ts',
        externalCode
      );

      const allInterfaces = [...domainInterfaces, ...externalInterfaces];
      let graph = dependencyMapper.buildDependencyGraph(allInterfaces);
      graph = analyzer.analyzeDomains(graph);

      const myDomain = graph.domains.get('mydomain');
      expect(myDomain).toBeDefined();

      // EntityA -> EntityB is internal
      const internalDep = myDomain?.internalDependencies.find(
        (d) => d.from === 'EntityA' && d.to === 'EntityB'
      );
      expect(internalDep).toBeDefined();

      // EntityC -> ExternalEntity is external
      const externalDep = myDomain?.externalDependencies.find(
        (d) => d.from === 'EntityC' && d.to === 'ExternalEntity'
      );
      expect(externalDep).toBeDefined();
    });
  });

  describe('generateDomainReport', () => {
    it('should generate domain report', () => {
      const userCode = `
export interface User {
  id: string;
}
`;

      const interfaces = interfaceAnalyzer.analyzeFile('src/domain/user/User.ts', userCode);
      let graph = dependencyMapper.buildDependencyGraph(interfaces);
      graph = analyzer.analyzeDomains(graph);

      const report = analyzer.generateDomainReport(graph);

      expect(report).toContain('# Domain Structure Analysis');
      expect(report).toContain('Total Domains:');
      expect(report).toContain('Total Interfaces:');
    });

    it('should include domain metrics in report', () => {
      const code = `
export interface A {
  id: string;
  b: B;
}

export interface B {
  id: string;
}
`;

      const interfaces = interfaceAnalyzer.analyzeFile('src/domain/test/test.ts', code);
      let graph = dependencyMapper.buildDependencyGraph(interfaces);
      graph = analyzer.analyzeDomains(graph);

      const report = analyzer.generateDomainReport(graph);

      expect(report).toContain('Cohesion');
      expect(report).toContain('Coupling');
      expect(report).toContain('Domain: test');
    });

    it('should include recommendations', () => {
      // Create a large domain with many interfaces for recommendations
      const interfaces = [];

      for (let i = 0; i < 25; i++) {
        const code = `
export interface Entity${i} {
  id: string;
}
`;
        const ifaces = interfaceAnalyzer.analyzeFile(`src/domain/large/Entity${i}.ts`, code);
        interfaces.push(...ifaces);
      }

      let graph = dependencyMapper.buildDependencyGraph(interfaces);
      graph = analyzer.analyzeDomains(graph);

      const report = analyzer.generateDomainReport(graph);

      expect(report).toContain('## Recommendations');
    });
  });
});
