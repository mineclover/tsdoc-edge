/**
 * HTTP Endpoints Command - List HTTP API endpoints
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { XmlBuilder } from '../output/XmlBuilder';
import type { OutputSchema } from '../output/types';
import { arrayOf } from '../output/types';

const HttpEndpointsSchema: OutputSchema = {
  root: 'http-endpoints',
  sections: {
    summary: {
      total: 'number',
      byMethod: 'string', // JSON
      byScope: 'string', // JSON
    },
    endpoints: arrayOf('endpoint', {
      id: 'string',
      method: 'string',
      path: 'string',
      scope: 'string',
      handler: 'string',
      file: 'string',
      line: 'number',
    }),
  },
};

export class HttpEndpointsCommand extends BaseCommand {
  getName(): string {
    return 'http-endpoints';
  }

  getAlias(): string[] {
    return ['endpoints', 'routes'];
  }

  getDescription(): string {
    return 'List HTTP API endpoints (Express/Fastify/Hono)';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const useXml = !args.includes('--human');
    const methodFilter = args.find(a => a.startsWith('--method='))?.split('=')[1];
    const scopeFilter = args.find(a => a.startsWith('--scope='))?.split('=')[1];
    const pathFilter = args.find(a => a.startsWith('--path='))?.split('=')[1];

    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) return dbCheck;

    const dbPath = this.getDatabasePath();
    const db = new Database(dbPath, { readonly: true });

    try {
      // Build query with filters
      let query = `
        SELECT
          id, method, path, scope,
          handler_symbol_id as handler,
          file_path as file,
          line
        FROM endpoints
        WHERE 1=1
      `;

      const params: any[] = [];

      if (methodFilter) {
        query += ' AND method = ?';
        params.push(methodFilter.toUpperCase());
      }

      if (scopeFilter) {
        query += ' AND scope = ?';
        params.push(scopeFilter);
      }

      if (pathFilter) {
        query += ' AND path LIKE ?';
        params.push(`%${pathFilter}%`);
      }

      query += ' ORDER BY path, method';

      const endpoints = db.prepare(query).all(...params) as Array<{
        id: string;
        method: string;
        path: string;
        scope: string;
        handler: string;
        file: string;
        line: number;
      }>;

      // Get statistics
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          method,
          scope
        FROM endpoints
        GROUP BY method, scope
      `;
      const stats = db.prepare(statsQuery).all() as Array<{
        total: number;
        method: string;
        scope: string;
      }>;

      const byMethod: Record<string, number> = {};
      const byScope: Record<string, number> = {};

      for (const stat of stats) {
        byMethod[stat.method] = (byMethod[stat.method] || 0) + stat.total;
        byScope[stat.scope] = (byScope[stat.scope] || 0) + stat.total;
      }

      if (useXml) {
        new XmlBuilder(HttpEndpointsSchema)
          .section('summary', {
            total: endpoints.length,
            byMethod: JSON.stringify(byMethod),
            byScope: JSON.stringify(byScope),
          })
          .section('endpoints', endpoints)
          .print();
      } else {
        console.log('\n\x1b[1m\x1b[36mHTTP Endpoints\x1b[0m');
        console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');

        // Statistics
        console.log('\x1b[1mStatistics:\x1b[0m');
        console.log(`  Total endpoints: \x1b[36m${endpoints.length}\x1b[0m`);
        console.log(`  By method: ${Object.entries(byMethod).map(([m, c]) => `${m}=${c}`).join(', ')}`);
        console.log(`  By scope: ${Object.entries(byScope).map(([s, c]) => `${s}=${c}`).join(', ')}`);
        console.log();

        if (endpoints.length === 0) {
          console.log('\x1b[33mNo endpoints found.\x1b[0m');
          console.log('\x1b[2mRun `tsdoc-edge build` to detect endpoints.\x1b[0m\n');
        } else {
          // Group by path
          for (const endpoint of endpoints) {
            const methodColor = this.getMethodColor(endpoint.method);
            console.log(`\x1b[1m${methodColor}${endpoint.method.padEnd(7)}\x1b[0m ${endpoint.path}`);
            console.log(`  \x1b[2mScope: ${endpoint.scope}\x1b[0m`);
            console.log(`  \x1b[2mHandler: ${endpoint.handler}\x1b[0m`);
            console.log(`  \x1b[2m${endpoint.file}:${endpoint.line}\x1b[0m`);
            console.log();
          }
        }
      }

      db.close();
      return { exitCode: 0, message: `Found ${endpoints.length} endpoints` };
    } catch (error) {
      db.close();
      return {
        exitCode: 1,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private getMethodColor(method: string): string {
    switch (method) {
      case 'GET':
        return '\x1b[32m'; // Green
      case 'POST':
        return '\x1b[34m'; // Blue
      case 'PUT':
        return '\x1b[33m'; // Yellow
      case 'DELETE':
        return '\x1b[31m'; // Red
      case 'PATCH':
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[37m'; // White
    }
  }
}
