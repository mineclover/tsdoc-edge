/**
 * Tests for InterfaceAnalyzer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { InterfaceAnalyzer } from '../../analyzer/InterfaceAnalyzer';
import type { Symbol } from '../../types/graph';

describe('InterfaceAnalyzer', () => {
  let analyzer: InterfaceAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new InterfaceAnalyzer();
    tempDir = path.join(process.cwd(), '.test-temp', `interface-analyzer-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create InterfaceAnalyzer with default options', () => {
      expect(analyzer).toBeDefined();
    });

    it('should accept custom options', () => {
      const customAnalyzer = new InterfaceAnalyzer({
        includePrivate: true,
        inferDomainFromPath: false,
      });

      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('analyzeFile', () => {
    it('should analyze simple interface', () => {
      const testFile = path.join(tempDir, 'simple.ts');
      fs.writeFileSync(
        testFile,
        `
export interface User {
  id: string;
  name: string;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results.length).toBe(1);
      expect(results[0].symbol.name).toBe('User');
      expect(results[0].properties.length).toBe(2);
    });

    it('should extract properties with types', () => {
      const testFile = path.join(tempDir, 'properties.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Product {
  id: number;
  name: string;
  price?: number;
  readonly created: Date;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].properties.length).toBe(4);
      expect(results[0].properties[0].name).toBe('id');
      expect(results[0].properties[0].type).toBe('number');
      expect(results[0].properties[2].isOptional).toBe(true);
      expect(results[0].properties[3].isReadonly).toBe(true);
    });

    it('should extract methods with parameters', () => {
      const testFile = path.join(tempDir, 'methods.ts');
      fs.writeFileSync(
        testFile,
        `
export interface UserService {
  getUser(id: string): User;
  createUser(name: string, age: number): User;
  deleteUser(id: string): void;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].methods.length).toBe(3);
      expect(results[0].methods[0].name).toBe('getUser');
      expect(results[0].methods[0].parameters.length).toBe(1);
      expect(results[0].methods[0].returnType).toBe('User');
      expect(results[0].methods[1].parameters.length).toBe(2);
    });

    it('should extract extends clause', () => {
      const testFile = path.join(tempDir, 'extends.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Admin extends User, Permissions {
  role: string;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].extends.length).toBe(2);
      expect(results[0].extends).toContain('User');
      expect(results[0].extends).toContain('Permissions');
    });

    it('should extract type parameters', () => {
      const testFile = path.join(tempDir, 'generics.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Container<T, K> {
  value: T;
  key: K;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].typeParameters.length).toBe(2);
      expect(results[0].typeParameters).toContain('T');
      expect(results[0].typeParameters).toContain('K');
    });

    it('should extract JSDoc documentation', () => {
      const testFile = path.join(tempDir, 'documented.ts');
      fs.writeFileSync(
        testFile,
        `
export interface User {
  /**
   * User identifier
   */
  id: string;

  /**
   * User name
   */
  name: string;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].properties[0].documentation).toContain('User identifier');
      expect(results[0].properties[1].documentation).toContain('User name');
    });

    it('should exclude private interfaces by default', () => {
      const testFile = path.join(tempDir, 'private.ts');
      fs.writeFileSync(
        testFile,
        `
interface _PrivateInterface {
  data: string;
}

export interface PublicInterface {
  value: string;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results.length).toBe(1);
      expect(results[0].symbol.name).toBe('PublicInterface');
    });

    it('should include private interfaces when configured', () => {
      const includePrivateAnalyzer = new InterfaceAnalyzer({ includePrivate: true });
      const testFile = path.join(tempDir, 'private-included.ts');
      fs.writeFileSync(
        testFile,
        `
interface _PrivateInterface {
  data: string;
}

export interface PublicInterface {
  value: string;
}
`,
        'utf-8'
      );

      const results = includePrivateAnalyzer.analyzeFile(
        testFile,
        fs.readFileSync(testFile, 'utf-8')
      );

      expect(results.length).toBe(2);
    });

    it('should handle empty interfaces', () => {
      const testFile = path.join(tempDir, 'empty.ts');
      fs.writeFileSync(
        testFile,
        `
export interface EmptyInterface {}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results.length).toBe(1);
      expect(results[0].properties.length).toBe(0);
      expect(results[0].methods.length).toBe(0);
    });

    it('should use existing symbols if provided', () => {
      const testFile = path.join(tempDir, 'existing.ts');
      const sourceCode = `export interface User {
  id: string;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const existingSymbol: Symbol = {
        id: 'existing-user',
        name: 'User',
        type: 'interface',
        filePath: testFile,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const results = analyzer.analyzeFile(testFile, sourceCode, [existingSymbol]);

      // When existing symbol matches (name, type, filePath), it should be reused
      // The match is based on name and type and filePath
      expect(results.length).toBe(1);
      expect(results[0].symbol.name).toBe('User');
      expect(results[0].symbol.type).toBe('interface');
      // ID should be the existing symbol's ID when matched
      expect(results[0].symbol.id).toBe('existing-user');
    });

    it('should handle non-exported interfaces', () => {
      const includePrivateAnalyzer = new InterfaceAnalyzer({ includePrivate: true });
      const testFile = path.join(tempDir, 'non-exported.ts');
      fs.writeFileSync(
        testFile,
        `
interface InternalInterface {
  value: string;
}
`,
        'utf-8'
      );

      const results = includePrivateAnalyzer.analyzeFile(
        testFile,
        fs.readFileSync(testFile, 'utf-8')
      );

      expect(results.length).toBe(1);
      expect(results[0].symbol.isExported).toBe(false);
    });
  });

  describe('getImportInfo', () => {
    it('should extract import information', () => {
      const testFile = path.join(tempDir, 'imports.ts');
      fs.writeFileSync(
        testFile,
        `
import type { User } from './user';
import { Product } from '../models';

export interface Store {
  users: User[];
  products: Product[];
}
`,
        'utf-8'
      );

      analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      const userImport = analyzer.getImportInfo('User');
      const productImport = analyzer.getImportInfo('Product');

      expect(userImport).toBeDefined();
      expect(userImport?.source).toBe('./user');
      expect(userImport?.isTypeOnly).toBe(true);
      expect(productImport).toBeDefined();
      expect(productImport?.source).toBe('../models');
    });

    it('should return undefined for non-existent imports', () => {
      const testFile = path.join(tempDir, 'no-imports.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Simple {
  value: string;
}
`,
        'utf-8'
      );

      analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      const result = analyzer.getImportInfo('NonExistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getTypeChecker', () => {
    it('should return TypeChecker after analysis', () => {
      const testFile = path.join(tempDir, 'checker.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Test {
  value: string;
}
`,
        'utf-8'
      );

      analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      const checker = analyzer.getTypeChecker();

      expect(checker).not.toBeNull();
    });

    it('should return null before analysis', () => {
      const newAnalyzer = new InterfaceAnalyzer();
      const checker = newAnalyzer.getTypeChecker();

      expect(checker).toBeNull();
    });
  });

  describe('domain inference', () => {
    it('should infer domain from path', () => {
      const testFile = path.join(tempDir, 'domain', 'user', 'User.ts');
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(
        testFile,
        `
export interface User {
  id: string;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].domain).toBeDefined();
      expect(results[0].domain).toBe('user');
    });

    it('should infer domain role from name', () => {
      const testFile = path.join(tempDir, 'roles.ts');
      fs.writeFileSync(
        testFile,
        `
export interface UserEntity {
  id: string;
}

export interface UserService {
  getUser(id: string): User;
}

export interface UserRepository {
  findById(id: string): User;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].domainRole).toBe('Entity');
      expect(results[1].domainRole).toBe('Service');
      expect(results[2].domainRole).toBe('Repository');
    });

    it('should infer domain role from structure', () => {
      const testFile = path.join(tempDir, 'structure.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Account {
  id: string;
  name: string;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].domainRole).toBe('Entity');
      expect(results[1].domainRole).toBe('ValueObject');
    });

    it('should disable domain inference when configured', () => {
      const noDomainAnalyzer = new InterfaceAnalyzer({
        inferDomainFromPath: false,
        inferDomainRole: false,
      });
      const testFile = path.join(tempDir, 'no-domain.ts');
      fs.writeFileSync(
        testFile,
        `
export interface UserEntity {
  id: string;
}
`,
        'utf-8'
      );

      const results = noDomainAnalyzer.analyzeFile(
        testFile,
        fs.readFileSync(testFile, 'utf-8')
      );

      expect(results[0].domain).toBeUndefined();
      expect(results[0].domainRole).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle optional method parameters', () => {
      const testFile = path.join(tempDir, 'optional-params.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Service {
  doSomething(required: string, optional?: number): void;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].methods[0].parameters[0].isOptional).toBe(false);
      expect(results[0].methods[0].parameters[1].isOptional).toBe(true);
    });

    it('should handle complex type references', () => {
      const testFile = path.join(tempDir, 'complex-types.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Complex {
  array: string[];
  tuple: [string, number];
  union: string | number;
  intersection: A & B;
  generic: Promise<User>;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results[0].properties.length).toBe(5);
      expect(results[0].properties[0].type).toBe('string[]');
    });

    it('should handle multiple interfaces in one file', () => {
      const testFile = path.join(tempDir, 'multiple.ts');
      fs.writeFileSync(
        testFile,
        `
export interface First {
  a: string;
}

export interface Second {
  b: number;
}

export interface Third {
  c: boolean;
}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results.length).toBe(3);
      expect(results[0].symbol.name).toBe('First');
      expect(results[1].symbol.name).toBe('Second');
      expect(results[2].symbol.name).toBe('Third');
    });

    it('should handle interfaces without any members', () => {
      const testFile = path.join(tempDir, 'marker.ts');
      fs.writeFileSync(
        testFile,
        `
export interface Marker {}
`,
        'utf-8'
      );

      const results = analyzer.analyzeFile(testFile, fs.readFileSync(testFile, 'utf-8'));

      expect(results.length).toBe(1);
      expect(results[0].properties.length).toBe(0);
      expect(results[0].methods.length).toBe(0);
    });
  });
});
