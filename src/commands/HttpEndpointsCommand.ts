/**
 * HTTP Endpoints Command - List HTTP API endpoints
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import type { OutputSchema } from '../output/types';
import { arrayOf } from '../output/types';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

const HttpEndpointsSchema: OutputSchema = {
  root: 'http-endpoints',
  sections: {
    summary: {
      total: 'number',
      byMethod: 'string',
      byScope: 'string',
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

/**
 * Command for listing discovered HTTP API endpoints (Express/Fastify/Hono).
 *
 * @public
 */
export class HttpEndpointsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'http-endpoints';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['endpoints', 'routes'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'List HTTP API endpoints (Express/Fastify/Hono)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge http-endpoints [options]

Options:
  --method <HTTP_METHOD>  Filter by HTTP method (GET, POST, PUT, DELETE, ...)
  --scope <scope>         Filter by endpoint scope
  --path <substring>      Filter by route path substring
  --human                 Human-readable output (default)
  --json                  JSON output
  --xml                   XML output`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(
        args,
        ['--human', '--json', '--xml'],
        ['--method', '--scope', '--path']
      );
      if (flagError) return flagError;

      const methodFilter = this.getOption(args, '--method');
      const scopeFilter = this.getOption(args, '--scope');
      const pathFilter = this.getOption(args, '--path');
      const isJson = this.hasFlag(args, '--json');
      const isXml = this.hasFlag(args, '--xml');

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const db = new Database(dbPath, { readonly: true });

      try {
        let query = `
          SELECT
            id, method, path, scope,
            handler_symbol_id as handler,
            file_path as file,
            line
          FROM endpoints
          WHERE 1=1
        `;
        const params: unknown[] = [];

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

        const byMethod: Record<string, number> = {};
        const byScope: Record<string, number> = {};
        for (const ep of endpoints) {
          byMethod[ep.method] = (byMethod[ep.method] || 0) + 1;
          if (ep.scope) {
            byScope[ep.scope] = (byScope[ep.scope] || 0) + 1;
          }
        }

        if (isJson) {
          console.log(
            JSON.stringify(
              {
                summary: {
                  total: endpoints.length,
                  byMethod,
                  byScope,
                },
                endpoints,
              },
              null,
              2
            )
          );
        } else if (isXml) {
          new XmlBuilder(HttpEndpointsSchema)
            .section('summary', {
              total: endpoints.length,
              byMethod: JSON.stringify(byMethod),
              byScope: JSON.stringify(byScope),
            })
            .section('endpoints', endpoints)
            .print();
        } else {
          this.printHeader('HTTP API Endpoints');
          if (endpoints.length === 0) {
            this.printInfo('No HTTP endpoints found');
            console.log();
          } else {
            this.printSection(`Summary (${endpoints.length} endpoints)`);
            const methodSummary = Object.entries(byMethod)
              .map(([method, count]) => `${method}: ${count}`)
              .join(', ');
            if (methodSummary) {
              console.log(`  Methods: ${colors.cyan}${methodSummary}${colors.reset}`);
            }
            console.log();

            this.printSection('Routes');
            for (const ep of endpoints) {
              const scopeLabel = ep.scope ? ` ${colors.dim}[${ep.scope}]${colors.reset}` : '';
              console.log(
                `  ${colors.green}${ep.method.padEnd(7)}${colors.reset} ${colors.cyan}${ep.path}${colors.reset}${scopeLabel}`
              );
              console.log(
                `    ${colors.dim}${ep.file}:${ep.line}${ep.handler ? ` → ${ep.handler}` : ''}${colors.reset}`
              );
            }
            console.log();
          }
        }

        return this.success(`Found ${endpoints.length} endpoints`);
      } finally {
        db.close();
      }
    });
  }
}
