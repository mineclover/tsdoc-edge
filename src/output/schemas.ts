/**
 * Predefined Output Schemas
 * @packageDocumentation
 */

import type { OutputSchema } from './types';
import { arrayOf, groupedArrayOf } from './types';

/**
 * Schema for deps command output
 */
export const DepsSchema: OutputSchema = {
  root: 'dependencies',
  sections: {
    source: {
      name: 'string',
      type: 'string',
      file: 'string',
      line: 'number',
    },
    targets: arrayOf('target', {
      name: 'string',
      type: 'string',
      relation: 'string',
      file: 'string',
      line: 'number',
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
