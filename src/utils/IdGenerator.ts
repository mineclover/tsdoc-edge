/**
 * ID Generator for symbol identification
 * @packageDocumentation
 * @responsibility Generate unique short IDs for symbols
 */

/**
 * ID generation options
 */
export interface IdGeneratorOptions {
  /**
   * Start with sequential (001, 002, ...) or random (a3f, b2k, ...)
   * @default 'sequential'
   */
  mode?: 'random' | 'sequential';

  /**
   * Initial length of ID
   * @default 3
   */
  length?: number;

  /**
   * Character set to use (0-9a-z = 36 characters)
   * @default '0123456789abcdefghijklmnopqrstuvwxyz'
   */
  charset?: string;
}

/**
 * ID Generator
 *
 * @id 008
 * @public
 * @responsibility Generate unique short IDs for symbols
 * @contract Generate unique short IDs without collision
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
    /**
     * maxAttempts
     * @public
     */
    const maxAttempts = 1000;
    /**
     * attempts
     * @public
     */
    let attempts = 0;

    while (attempts < maxAttempts) {
      /**
       * id
       * @public
       */
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
    /**
     * result
     * @public
     */
    let result = '';
    /**
     * i
     * @public
     */
    for (let i = 0; i < this.length; i++) {
      /**
       * randomIndex
       * @public
       */
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
    /**
     * id
     * @public
     */
    const id = this.sequentialCounter.toString(this.charset.length);
    /**
     * padded
     * @public
     */
    const padded = id.padStart(this.length, '0');
    this.sequentialCounter++;
    return padded;
  }

  /**
   * Register existing IDs to prevent collision
   * @param ids - Array of existing IDs
   */
  registerExisting(ids: string[]): void {
    /**
     * id
     * @public
     */
    for (const id of ids) {
      this.usedIds.add(id);

      // Update sequential counter if in sequential mode
      if (this.mode === 'sequential') {
        /**
         * numValue
         * @public
         */
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

    /**
     * char
     * @public
     */
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
   * @returns Returns {
    mode: string;
    length: number;
    used: number;
    capacity: number;
    utilization: number;
  }
   */
  getStats(): {
    mode: string;
    length: number;
    used: number;
    capacity: number;
    utilization: number;
  } {
    /**
     * capacity
     * @public
     */
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
   */
  reset(): void {
    this.usedIds.clear();
    this.sequentialCounter = 0;
    this.length = 3;
  }
}
