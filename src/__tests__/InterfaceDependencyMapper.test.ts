/**
 * InterfaceDependencyMapper tests
 * @public
 */

import { InterfaceAnalyzer } from '../analyzer/InterfaceAnalyzer';
import { InterfaceDependencyMapper } from '../analyzer/InterfaceDependencyMapper';

describe('InterfaceDependencyMapper', () => {
  let mapper: InterfaceDependencyMapper;
  let analyzer: InterfaceAnalyzer;

  beforeEach(() => {
    mapper = new InterfaceDependencyMapper();
    analyzer = new InterfaceAnalyzer();
  });

  describe('buildDependencyGraph', () => {
    it('should build dependency graph from interfaces', () => {
      const userCode = `
export interface User {
  id: string;
  name: string;
}
`;

      const orderCode = `
export interface Order {
  id: string;
  user: User;
  total: number;
}
`;

      const userInterfaces = analyzer.analyzeFile('src/User.ts', userCode);
      const orderInterfaces = analyzer.analyzeFile('src/Order.ts', orderCode);

      const allInterfaces = [...userInterfaces, ...orderInterfaces];
      const graph = mapper.buildDependencyGraph(allInterfaces);

      expect(graph.interfaces.size).toBe(2);
      expect(graph.dependencies.length).toBeGreaterThan(0);
    });

    it('should detect extends dependencies', () => {
      const baseCode = `
export interface BaseEntity {
  id: string;
  createdAt: Date;
}
`;

      const userCode = `
export interface User extends BaseEntity {
  name: string;
}
`;

      const baseInterfaces = analyzer.analyzeFile('src/BaseEntity.ts', baseCode);
      const userInterfaces = analyzer.analyzeFile('src/User.ts', userCode);

      const graph = mapper.buildDependencyGraph([...baseInterfaces, ...userInterfaces]);

      const extendsDeps = graph.dependencies.filter((d) => d.dependencyType === 'extends');
      expect(extendsDeps.length).toBe(1);
      expect(extendsDeps[0].from).toBe('User');
      expect(extendsDeps[0].to).toBe('BaseEntity');
    });

    it('should detect composition dependencies', () => {
      const addressCode = `
export interface Address {
  street: string;
  city: string;
}
`;

      const userCode = `
export interface User {
  id: string;
  address: Address;
}
`;

      const addressInterfaces = analyzer.analyzeFile('src/Address.ts', addressCode);
      const userInterfaces = analyzer.analyzeFile('src/User.ts', userCode);

      const graph = mapper.buildDependencyGraph([...addressInterfaces, ...userInterfaces]);

      const compositionDeps = graph.dependencies.filter((d) => d.dependencyType === 'composition');
      expect(compositionDeps.length).toBe(1);
      expect(compositionDeps[0].from).toBe('User');
      expect(compositionDeps[0].to).toBe('Address');
      expect(compositionDeps[0].via).toBe('address');
    });

    it('should detect parameter dependencies', () => {
      const userCode = `
export interface User {
  id: string;
}
`;

      const repoCode = `
export interface UserRepository {
  save(user: User): Promise<void>;
}
`;

      const userInterfaces = analyzer.analyzeFile('src/User.ts', userCode);
      const repoInterfaces = analyzer.analyzeFile('src/UserRepository.ts', repoCode);

      const graph = mapper.buildDependencyGraph([...userInterfaces, ...repoInterfaces]);

      const paramDeps = graph.dependencies.filter((d) => d.dependencyType === 'parameter');
      expect(paramDeps.length).toBeGreaterThanOrEqual(1);

      const saveDep = paramDeps.find((d) => d.via?.includes('save'));
      expect(saveDep).toBeDefined();
      expect(saveDep?.from).toBe('UserRepository');
      expect(saveDep?.to).toBe('User');
    });

    it('should detect return type dependencies', () => {
      const userCode = `
export interface User {
  id: string;
}
`;

      const repoCode = `
export interface UserRepository {
  findById(id: string): Promise<User>;
}
`;

      const userInterfaces = analyzer.analyzeFile('src/User.ts', userCode);
      const repoInterfaces = analyzer.analyzeFile('src/UserRepository.ts', repoCode);

      const graph = mapper.buildDependencyGraph([...userInterfaces, ...repoInterfaces]);

      const returnDeps = graph.dependencies.filter((d) => d.dependencyType === 'return');
      expect(returnDeps.length).toBeGreaterThanOrEqual(1);

      const findDep = returnDeps.find((d) => d.via === 'findById');
      expect(findDep).toBeDefined();
      expect(findDep?.from).toBe('UserRepository');
      expect(findDep?.to).toBe('User');
    });

    it('should filter out built-in types', () => {
      const code = `
export interface Config {
  data: Map<string, Array<number>>;
  promise: Promise<string>;
}
`;

      const interfaces = analyzer.analyzeFile('src/Config.ts', code);
      const graph = mapper.buildDependencyGraph(interfaces);

      // Should not have dependencies to Map, Array, Promise
      const builtInDeps = graph.dependencies.filter((d) =>
        ['Map', 'Array', 'Promise', 'String', 'Number'].includes(d.to)
      );

      expect(builtInDeps.length).toBe(0);
    });
  });

  describe('getDependencies', () => {
    it('should get dependencies for an interface', () => {
      const code = `
export interface Address {
  street: string;
}

export interface User {
  id: string;
  address: Address;
}
`;

      const interfaces = analyzer.analyzeFile('src/test.ts', code);
      const graph = mapper.buildDependencyGraph(interfaces);

      const userDeps = mapper.getDependencies('User', graph);

      expect(userDeps.length).toBe(1);
      expect(userDeps[0].to).toBe('Address');
    });
  });

  describe('getDependents', () => {
    it('should get dependents of an interface', () => {
      const code = `
export interface Address {
  street: string;
}

export interface User {
  id: string;
  address: Address;
}
`;

      const interfaces = analyzer.analyzeFile('src/test.ts', code);
      const graph = mapper.buildDependencyGraph(interfaces);

      const addressDependents = mapper.getDependents('Address', graph);

      expect(addressDependents.length).toBe(1);
      expect(addressDependents[0].from).toBe('User');
    });
  });

  describe('findCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const code = `
export interface A {
  b: B;
}

export interface B {
  a: A;
}
`;

      const interfaces = analyzer.analyzeFile('src/test.ts', code);
      const graph = mapper.buildDependencyGraph(interfaces);

      const cycles = mapper.findCircularDependencies(graph);

      expect(cycles.length).toBeGreaterThan(0);
      // Should find A -> B -> A cycle
      const cycle = cycles.find((c) => c.includes('A') && c.includes('B'));
      expect(cycle).toBeDefined();
    });

    it('should not find cycles when there are none', () => {
      const code = `
export interface Address {
  street: string;
}

export interface User {
  id: string;
  address: Address;
}
`;

      const interfaces = analyzer.analyzeFile('src/test.ts', code);
      const graph = mapper.buildDependencyGraph(interfaces);

      const cycles = mapper.findCircularDependencies(graph);

      expect(cycles.length).toBe(0);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate coupling metrics', () => {
      const code = `
export interface A {
  id: string;
}

export interface B {
  a: A;
}

export interface C {
  a: A;
}
`;

      const interfaces = analyzer.analyzeFile('src/test.ts', code);
      const graph = mapper.buildDependencyGraph(interfaces);

      const metricsA = mapper.calculateMetrics('A', graph);
      const metricsB = mapper.calculateMetrics('B', graph);

      // A has no efferent (outgoing) dependencies
      expect(metricsA.efferentCoupling).toBe(0);

      // A has 2 afferent (incoming) dependencies (B and C depend on it)
      expect(metricsA.afferentCoupling).toBe(2);

      // A is stable (instability = 0 / (0 + 2) = 0)
      expect(metricsA.instability).toBe(0);

      // B has 1 efferent dependency (to A)
      expect(metricsB.efferentCoupling).toBe(1);

      // B has 0 afferent dependencies
      expect(metricsB.afferentCoupling).toBe(0);

      // B is unstable (instability = 1 / (1 + 0) = 1)
      expect(metricsB.instability).toBe(1);
    });
  });

  describe('Enhanced Type Analysis', () => {
    describe('Union Types', () => {
      it('should detect union type relationships', () => {
        const code = `
export interface User {
  id: string;
}

export interface Admin {
  id: string;
}

export interface Response {
  data: User | Admin;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const responseDeps = mapper.getDependencies('Response', graph);

        // Should find dependencies to both User and Admin
        const userDep = responseDeps.find((d) => d.to === 'User');
        const adminDep = responseDeps.find((d) => d.to === 'Admin');

        expect(userDep).toBeDefined();
        expect(userDep?.typeRelation).toBe('union');

        expect(adminDep).toBeDefined();
        expect(adminDep?.typeRelation).toBe('union');
      });
    });

    describe('Intersection Types', () => {
      it('should detect intersection type relationships', () => {
        const code = `
export interface User {
  name: string;
}

export interface Permissions {
  canEdit: boolean;
}

export interface AdminUser {
  profile: User & Permissions;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const adminUserDeps = mapper.getDependencies('AdminUser', graph);

        const userDep = adminUserDeps.find((d) => d.to === 'User');
        const permsDep = adminUserDeps.find((d) => d.to === 'Permissions');

        expect(userDep?.typeRelation).toBe('intersection');
        expect(permsDep?.typeRelation).toBe('intersection');
      });
    });

    describe('Generic Types', () => {
      it('should preserve generic context', () => {
        const code = `
export interface User {
  id: string;
}

export interface DataService {
  fetchData(): Promise<User>;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const serviceDeps = mapper.getDependencies('DataService', graph);
        const userDep = serviceDeps.find((d) => d.to === 'User');

        expect(userDep).toBeDefined();
        expect(userDep?.typeRelation).toBe('generic-param');
        expect(userDep?.genericContext).toContain('Promise');
      });

      it('should handle nested generics', () => {
        const code = `
export interface User {
  id: string;
}

export interface Cache {
  data: Map<string, User>;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const cacheDeps = mapper.getDependencies('Cache', graph);
        const userDep = cacheDeps.find((d) => d.to === 'User');

        expect(userDep).toBeDefined();
        expect(userDep?.typeRelation).toBe('generic-param');
      });
    });

    describe('Array Types', () => {
      it('should detect array element types', () => {
        const code = `
export interface User {
  id: string;
}

export interface UserList {
  users: User[];
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const listDeps = mapper.getDependencies('UserList', graph);
        const userDep = listDeps.find((d) => d.to === 'User');

        expect(userDep).toBeDefined();
        expect(userDep?.typeRelation).toBe('array');
      });
    });

    describe('Data Flow Direction', () => {
      it('should identify input data flow for parameters', () => {
        const code = `
export interface UserDTO {
  name: string;
}

export interface UserService {
  createUser(dto: UserDTO): void;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const serviceDeps = mapper.getDependencies('UserService', graph);
        const paramDep = serviceDeps.find((d) => d.dependencyType === 'parameter');

        expect(paramDep).toBeDefined();
        expect(paramDep?.dataFlow).toBe('input');
      });

      it('should identify output data flow for return types', () => {
        const code = `
export interface User {
  id: string;
}

export interface UserService {
  getUser(id: string): User;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const serviceDeps = mapper.getDependencies('UserService', graph);
        const returnDep = serviceDeps.find((d) => d.dependencyType === 'return');

        expect(returnDep).toBeDefined();
        expect(returnDep?.dataFlow).toBe('output');
      });

      it('should identify output data flow for properties', () => {
        const code = `
export interface User {
  id: string;
}

export interface UserContainer {
  user: User;
}
`;

        const interfaces = analyzer.analyzeFile('src/test.ts', code);
        const graph = mapper.buildDependencyGraph(interfaces);

        const containerDeps = mapper.getDependencies('UserContainer', graph);
        const propDep = containerDeps.find((d) => d.dependencyType === 'composition');

        expect(propDep).toBeDefined();
        expect(propDep?.dataFlow).toBe('output');
      });
    });
  });
});
