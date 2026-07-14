/**
 * Common Command - Find common dependencies between files/symbols
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import { CommonSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult } from './BaseCommand';

export class CommonCommand extends BaseCommand {
  getName(): string {
    return 'common';
  }

  getAlias(): string[] {
    return [];
  }

  getDescription(): string {
    return 'Find common dependencies between files or symbols';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const useXml = !args.includes('--human');
    const targets = args.filter((a) => !a.startsWith('--'));

    if (targets.length < 2) {
      console.log('Usage: tsdoc-edge common <file1|symbol1> <file2|symbol2> [...]');
      console.log('');
      console.log('Examples:');
      console.log('  tsdoc-edge common agent-graph.ts tool-executor.ts');
      console.log('  tsdoc-edge common AgentGraph DefaultToolExecutor');
      return { exitCode: 1, message: 'At least 2 targets required' };
    }

    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) return dbCheck;

    const dbPath = this.getDatabasePath();
    const db = new Database(dbPath, { readonly: true });

    try {
      // 각 타겟의 의존성 수집
      const targetDeps: Map<string, Set<string>> = new Map();

      for (const target of targets) {
        const deps = this.getDependencies(db, target);
        targetDeps.set(target, deps);
      }

      // 공통 의존성 찾기
      const allDeps = Array.from(targetDeps.values());
      const commonDeps = allDeps.reduce(
        (acc, deps) => {
          for (const dependency of acc) {
            if (!deps.has(dependency)) acc.delete(dependency);
          }
          return acc;
        },
        new Set(allDeps[0] ?? [])
      );

      // 공통 의존성의 상세 정보 조회
      const commonIds = Array.from(commonDeps);
      if (commonIds.length === 0) {
        if (useXml) {
          new XmlBuilder(CommonSchema)
            .section(
              'targets',
              targets.map((t) => ({ value: t }))
            )
            .section('dependencies', [])
            .print();
        } else {
          console.log('\nNo common dependencies found.');
        }
        db.close();
        return { exitCode: 0, message: 'No common dependencies' };
      }

      const placeholders = commonIds.map(() => '?').join(',');
      const query = `
        SELECT s.name, s.type, s.file_path,
               COUNT(DISTINCT rs.relationship_id) as total_refs
        FROM symbols s
        LEFT JOIN relationship_symbols rs ON s.id = rs.symbol_id AND rs.role = 'to'
        WHERE s.id IN (${placeholders})
        GROUP BY s.id
        ORDER BY total_refs DESC
      `;

      const results = db.prepare(query).all(...commonIds) as Array<{
        name: string;
        type: string;
        file_path: string;
        total_refs: number;
      }>;

      if (useXml) {
        new XmlBuilder(CommonSchema)
          .section(
            'targets',
            targets.map((t) => ({ value: t }))
          )
          .section(
            'dependencies',
            results.map((row) => ({
              name: row.name,
              type: row.type,
              refs: row.total_refs,
              file: row.file_path,
            }))
          )
          .print();
      } else {
        console.log(`\nCommon dependencies of: ${targets.join(', ')}\n`);
        console.log(`Found ${results.length} common dependencies:\n`);
        for (const row of results) {
          console.log(`  ${row.name} (${row.type}) - ${row.total_refs} total refs`);
          console.log(`    ${row.file_path}`);
        }
      }

      db.close();
      return { exitCode: 0, message: `Found ${results.length} common dependencies` };
    } catch (error) {
      db.close();
      return { exitCode: 1, message: String(error) };
    }
  }

  private getDependencies(db: Database.Database, target: string): Set<string> {
    // 파일 경로인지 심볼 이름인지 판단
    const isFilePath = target.includes('.') || target.includes('/');

    let symbolIds: string[];

    if (isFilePath) {
      // 파일의 모든 심볼 ID 조회
      const query = `SELECT id FROM symbols WHERE file_path LIKE ?`;
      const rows = db.prepare(query).all(`%${target}%`) as Array<{ id: string }>;
      symbolIds = rows.map((r) => r.id);
    } else {
      // 심볼 이름으로 ID 조회
      const query = `SELECT id FROM symbols WHERE name LIKE ?`;
      const rows = db.prepare(query).all(`%${target}%`) as Array<{ id: string }>;
      symbolIds = rows.map((r) => r.id);
    }

    if (symbolIds.length === 0) {
      return new Set();
    }

    // 해당 심볼들의 의존성 조회
    const placeholders = symbolIds.map(() => '?').join(',');
    const depsQuery = `
      SELECT DISTINCT rs2.symbol_id
      FROM relationship_symbols rs1
      JOIN relationship_symbols rs2 ON rs1.relationship_id = rs2.relationship_id
      WHERE rs1.symbol_id IN (${placeholders})
        AND rs1.role = 'from'
        AND rs2.role = 'to'
    `;

    const deps = db.prepare(depsQuery).all(...symbolIds) as Array<{ symbol_id: string }>;
    return new Set(deps.map((d) => d.symbol_id));
  }
}
