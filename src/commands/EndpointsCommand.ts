/**
 * Endpoints Command - List exported symbols (API endpoints)
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import { EndpointsSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult } from './BaseCommand';

export class EndpointsCommand extends BaseCommand {
  getName(): string {
    return 'endpoints';
  }

  getAlias(): string[] {
    return ['ep'];
  }

  getDescription(): string {
    return 'List exported symbols (API endpoints)';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const useXml = !args.includes('--human');
    const filterPath = args.find((a) => !a.startsWith('--')) || '';

    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) return dbCheck;

    const dbPath = this.getDatabasePath();
    const db = new Database(dbPath, { readonly: true });

    try {
      const query = `
        SELECT name, type, file_path
        FROM symbols
        WHERE is_exported = 1
          AND type IN ('class', 'function', 'interface')
          ${filterPath ? `AND file_path LIKE '%${filterPath}%'` : ''}
        ORDER BY file_path, type
      `;

      const results = db.prepare(query).all() as Array<{
        name: string;
        type: string;
        file_path: string;
      }>;

      if (useXml) {
        // Group by file
        const byFile = new Map<string, typeof results>();
        for (const row of results) {
          const list = byFile.get(row.file_path) || [];
          list.push(row);
          byFile.set(row.file_path, list);
        }

        const filesData = Array.from(byFile.entries()).map(([filePath, symbols]) => ({
          path: filePath,
          symbols: symbols.map((sym) => ({ type: sym.type, name: sym.name })),
        }));

        new XmlBuilder(EndpointsSchema).section('files', filesData).print();
      } else {
        console.log(`\nExported Symbols: ${results.length}\n`);
        let currentFile = '';
        for (const row of results) {
          if (row.file_path !== currentFile) {
            currentFile = row.file_path;
            console.log(`\n${currentFile}`);
          }
          console.log(`  ${row.type}: ${row.name}`);
        }
      }

      db.close();
      return { exitCode: 0, message: `Found ${results.length} endpoints` };
    } catch (error) {
      db.close();
      return { exitCode: 1, message: String(error) };
    }
  }
}
