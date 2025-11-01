/**
 * Istanbul coverage adapter
 * Supports Jest, Vitest, NYC, c8, and other Istanbul-compatible tools
 *
 * @packageDocumentation
 * @responsibility Provide Istanbul-format coverage adapter
 */

import { CoverageAdapter } from './CoverageSyncAdapter';
import { CoverageParser } from './CoverageParser';
import type { CoverageSummary } from './CoverageParser';

/**
 * Istanbul coverage adapter
 * Works with Jest, Vitest, NYC, c8, and other tools that output Istanbul format
 *
 * @public
 * @responsibility Parse Istanbul coverage format (coverage-final.json)
 *
 * @example
 * ```typescript
 * const adapter = new IstanbulCoverageAdapter();
 * const syncer = new CoverageSyncer(adapter);
 * const summary = syncer.parseCoverage('coverage/coverage-final.json');
 * ```
 */
export class IstanbulCoverageAdapter extends CoverageAdapter {
  private parser: CoverageParser;

  constructor() {
    super();
    this.parser = new CoverageParser();
  }

  /**
   * Parse Istanbul coverage format
   *
   * @param coveragePath - Path to coverage-final.json
   * @returns Coverage summary
   */
  parseCoverage(coveragePath: string): CoverageSummary {
    return this.parser.parse(coveragePath);
  }

  /**
   * Get adapter name
   * @returns Returns string
   */
  getName(): string {
    return 'Istanbul';
  }
}
