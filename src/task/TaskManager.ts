/**
 * Task Manager
 * @packageDocumentation
 * @responsibility Manage tasks and checklists for project management
 * @requires DatabaseManager
 */

import * as fs from 'node:fs';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type * as schema from '../storage/schema';
import type {
  ChecklistItem,
  Task,
  TaskFilter,
  TaskPriority,
  TaskStats,
  TaskStatus,
  TaskType,
  TaskUpdate,
} from '../types/task';
import { TaskPriority as TP, TaskStatus as TS, TaskType as TT } from '../types/task';

/**
 * Task Manager
 * @public
 * @responsibility CRUD operations for tasks and project management
 */
export class TaskManager {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.dbManager.ensureTasksTable();
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

    // Use Drizzle ORM via DatabaseManager
    this.dbManager.insertTask({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assignedTo: task.assignedTo,
      symbolId: task.symbolId,
      filePath: task.filePath,
      line: task.line,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      dueDate: task.dueDate,
      parentId: task.parentId,
      dependencies: task.dependencies,
      tags: task.tags,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      notes: task.notes,
    });

    return task;
  }

  /**
   * Get task by ID
   * @param id - Task ID
   * @returns Task or null
   * @public
   */
  getTask(id: string): Task | null {
    // Use Drizzle ORM via DatabaseManager
    const row = this.dbManager.getTaskById(id);

    if (!row) return null;

    return this.drizzleRowToTask(row);
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

    // Use Drizzle ORM via DatabaseManager
    this.dbManager.updateTask(id, {
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      type: updated.type,
      assignedTo: updated.assignedTo,
      estimatedHours: updated.estimatedHours,
      actualHours: updated.actualHours,
      dueDate: updated.dueDate,
      tags: updated.tags,
      updatedAt: updated.updatedAt,
      completedAt: updated.completedAt,
      notes: updated.notes,
    });

    return updated;
  }

  /**
   * Delete task
   * @param id - Task ID
   * @returns True if deleted
   * @public
   */
  deleteTask(id: string): boolean {
    // Use Drizzle ORM via DatabaseManager
    return this.dbManager.deleteTask(id);
  }

  /**
   * List tasks with filters
   * @param filter - Filter criteria
   * @returns Array of tasks
   * @public
   */
  listTasks(filter?: TaskFilter): Task[] {
    // Use Drizzle ORM via DatabaseManager
    const rows = this.dbManager.getTasksWithFilters(filter);
    return rows.map((row) => this.drizzleRowToTask(row));
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

    const completionTimes: number[] = [];
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
   * Convert Drizzle ORM row to Task object
   * @param row - Drizzle ORM row (camelCase properties)
   * @returns Task object
   * @private
   */
  private drizzleRowToTask(row: schema.TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      type: row.type as TaskType,
      assignedTo: row.assignedTo || undefined,
      symbolId: row.symbolId || undefined,
      filePath: row.filePath || undefined,
      line: row.line || undefined,
      estimatedHours: row.estimatedHours || undefined,
      actualHours: row.actualHours || undefined,
      dueDate: row.dueDate || undefined,
      parentId: row.parentId || undefined,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt || undefined,
      notes: row.notes || undefined,
    };
  }
}
