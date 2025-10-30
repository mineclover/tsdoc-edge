/**
 * InterfaceAnalyzer tests
 * @public
 */

import { InterfaceAnalyzer } from '../analyzer/InterfaceAnalyzer';

describe('InterfaceAnalyzer', () => {
  let analyzer: InterfaceAnalyzer;

  beforeEach(() => {
    analyzer = new InterfaceAnalyzer({
      includePrivate: false,
      inferDomainFromPath: true,
      inferDomainRole: true,
    });
  });

  describe('analyzeFile', () => {
    it('should analyze a simple interface', () => {
      const sourceCode = `
/**
 * User entity
 */
export interface User {
  id: string;
  name: string;
  email: string;
}
`;

      const interfaces = analyzer.analyzeFile('src/domain/user/User.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].symbol.name).toBe('User');
      expect(interfaces[0].properties).toHaveLength(3);
      expect(interfaces[0].properties[0].name).toBe('id');
      expect(interfaces[0].properties[1].name).toBe('name');
      expect(interfaces[0].properties[2].name).toBe('email');
    });

    it('should extract interface methods', () => {
      const sourceCode = `
export interface UserRepository {
  findById(id: string): Promise<User>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<boolean>;
}
`;

      const interfaces = analyzer.analyzeFile('src/domain/user/UserRepository.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].methods).toHaveLength(3);

      const findById = interfaces[0].methods[0];
      expect(findById.name).toBe('findById');
      expect(findById.parameters).toHaveLength(1);
      expect(findById.parameters[0].name).toBe('id');
      expect(findById.parameters[0].type).toBe('string');
      expect(findById.returnType).toBe('Promise<User>');
    });

    it('should extract extends clause', () => {
      const sourceCode = `
export interface AdminUser extends User {
  role: string;
  permissions: string[];
}
`;

      const interfaces = analyzer.analyzeFile('src/domain/user/AdminUser.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].extends).toContain('User');
      expect(interfaces[0].properties).toHaveLength(2);
    });

    it('should extract type parameters', () => {
      const sourceCode = `
export interface Repository<T, ID> {
  findById(id: ID): Promise<T>;
  save(entity: T): Promise<void>;
}
`;

      const interfaces = analyzer.analyzeFile('src/domain/Repository.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].typeParameters).toEqual(['T', 'ID']);
    });

    it('should infer domain from file path', () => {
      const sourceCode = `
export interface Order {
  id: string;
  total: number;
}
`;

      const interfaces = analyzer.analyzeFile('src/domain/order/Order.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].domain).toBe('order');
    });

    it('should infer domain role from naming', () => {
      const testCases = [
        { name: 'UserEntity', expected: 'Entity' },
        { name: 'OrderRepository', expected: 'Repository' },
        { name: 'PaymentService', expected: 'Service' },
        { name: 'UserFactory', expected: 'Factory' },
        { name: 'OrderCreatedEvent', expected: 'DomainEvent' },
      ];

      for (const testCase of testCases) {
        const sourceCode = `
export interface ${testCase.name} {
  id: string;
}
`;
        const interfaces = analyzer.analyzeFile('src/test.ts', sourceCode);
        expect(interfaces[0].domainRole).toBe(testCase.expected);
      }
    });

    it('should exclude private interfaces by default', () => {
      const sourceCode = `
export interface PublicInterface {
  id: string;
}

interface _PrivateInterface {
  secret: string;
}
`;

      const interfaces = analyzer.analyzeFile('src/test.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].symbol.name).toBe('PublicInterface');
    });

    it('should include private interfaces when configured', () => {
      const privateAnalyzer = new InterfaceAnalyzer({ includePrivate: true });

      const sourceCode = `
export interface PublicInterface {
  id: string;
}

interface _PrivateInterface {
  secret: string;
}
`;

      const interfaces = privateAnalyzer.analyzeFile('src/test.ts', sourceCode);

      expect(interfaces).toHaveLength(2);
    });

    it('should handle optional and readonly properties', () => {
      const sourceCode = `
export interface Config {
  readonly apiUrl: string;
  timeout?: number;
  retries: number;
}
`;

      const interfaces = analyzer.analyzeFile('src/Config.ts', sourceCode);

      expect(interfaces).toHaveLength(1);

      const props = interfaces[0].properties;
      expect(props[0].isReadonly).toBe(true);
      expect(props[0].isOptional).toBe(false);

      expect(props[1].isReadonly).toBe(false);
      expect(props[1].isOptional).toBe(true);

      expect(props[2].isReadonly).toBe(false);
      expect(props[2].isOptional).toBe(false);
    });

    it('should extract property documentation', () => {
      const sourceCode = `
export interface User {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * User's full name
   */
  name: string;
}
`;

      const interfaces = analyzer.analyzeFile('src/User.ts', sourceCode);

      expect(interfaces).toHaveLength(1);
      expect(interfaces[0].properties[0].documentation).toBe('Unique identifier');
      expect(interfaces[0].properties[1].documentation).toBe("User's full name");
    });
  });
});
