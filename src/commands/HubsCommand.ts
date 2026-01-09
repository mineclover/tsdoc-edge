/**
 * Hubs Command - Find most shared symbols
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { XmlBuilder } from '../output/XmlBuilder';
import { HubsSchema } from '../output/schemas';

export class HubsCommand extends BaseCommand {
  getName(): string {
    return 'hubs';
  }

  getAlias(): string[] {
    return [];
  }

  getDescription(): string {
    return 'Find most shared symbols (hub analysis)';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const useXml = !args.includes('--human');
    const minRefs = parseInt(args.find(a => /^\d+$/.test(a)) || '2', 10);

    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) return dbCheck;

    const dbPath = this.getDatabasePath();
    const db = new Database(dbPath, { readonly: true });

    try {
      // 전체 허브 출력 (최소 참조 수 이상)
      const query = `
        SELECT s.name, s.type, s.file_path, COUNT(DISTINCT rs.relationship_id) as refs
        FROM symbols s
        JOIN relationship_symbols rs ON s.id = rs.symbol_id AND rs.role = 'to'
        WHERE s.is_exported = 1
        GROUP BY s.id
        HAVING refs >= ${minRefs}
        ORDER BY refs DESC
      `;

      const results = db.prepare(query).all() as Array<{ name: string; type: string; file_path: string; refs: number }>;

      if (useXml) {
        new XmlBuilder(HubsSchema)
          .section('symbols', results.map(row => ({
            name: row.name,
            type: row.type,
            refs: row.refs,
            file: row.file_path,
          })))
          .print();
      } else {
        console.log(`\nHub Symbols (refs >= ${minRefs}):\n`);
        for (const row of results) {
          console.log(`  ${row.refs} refs: ${row.name} (${row.type})`);
          console.log(`         ${row.file_path}`);
        }
      }

      db.close();
      return { exitCode: 0, message: `Found ${results.length} hubs` };
    } catch (error) {
      db.close();
      return { exitCode: 1, message: String(error) };
    }
  }
}
