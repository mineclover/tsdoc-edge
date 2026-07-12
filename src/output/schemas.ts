/**
 * Predefined Output Schemas
 * @packageDocumentation
 */

import type { OutputSchema } from './types';
import { arrayOf, groupedArrayOf } from './types';

/**
 * Schema for deps command output (enhanced with semantic info)
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
    },
    paths: {
      database: 'string',
      registry: 'string',
      canonicalGraphDatabase: { type: 'string', optional: true },
    },
    errors: arrayOf('error', {
      message: 'string',
    }),
  },
};
