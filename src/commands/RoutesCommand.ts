/**
 * Routes Command - Extract HTTP route endpoints as symbols
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { RoutesSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult } from './BaseCommand';

interface RouteEndpoint {
  method: string;
  path: string;
  file: string;
  line: number;
  handler?: string;
}

export class RoutesCommand extends BaseCommand {
  getName(): string {
    return 'routes';
  }

  getAlias(): string[] {
    return [];
  }

  getDescription(): string {
    return 'Extract HTTP route endpoints';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const useXml = !args.includes('--human');
    const targetDir = args.find((a) => !a.startsWith('--')) || 'packages';

    const routes = this.extractRoutes(targetDir);

    if (useXml) {
      new XmlBuilder(RoutesSchema)
        .section(
          'endpoints',
          routes.map((route) => ({
            method: route.method,
            path: route.path,
            file: route.file,
            line: route.line,
          }))
        )
        .print();
    } else {
      console.log(`\nHTTP Routes (${routes.length}):\n`);
      for (const route of routes) {
        console.log(`  ${route.method.toUpperCase().padEnd(6)} ${route.path}`);
        console.log(`         ${route.file}:${route.line}`);
      }
    }

    return { exitCode: 0, message: `Found ${routes.length} routes` };
  }

  private extractRoutes(dir: string): RouteEndpoint[] {
    const routes: RouteEndpoint[] = [];
    const absDir = path.resolve(process.cwd(), dir);

    this.walkDir(absDir, (filePath) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Hono/Express style routes
      const routePatterns = [
        /app\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /router\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gi,
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of routePatterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(line)) !== null) {
            if (match[2]) {
              // app.get('/path') style
              routes.push({
                method: match[1].toLowerCase(),
                path: match[2],
                file: path.relative(process.cwd(), filePath),
                line: i + 1,
              });
            } else if (match[1] && !['get', 'post', 'put', 'delete', 'patch'].includes(match[1])) {
              // .route('/path') style
              routes.push({
                method: 'all',
                path: match[1],
                file: path.relative(process.cwd(), filePath),
                line: i + 1,
              });
            }
          }
        }
      }
    });

    return routes.sort((a, b) => a.path.localeCompare(b.path));
  }

  private walkDir(dir: string, callback: (filePath: string) => void): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          this.walkDir(fullPath, callback);
        }
      } else {
        callback(fullPath);
      }
    }
  }
}
