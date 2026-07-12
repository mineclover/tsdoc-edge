/**
 * Test fixtures for verifying rarely-used relationship type detection
 *
 * This file contains examples for:
 * 1. event-flow - EventEmitter patterns
 * 2. layer-dependency - Architecture layer violations
 * 3. module-boundary - Cross-module dependencies
 * 4. generic-constraint - T extends U patterns
 * 5. integration-verification - Integration test patterns
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'node:events';

// ============================================================================
// 1. EVENT-FLOW: EventEmitter patterns
// ============================================================================

/**
 * Event producer that emits data-ready events
 */
export class DataProducer extends EventEmitter {
  /**
   * produceData method
   * @returns void - No return value
   */
  produceData(): void {
    const data = { value: 42 };
    this.emit('data-ready', data);
  }

  /**
   * notifyError method
   * @param error - error parameter
   * @returns void - No return value
   */
  notifyError(error: Error): void {
    this.emit('error', error);
  }
}

/**
 * Event consumer that listens for data-ready events
 */
export class DataConsumer {
  constructor(producer: DataProducer) {
    producer.on('data-ready', (data) => {
      this.handleData(data);
    });
    producer.on('error', (err) => {
      this.handleError(err);
    });
  }

  /**
   * handleData method
   * @param data - data parameter
   * @returns void - No return value
   */
  handleData(data: { value: number }): void {
    console.log('Received data:', data);
  }

  /**
   * handleError method
   * @param error - error parameter
   * @returns void - No return value
   */
  handleError(error: Error): void {
    console.error('Error:', error);
  }
}

// ============================================================================
// 2. LAYER-DEPENDENCY: Architecture layer patterns
// ============================================================================

// Repository layer (data access)
/**
 * UserRepository class
 */
export class UserRepository {
  /**
   * findById method
   * @param id - id parameter
   * @returns Returns { id: string; name: string } | null
   */
  findById(id: string): { id: string; name: string } | null {
    return { id, name: 'User' };
  }
}

// Service layer (business logic)
/**
 * UserService class
 */
export class UserService {
  constructor(private repository: UserRepository) {}

  /**
   * getUser method
   * @param id - id parameter
   * @returns Returns { id: string; name: string } | null
   */
  getUser(id: string): { id: string; name: string } | null {
    return this.repository.findById(id);
  }
}

// Controller layer (presentation)
/**
 * UserController class
 */
export class UserController {
  constructor(private service: UserService) {}

  /**
   * handleGetUser method
   * @param id - id parameter
   * @returns Returns string
   */
  handleGetUser(id: string): string {
    const user = this.service.getUser(id);
    return JSON.stringify(user);
  }
}

// Layer violation example: Controller directly accessing Repository
/**
 * BadController class
 */
export class BadController {
  // This should be detected as layer-dependency violation
  constructor(private repository: UserRepository) {}

  /**
   * handleRequest method
   * @param id - id parameter
   * @returns Returns string
   */
  handleRequest(id: string): string {
    // Controller skipping Service layer
    const user = this.repository.findById(id);
    return JSON.stringify(user);
  }
}

// ============================================================================
// 3. MODULE-BOUNDARY: Cross-module dependencies
// ============================================================================

// Module A
export namespace ModuleA {
  /**
   * Config interface
   */
  export interface Config {
    apiUrl: string;
  }

  /**
   * Client class
   */
  export class Client {
    constructor(_config: Config) {}

    /**
     * fetch method
     * @returns Returns Promise<void>
     */
    fetch(): Promise<void> {
      return Promise.resolve();
    }
  }
}

// Module B depends on Module A
export namespace ModuleB {
  /**
   * Service class
   */
  export class Service {
    private client: ModuleA.Client;

    constructor() {
      // Cross-module dependency
      this.client = new ModuleA.Client({ apiUrl: 'http://api.example.com' });
    }

    /**
     * getData method
     * @returns Returns Promise<void>
     */
    async getData(): Promise<void> {
      await this.client.fetch();
    }
  }
}

// ============================================================================
// 4. GENERIC-CONSTRAINT: T extends U patterns
// ============================================================================

/**
 * Base entity interface
 */
export interface Entity {
  id: string;
  createdAt: Date;
}

/**
 * Repository with generic constraint
 * @template T - Entity type that extends Entity interface
 */
export class Repository<T extends Entity> {
  private items: Map<string, T> = new Map();

  /**
   * save method
   * @param item - item parameter
   * @returns void - No return value
   */
  save(item: T): void {
    this.items.set(item.id, item);
  }

  /**
   * findById method
   * @param id - id parameter
   * @returns Returns T | undefined
   */
  findById(id: string): T | undefined {
    return this.items.get(id);
  }

  /**
   * findAll method
   * @returns Returns T[]
   */
  findAll(): T[] {
    return Array.from(this.items.values());
  }
}

/**
 * User entity extends Entity
 */
export interface User extends Entity {
  name: string;
  email: string;
}

/**
 * Typed user repository
 */
export class UserEntityRepository extends Repository<User> {
  /**
   * findByEmail method
   * @param email - email parameter
   * @returns Returns User | undefined
   */
  findByEmail(email: string): User | undefined {
    return this.findAll().find((u) => u.email === email);
  }
}

/**
 * Generic function with constraint
 * @param a - a parameter
 * @param b - b parameter
 * @returns Returns T & U
 */
export function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

/**
 * Complex generic constraint
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// ============================================================================
// 5. INTEGRATION-VERIFICATION: Integration test patterns
// ============================================================================

/**
 * Integration between UserService and UserRepository
 * This tests the connection between two components
 * @returns Returns boolean
 */
export function testUserServiceIntegration(): boolean {
  const repository = new UserRepository();
  const service = new UserService(repository);

  const user = service.getUser('123');
  return user !== null;
}

/**
 * Integration test for event flow
 * @returns Returns Promise<boolean>
 */
export function testEventFlowIntegration(): Promise<boolean> {
  return new Promise((resolve) => {
    const producer = new DataProducer();
    let received = false;

    producer.on('data-ready', () => {
      received = true;
      resolve(true);
    });

    producer.produceData();

    setTimeout(() => {
      if (!received) resolve(false);
    }, 100);
  });
}

/**
 * Integration test verifying ModuleA and ModuleB work together
 * @returns Returns Promise<boolean>
 */
export async function testModuleBoundaryIntegration(): Promise<boolean> {
  try {
    const service = new ModuleB.Service();
    await service.getData();
    return true;
  } catch {
    return false;
  }
}
