/**
 * ID Generator for symbol identification
 *
 * @packageDocumentation
 * @doc [[IdGenerator]]
 * @responsibility Generate unique short IDs for symbols
 * @context Collision-free short base-36 symbol identifier allocator supporting sequential and random generation modes
 * @functionality Sequential and random short-ID generation, collision retry with automatic length expansion, and existing-ID registration
 */

/**
 * ID generation options
 *
 * @doc [[IdGenerator]]
 * @public
 */
export interface IdGeneratorOptions {
  /**
   * Start with sequential (001, 002, ...) or random (a3f, b2k, ...)
   * @defaultValue 'sequential'
   */
  mode?: 'random' | 'sequential';

  /**
   * Initial length of ID
   * @defaultValue 3
   */
  length?: number;

  /**
   * Character set to use (0-9a-z = 36 characters)
   * @defaultValue '0123456789abcdefghijklmnopqrstuvwxyz'
   */
  charset?: string;
}

/**
 * ID Generator
 *
 * @doc [[IdGenerator]]
 * @public
 * @responsibility Generate unique short IDs for symbols
 * @contract Generate unique short IDs without collision
 * @context Allocates compact base-36 identifiers while tracking previously issued IDs in memory
 * @functionality Generates sequential or random IDs, registers existing IDs, and expands ID width when capacity saturates
 * @sideEffect state: this.usedIds - Tracks allocated symbol IDs and advances sequential counter
 * @testScenario Sequential ID generation
 * @testScenario Random ID generation
 * @testScenario Collision prevention
 * @testScenario ID reuse prevention
 * @testScenario Custom charset support
 * @testScenario Capacity calculation
 */
export class IdGenerator {
  private readonly mode: 'random' | 'sequential';
  private readonly charset: string;
  private length: number;
  private usedIds: Set<string>;
  private sequentialCounter: number;

  constructor(options: IdGeneratorOptions = {}) {
    this.mode = options.mode || 'sequential';
    this.length = options.length || 3;
    this.charset = options.charset || '0123456789abcdefghijklmnopqrstuvwxyz';
    this.usedIds = new Set();
    this.sequentialCounter = 0;
  }

  /**
   * Generate a new unique ID
   * @returns Unique ID string
   * @postcondition ID is unique within this generator instance
   */
  generate(): string {
    const maxAttempts = 1000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const id = this.mode === 'random' ? this.generateRandom() : this.generateSequential();

      if (!this.usedIds.has(id)) {
        this.usedIds.add(id);
        return id;
      }

      attempts++;
    }

    // If collision after max attempts, increase length
    this.length++;
    return this.generate();
  }

  /**
   * Generate random ID
   * @returns Random ID of current length
   */
  private generateRandom(): string {
    let result = '';
    for (let i = 0; i < this.length; i++) {
      const randomIndex = Math.floor(Math.random() * this.charset.length);
      result += this.charset[randomIndex];
    }
    return result;
  }

  /**
   * Generate sequential ID
   * @returns Sequential ID (001, 002, ...)
   */
  private generateSequential(): string {
    const id = this.sequentialCounter.toString(this.charset.length);
    const padded = id.padStart(this.length, '0');
    this.sequentialCounter++;
    return padded;
  }

  /**
   * Register existing IDs to prevent collision
   * @param ids - Array of existing IDs
   * @returns void - No return value
   */
  registerExisting(ids: string[]): void {
    for (const id of ids) {
      this.usedIds.add(id);

      // Update sequential counter if in sequential mode
      if (this.mode === 'sequential') {
        const numValue = parseInt(id, this.charset.length);
        if (!Number.isNaN(numValue) && numValue >= this.sequentialCounter) {
          this.sequentialCounter = numValue + 1;
        }
      }
    }
  }

  /**
   * Check if ID is valid format
   * @param id - ID to validate
   * @returns True if valid
   */
  isValid(id: string): boolean {
    if (id.length < 3 || id.length > 5) {
      return false;
    }

    for (const char of id) {
      if (!this.charset.includes(char)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get current capacity (how many IDs can be generated)
   * @returns Number of possible IDs with current length
   */
  getCapacity(): number {
    return this.charset.length ** this.length;
  }

  /**
   * Get number of used IDs
   * @returns Number of IDs that have been generated
   */
  getUsedCount(): number {
    return this.usedIds.size;
  }

  /**
   * Get statistics
   * @returns Summary with mode, length, used, capacity, utilization
   */
  getStats(): {
    mode: string;
    length: number;
    used: number;
    capacity: number;
    utilization: number;
  } {
    const capacity = this.getCapacity();
    return {
      mode: this.mode,
      length: this.length,
      used: this.usedIds.size,
      capacity,
      utilization: (this.usedIds.size / capacity) * 100,
    };
  }

  /**
   * Reset generator state
   * @returns void - No return value
   */
  reset(): void {
    this.usedIds.clear();
    this.sequentialCounter = 0;
    this.length = 3;
  }
}
