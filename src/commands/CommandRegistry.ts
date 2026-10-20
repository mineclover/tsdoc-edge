/**
 * Command registry for CLI command management
 * @packageDocumentation
 */

import type { BaseCommand } from './BaseCommand';

/** Creates a command instance on first use. */
export type CommandFactory = () => BaseCommand;

/** A registered command: either a ready instance or a factory that builds it once. */
interface CommandRegistration {
  readonly factory: CommandFactory;
  instance?: BaseCommand;
}

/**
 * Registry for managing CLI commands
 *
 * @doc [[CommandRegistry]]
 * @public
 * @responsibility Register and retrieve CLI commands
 * @contract Provide command lookup and listing
 *
 * @problem Need centralized command management without circular dependencies
 * @solves Registry pattern with lazy command instantiation
 * @context 40+ commands need organized registration and retrieval
 *
 * @functionality
 * - Command registration: Add command instances, or lazy factories keyed by name and aliases
 * - Command retrieval: Get command by name, instantiating lazy commands on first use
 * - Command listing: Get all registered commands
 * - Name listing: List names and aliases without instantiating anything
 *
 * @decision Register lazy commands by declared name/aliases instead of probing a factory
 * @rationale Probing a factory to learn a command's name would load every command module at startup
 * @consequences Declared names must match the command's own getName()/getAlias()
 *
 * @depends BaseCommand
 * @depType internal
 * @depReason Base interface for all commands
 */
export class CommandRegistry {
  private commands: Map<string, CommandRegistration>;

  constructor() {
    this.commands = new Map();
  }

  /**
   * Register a command instance
   *
   * @param command - Command instance
   * @returns void - No return value
   */
  register(command: BaseCommand): void {
    this.registerKeys([command.getName(), ...command.getAlias()], {
      factory: () => command,
      instance: command,
    });
  }

  /**
   * Register a command that is only instantiated when it is first requested
   *
   * Later registrations win when a name or alias is declared twice, exactly like
   * {@link CommandRegistry.register}.
   *
   * @param name - Primary command name
   * @param aliases - Alternative names for the command
   * @param factory - Builds the command; called at most once
   * @returns void - No return value
   */
  registerLazy(name: string, aliases: readonly string[], factory: CommandFactory): void {
    this.registerKeys([name, ...aliases], { factory });
  }

  /**
   * Get command by name, instantiating it if it was registered lazily
   *
   * @param name - Command name
   * @returns Command instance or undefined
   */
  get(name: string): BaseCommand | undefined {
    const registration = this.commands.get(name);
    if (!registration) return undefined;
    registration.instance ??= registration.factory();
    return registration.instance;
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
   * Get all registered commands (deduplicated)
   *
   * Instantiates every lazily registered command, so prefer {@link CommandRegistry.getNames}
   * when only names are needed.
   *
   * @returns Array of unique commands
   */
  getAll(): BaseCommand[] {
    const seen = new Set<CommandRegistration>();
    const result: BaseCommand[] = [];
    for (const name of this.commands.keys()) {
      const registration = this.commands.get(name);
      if (!registration || seen.has(registration)) continue;
      seen.add(registration);
      const command = this.get(name);
      if (command) result.push(command);
    }
    return result;
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

  private registerKeys(keys: readonly string[], registration: CommandRegistration): void {
    for (const key of keys) {
      this.commands.set(key, registration);
    }
  }
}
