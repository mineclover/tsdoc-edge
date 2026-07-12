/**
 * Layers Command - Analyze package dependency layers
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import { LayersSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult } from './BaseCommand';

export class LayersCommand extends BaseCommand {
  getName(): string {
    return 'layers';
  }

  getAlias(): string[] {
    return [];
  }

  getDescription(): string {
    return 'Analyze package dependency layers';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const useXml = !args.includes('--human');

    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) return dbCheck;

    const dbPath = this.getDatabasePath();
    const db = new Database(dbPath, { readonly: true });

    try {
      const query = `
        WITH pkg_deps AS (
          SELECT
            REPLACE(SUBSTR(s1.file_path, 1, INSTR(s1.file_path, '/src') - 1), 'packages/', '') as from_pkg,
            REPLACE(SUBSTR(s2.file_path, 1, INSTR(s2.file_path, '/src') - 1), 'packages/', '') as to_pkg,
            COUNT(*) as deps
          FROM relationship_symbols rs1
          JOIN relationship_symbols rs2 ON rs1.relationship_id = rs2.relationship_id
          JOIN symbols s1 ON rs1.symbol_id = s1.id
          JOIN symbols s2 ON rs2.symbol_id = s2.id
          WHERE rs1.role = 'from' AND rs2.role = 'to'
            AND s1.file_path <> s2.file_path
          GROUP BY from_pkg, to_pkg
        )
        SELECT from_pkg, to_pkg, deps
        FROM pkg_deps
        WHERE from_pkg <> to_pkg AND from_pkg <> '' AND to_pkg <> ''
        ORDER BY deps DESC
      `;

      const results = db.prepare(query).all() as Array<{
        from_pkg: string;
        to_pkg: string;
        deps: number;
      }>;

      if (useXml) {
        new XmlBuilder(LayersSchema)
          .section(
            'dependencies',
            results.map((row) => ({
              from: row.from_pkg,
              to: row.to_pkg,
              count: row.deps,
            }))
          )
          .print();
      } else {
        console.log('\nPackage Dependencies:\n');
        for (const row of results) {
          console.log(`  ${row.from_pkg} -> ${row.to_pkg} (${row.deps})`);
        }
      }

      db.close();
      return { exitCode: 0, message: `Found ${results.length} dependencies` };
    } catch (error) {
      db.close();
      return { exitCode: 1, message: String(error) };
    }
  }
}
