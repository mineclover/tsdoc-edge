/**
 * Task Manager
 * @packageDocumentation
 * @responsibility Manage tasks and checklists for project management
 * @requires DatabaseManager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskFilter,
  TaskStats,
  TaskUpdate,
  ChecklistItem,
} from '../types/task';
import { TaskStatus as TS, TaskPriority as TP, TaskType as TT } from '../types/task';

/**
 * Database row interface for tasks table
 */
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  assigned_to: string | null;
  symbol_id: string | null;
  file_path: string | null;
  line: number | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  parent_id: string | null;
  dependencies: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  notes: string | null;
}

/**
 * Task Manager
 * @public
 * @responsibility CRUD operations for tasks and project management
 */
export class TaskManager {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.ensureTasksTable();
  }

  /**
   * Ensure tasks table exists
   * @private
   */
  private ensureTasksTable(): void {
    this.dbManager.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        type TEXT NOT NULL,
        assigned_to TEXT,
        symbol_id TEXT,
        file_path TEXT,
        line INTEGER,
        estimated_hours REAL,
        actual_hours REAL,
        due_date TEXT,
        parent_id TEXT,
        dependencies TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_symbol ON tasks(symbol_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_file ON tasks(file_path);
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    `);
  }

  /**
   * Generate unique task ID
   * @private
   */
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new task
   * @param taskData - Task data
   * @returns Created task
   * @public
   */
  createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: this.generateId(),
      ...taskData,
      createdAt: now,
      updatedAt: now,
    };

    this.dbManager.db
      .prepare(
        `
      INSERT INTO tasks (
        id, title, description, status, priority, type,
        assigned_to, symbol_id, file_path, line,
        estimated_hours, actual_hours, due_date, parent_id,
        dependencies, tags, created_at, updated_at, completed_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        task.id,
        task.title,
        task.description || null,
        task.status,
        task.priority,
        task.type,
        task.assignedTo || null,
        task.symbolId || null,
        task.filePath || null,
        task.line || null,
        task.estimatedHours || null,
        task.actualHours || null,
        task.dueDate || null,
        task.parentId || null,
        task.dependencies ? JSON.stringify(task.dependencies) : null,
        task.tags ? JSON.stringify(task.tags) : null,
        task.createdAt,
        task.updatedAt,
        task.completedAt || null,
        task.notes || null
      );

    return task;
  }

  /**
   * Get task by ID
   * @param id - Task ID
   * @returns Task or null
   * @public
   */
  getTask(id: string): Task | null {
    const row = this.dbManager.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;

    if (!row) return null;

    return this.rowToTask(row);
  }

  /**
   * Update task
   * @param id - Task ID
   * @param updates - Fields to update
   * @returns Updated task or null
   * @public
   */
  updateTask(id: string, updates: TaskUpdate): Task | null {
    const task = this.getTask(id);
    if (!task) return null;

    const now = new Date().toISOString();
    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: now,
    };

    // If marking as done, set completedAt
    if (updates.status === TS.DONE && !task.completedAt) {
      updated.completedAt = now;
    }

    this.dbManager.db
      .prepare(
        `
      UPDATE tasks SET
        title = ?, description = ?, status = ?, priority = ?, type = ?,
        assigned_to = ?, estimated_hours = ?, actual_hours = ?, due_date = ?,
        tags = ?, updated_at = ?, completed_at = ?, notes = ?
      WHERE id = ?
    `
      )
      .run(
        updated.title,
        updated.description || null,
        updated.status,
        updated.priority,
        updated.type,
        updated.assignedTo || null,
        updated.estimatedHours || null,
        updated.actualHours || null,
        updated.dueDate || null,
        updated.tags ? JSON.stringify(updated.tags) : null,
        updated.updatedAt,
        updated.completedAt || null,
        updated.notes || null,
        id
      );

    return updated;
  }

  /**
   * Delete task
   * @param id - Task ID
   * @returns True if deleted
   * @public
   */
  deleteTask(id: string): boolean {
    const result = this.dbManager.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * List tasks with filters
   * @param filter - Filter criteria
   * @returns Array of tasks
   * @public
   */
  listTasks(filter?: TaskFilter): Task[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      query += ` AND status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    if (filter?.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      query += ` AND priority IN (${priorities.map(() => '?').join(',')})`;
      params.push(...priorities);
    }

    if (filter?.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      query += ` AND type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }

    if (filter?.assignedTo) {
      query += ' AND assigned_to = ?';
      params.push(filter.assignedTo);
    }

    if (filter?.symbolId) {
      query += ' AND symbol_id = ?';
      params.push(filter.symbolId);
    }

    if (filter?.dueBefore) {
      query += ' AND due_date <= ?';
      params.push(filter.dueBefore);
    }

    if (filter?.dueAfter) {
      query += ' AND due_date >= ?';
      params.push(filter.dueAfter);
    }

    query += ' ORDER BY priority DESC, due_date ASC, created_at DESC';

    const rows = this.dbManager.db.prepare(query).all(...params) as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  /**
   * Get task statistics
   * @returns Task statistics
   * @public
   */
  getStatistics(): TaskStats {
    const all = this.listTasks();
    const total = all.length;

    const byStatus: Record<TaskStatus, number> = {
      [TS.TODO]: 0,
      [TS.IN_PROGRESS]: 0,
      [TS.DONE]: 0,
      [TS.BLOCKED]: 0,
      [TS.URGENT]: 0,
    };

    const byPriority: Record<TaskPriority, number> = {
      [TP.LOW]: 0,
      [TP.MEDIUM]: 0,
      [TP.HIGH]: 0,
      [TP.CRITICAL]: 0,
    };

    const byType: Record<TaskType, number> = {
      [TT.FEATURE]: 0,
      [TT.BUG]: 0,
      [TT.DOCS]: 0,
      [TT.REFACTOR]: 0,
      [TT.TEST]: 0,
      [TT.RESEARCH]: 0,
    };

    let completionTimes: number[] = [];
    let overdueCount = 0;
    const now = new Date();

    for (const task of all) {
      byStatus[task.status]++;
      byPriority[task.priority]++;
      byType[task.type]++;

      if (task.status === TS.DONE && task.completedAt) {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        completionTimes.push(completed.getTime() - created.getTime());
      }

      if (task.dueDate && task.status !== TS.DONE) {
        const due = new Date(task.dueDate);
        if (due < now) {
          overdueCount++;
        }
      }
    }

    const avgCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / (1000 * 60 * 60) // hours
        : 0;

    const completionRate = total > 0 ? (byStatus[TS.DONE] / total) * 100 : 0;

    return {
      total,
      byStatus,
      byPriority,
      byType,
      completionRate,
      avgCompletionTime,
      overdueCount,
    };
  }

  /**
   * Parse markdown checklist from file
   * @param filePath - File path
   * @returns Checklist items
   * @public
   */
  parseMarkdownChecklist(filePath: string): ChecklistItem[] {
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const items: ChecklistItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)[-*]\s+\[([ x~\-!])\]\s+(.+)$/);

      if (match) {
        const [, indent, checkbox, text] = match;
        const level = Math.floor(indent.length / 2);

        let status: TaskStatus;
        switch (checkbox) {
          case 'x':
            status = TS.DONE;
            break;
          case '~':
            status = TS.IN_PROGRESS;
            break;
          case '-':
            status = TS.BLOCKED;
            break;
          case '!':
            status = TS.URGENT;
            break;
          default:
            status = TS.TODO;
        }

        items.push({
          status,
          text: text.trim(),
          level,
          line: i + 1,
          filePath,
        });
      }
    }

    return items;
  }

  /**
   * Convert database row to Task object
   * @param row - Database row
   * @returns Task object
   * @private
   */
  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      type: row.type as TaskType,
      assignedTo: row.assigned_to || undefined,
      symbolId: row.symbol_id || undefined,
      filePath: row.file_path || undefined,
      line: row.line || undefined,
      estimatedHours: row.estimated_hours || undefined,
      actualHours: row.actual_hours || undefined,
      dueDate: row.due_date || undefined,
      parentId: row.parent_id || undefined,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
      notes: row.notes || undefined,
    };
  }
}
