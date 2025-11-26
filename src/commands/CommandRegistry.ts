/**
 * Command registry for CLI command management
 * @packageDocumentation
 */

import type { BaseCommand } from './BaseCommand';

/**
 * Registry for managing CLI commands
 *
 * @public
 * @responsibility Register and retrieve CLI commands
 * @contract Provide command lookup and listing
 *
 * @problem Need centralized command management without circular dependencies
 * @solves Registry pattern with lazy command instantiation
 * @context 40+ commands need organized registration and retrieval
 *
 * @functionality
 * - Command registration: Add commands with name keys
 * - Command retrieval: Get command by name
 * - Command listing: Get all registered commands
 * - Help text generation: List available commands with descriptions
 *
 * @decision Use Map with lazy instantiation
 * @rationale Avoids loading all command dependencies upfront, reduces startup time
 * @consequences Slightly more complex registration, but better performance
 *
 * @depends BaseCommand
 * @depType internal
 * @depReason Base interface for all commands
 */
export class CommandRegistry {
  private commands: Map<string, BaseCommand>;

  constructor() {
    this.commands = new Map();
  }

  /**
   * Register a command
   *
   * @param command - Command instance
   * @returns void - No return value
   */
  register(command: BaseCommand): void {
    // Register main command name
    this.commands.set(command.getName(), command);

    // Register aliases
    const aliases = command.getAlias();
    for (const alias of aliases) {
      this.commands.set(alias, command);
    }
  }

  /**
   * Get command by name
   *
   * @param name - Command name
   * @returns Command instance or undefined
   */
  get(name: string): BaseCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Check if command exists
   *
   * @param name - Command name
   * @returns True if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Get all registered commands
   *
   * @returns Array of commands
   */
  getAll(): BaseCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get all command names
   *
   * @returns Array of command names
   */
  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get commands count
   *
   * @returns Number of registered commands
   */
  count(): number {
    return this.commands.size;
  }
}
