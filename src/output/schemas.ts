/**
 * Predefined Output Schemas
 *
 * @packageDocumentation
 * @doc [[Code Generation]]
 * @context Canonical `OutputSchema` definitions governing XML and JSON CLI output payloads across `deps`, `who-uses`, `endpoints`, `hubs`, `layers`, `common`, `routes`, and `build`
 * @functionality Exports declarative `OutputSchema` constants for core CLI commands
 */

import type { OutputSchema } from './types';
import { arrayOf, groupedArrayOf } from './types';

/**
 * Schema for deps command output (enhanced with semantic info)
 *
 * @doc [[Code Generation]]
 * @public
 */
export const DepsSchema: OutputSchema = {
  root: 'dependencies',
  sections: {
    source: {
      name: 'string',
      type: 'string',
      file: 'string',
      line: 'number',
      summary: { type: 'string', optional: true },
      description: { type: 'string', optional: true },
      exported: { type: 'boolean', optional: true },
    },
    targets: arrayOf('target', {
      name: 'string',
      type: 'string',
      relation: 'string',
      file: 'string',
      line: 'number',
      summary: { type: 'string', optional: true },
      signature: { type: 'string', optional: true },
      usageContext: { type: 'string', optional: true },
    }),
  },
};

/**
 * Schema for who-uses command output
 *
 * @doc [[Code Generation]]
 * @public
 */
export const WhoUsesSchema: OutputSchema = {
  root: 'who-uses',
  sections: {
    source: {
      name: 'string',
      type: 'string',
      file: 'string',
      line: 'number',
      exported: 'boolean',
    },
    dependents: groupedArrayOf('relation-type', 'name', 'dependent', {
      name: 'string',
      type: 'string',
      file: 'string',
      line: 'number',
    }),
  },
};

/**
 * Schema for endpoints command output
 *
 * @doc [[Code Generation]]
 * @public
 */
export const EndpointsSchema: OutputSchema = {
  root: 'endpoints',
  sections: {
    files: arrayOf('file', {
      path: 'string',
      symbols: arrayOf('symbol', {
        type: 'string',
        name: 'string',
      }),
    }),
  },
};

/**
 * Schema for hubs command output
 *
 * @doc [[Code Generation]]
 * @public
 */
export const HubsSchema: OutputSchema = {
  root: 'hubs',
  sections: {
    symbols: arrayOf('hub', {
      name: 'string',
      type: 'string',
      refs: 'number',
      file: 'string',
    }),
  },
};

/**
 * Schema for layers command output
 *
 * @doc [[Code Generation]]
 * @public
 */
export const LayersSchema: OutputSchema = {
  root: 'layers',
  sections: {
    dependencies: arrayOf('dependency', {
      from: 'string',
      to: 'string',
      count: 'number',
    }),
  },
};

/**
 * Schema for common command output
 *
 * @doc [[Code Generation]]
 * @public
 */
export const CommonSchema: OutputSchema = {
  root: 'common',
  sections: {
    targets: arrayOf('target', {
      value: 'string',
    }),
    dependencies: arrayOf('dependency', {
      name: 'string',
      type: 'string',
      refs: 'number',
      file: 'string',
    }),
  },
};

/**
 * Schema for routes command output
 *
 * @doc [[Code Generation]]
 * @public
 */
export const RoutesSchema: OutputSchema = {
  root: 'routes',
  sections: {
    endpoints: arrayOf('route', {
      method: 'string',
      path: 'string',
      file: 'string',
      line: 'number',
    }),
  },
};

/**
 * Schema for build command result
 *
 * @doc [[Code Generation]]
 * @public
 */
export const BuildResultSchema: OutputSchema = {
  root: 'build-result',
  sections: {
    statistics: {
      filesScanned: 'number',
      symbolsFound: 'number',
      symbolsInserted: 'number',
      symbolsCollisions: 'number',
      relationshipsFound: 'number',
      relationshipsInserted: 'number',
      relationshipsSkipped: 'number',
      docRelationships: 'number',
      semanticRelationships: 'number',
      inferredRelationships: 'number',
      inheritanceRelationships: 'number',
      endpointHandlerRelationships: 'number',
      endpointsFound: 'number',
      endpointsInserted: 'number',
      blocksFound: 'number',
      blocksInserted: 'number',
      blockDependenciesFound: 'number',
      entryPointsFound: 'number',
      entryPointsInserted: 'number',
      exposureAnalyzed: 'number',
      durationMs: 'number',
      canonicalGraphNodes: { type: 'number', optional: true },
      canonicalGraphEdges: { type: 'number', optional: true },
      canonicalTestCoverageMatched: { type: 'number', optional: true },
      canonicalTestCoverageUncovered: { type: 'number', optional: true },
      canonicalTestCoverageUnmatchedTargets: { type: 'number', optional: true },
    },
    paths: {
      database: 'string',
      registry: 'string',
      canonicalGraphDatabase: { type: 'string', optional: true },
    },
    canonicalTestCoverage: {
      reportId: 'string',
      graphRevisionId: 'string',
      graphFingerprint: 'string',
      matchedSymbols: 'number',
      uncoveredSymbols: 'number',
      unmatchedRelationTargets: 'number',
      evidenceStatus: 'string',
      gate: 'string',
    },
    errors: arrayOf('error', {
      message: 'string',
    }),
  },
};
