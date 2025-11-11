/**
 * Task Management Commands
 * @packageDocumentation
 * @responsibility Manage tasks and checklists via CLI
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { TaskManager } from '../task/TaskManager';
import { TaskStatus, TaskPriority, TaskType } from '../types/task';
import type { Task, TaskFilter } from '../types/task';

/**
 * Task List Command
 * @public
 */
export class TaskListCommand extends BaseCommand {
  getName(): string {
    return 'task-list';
  }

  getDescription(): string {
    return 'List tasks with optional filters';
  }

  protected getUsage(): string {
    return `tsdoc-edge task-list [options]

Options:
  --status=<status>      Filter by status (todo|in_progress|done|blocked|urgent)
  --priority=<priority>  Filter by priority (low|medium|high|critical)
  --type=<type>          Filter by type (feature|bug|docs|refactor|test|research)
  --assigned-to=<name>   Filter by assignee
  --overdue              Show only overdue tasks
  --json                 Output as JSON`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);
      const taskManager = new TaskManager(dbManager);

      const filter: TaskFilter = {};
      let outputJson = false;
      let showOverdue = false;

      for (const arg of args) {
        if (arg === '--json') {
          outputJson = true;
        } else if (arg === '--overdue') {
          showOverdue = true;
          filter.dueBefore = new Date().toISOString();
        } else if (arg.startsWith('--status=')) {
          filter.status = arg.split('=')[1] as TaskStatus;
        } else if (arg.startsWith('--priority=')) {
          filter.priority = arg.split('=')[1] as TaskPriority;
        } else if (arg.startsWith('--type=')) {
          filter.type = arg.split('=')[1] as TaskType;
        } else if (arg.startsWith('--assigned-to=')) {
          filter.assignedTo = arg.split('=')[1];
        }
      }

      let tasks = taskManager.listTasks(filter);

      if (showOverdue) {
        tasks = tasks.filter((t) => t.status !== TaskStatus.DONE);
      }

      if (outputJson) {
        console.log(JSON.stringify(tasks, null, 2));
      } else {
        this.printHeader('Task List');
        console.log();

        if (tasks.length === 0) {
          this.printSuccess('No tasks found');
          console.log();
          return this.success();
        }

        console.log(`  Total: ${colors.cyan}${tasks.length}${colors.reset} tasks\n`);

        for (const task of tasks) {
          this.printTask(task);
        }
      }

      dbManager.close();
      return this.success();
    });
  }

  private printTask(task: Task): void {
    const checkbox = this.getCheckbox(task.status);
    const priorityColor = this.getPriorityColor(task.priority);
    const typeIcon = this.getTypeIcon(task.type);

    console.log(`  ${checkbox} ${task.title}`);
    console.log(
      `     ${colors.dim}ID: ${task.id.slice(-8)} | ${typeIcon} ${task.type} | ${priorityColor}${task.priority}${colors.reset}${colors.dim}${colors.reset}`
    );

    if (task.description) {
      console.log(`     ${colors.dim}${task.description}${colors.reset}`);
    }

    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const now = new Date();
      const isOverdue = due < now && task.status !== TaskStatus.DONE;
      const dueColor = isOverdue ? colors.red : colors.dim;
      console.log(`     ${dueColor}Due: ${task.dueDate}${colors.reset}`);
    }

    if (task.tags && task.tags.length > 0) {
      console.log(`     ${colors.dim}Tags: ${task.tags.join(', ')}${colors.reset}`);
    }

    console.log();
  }

  private getCheckbox(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.DONE:
        return `${colors.green}[x]${colors.reset}`;
      case TaskStatus.IN_PROGRESS:
        return `${colors.yellow}[~]${colors.reset}`;
      case TaskStatus.BLOCKED:
        return `${colors.red}[-]${colors.reset}`;
      case TaskStatus.URGENT:
        return `${colors.red}[!]${colors.reset}`;
      default:
        return `${colors.dim}[ ]${colors.reset}`;
    }
  }

  private getPriorityColor(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return colors.red;
      case TaskPriority.HIGH:
        return colors.yellow;
      case TaskPriority.MEDIUM:
        return colors.blue;
      default:
        return colors.dim;
    }
  }

  private getTypeIcon(type: TaskType): string {
    switch (type) {
      case TaskType.FEATURE:
        return '✨';
      case TaskType.BUG:
        return '🐛';
      case TaskType.DOCS:
        return '📝';
      case TaskType.REFACTOR:
        return '♻️';
      case TaskType.TEST:
        return '🧪';
      case TaskType.RESEARCH:
        return '🔍';
      default:
        return '•';
    }
  }
}

/**
 * Task Add Command
 * @public
 */
export class TaskAddCommand extends BaseCommand {
  getName(): string {
    return 'task-add';
  }

  getDescription(): string {
    return 'Add a new task';
  }

  protected getUsage(): string {
    return `tsdoc-edge task-add "<title>" [options]

Options:
  --description=<text>   Task description
  --priority=<level>     Priority (low|medium|high|critical, default: medium)
  --type=<type>          Type (feature|bug|docs|refactor|test|research, default: feature)
  --assigned-to=<name>   Assign to person/symbol
  --symbol=<id>          Related symbol ID
  --file=<path>          Related file path
  --due=<date>           Due date (YYYY-MM-DD)
  --tags=<tag1,tag2>     Comma-separated tags
  --estimate=<hours>     Estimated hours`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args) || args.length === 0) {
        return this.displayHelp();
      }

      const title = args[0];
      if (!title) {
        this.printError('Task title is required');
        return this.failure('Missing title');
      }

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);
      const taskManager = new TaskManager(dbManager);

      let description: string | undefined;
      let priority: TaskPriority = TaskPriority.MEDIUM;
      let type: TaskType = TaskType.FEATURE;
      let assignedTo: string | undefined;
      let symbolId: string | undefined;
      let filePath: string | undefined;
      let dueDate: string | undefined;
      let tags: string[] | undefined;
      let estimatedHours: number | undefined;

      for (const arg of args.slice(1)) {
        if (arg.startsWith('--description=')) {
          description = arg.split('=')[1];
        } else if (arg.startsWith('--priority=')) {
          priority = arg.split('=')[1] as TaskPriority;
        } else if (arg.startsWith('--type=')) {
          type = arg.split('=')[1] as TaskType;
        } else if (arg.startsWith('--assigned-to=')) {
          assignedTo = arg.split('=')[1];
        } else if (arg.startsWith('--symbol=')) {
          symbolId = arg.split('=')[1];
        } else if (arg.startsWith('--file=')) {
          filePath = arg.split('=')[1];
        } else if (arg.startsWith('--due=')) {
          dueDate = arg.split('=')[1];
        } else if (arg.startsWith('--tags=')) {
          tags = arg.split('=')[1].split(',').map((t) => t.trim());
        } else if (arg.startsWith('--estimate=')) {
          estimatedHours = Number.parseFloat(arg.split('=')[1]);
        }
      }

      const task = taskManager.createTask({
        title,
        description,
        status: TaskStatus.TODO,
        priority,
        type,
        assignedTo,
        symbolId,
        filePath,
        dueDate,
        tags,
        estimatedHours,
      });

      this.printHeader('Task Created');
      console.log();
      console.log(`  ID: ${colors.cyan}${task.id}${colors.reset}`);
      console.log(`  Title: ${task.title}`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Priority: ${colors.yellow}${task.priority}${colors.reset}`);
      console.log(`  Type: ${task.type}`);
      console.log();

      dbManager.close();
      return this.success();
    });
  }
}

/**
 * Task Update Command
 * @public
 */
export class TaskUpdateCommand extends BaseCommand {
  getName(): string {
    return 'task-update';
  }

  getDescription(): string {
    return 'Update task status or properties';
  }

  protected getUsage(): string {
    return `tsdoc-edge task-update <task-id> [options]

Options:
  --status=<status>       New status (todo|in_progress|done|blocked|urgent)
  --priority=<priority>   New priority
  --title=<text>          New title
  --description=<text>    New description
  --assigned-to=<name>    Change assignee
  --due=<date>            Change due date
  --actual=<hours>        Set actual hours spent`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args) || args.length === 0) {
        return this.displayHelp();
      }

      const taskId = args[0];

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);
      const taskManager = new TaskManager(dbManager);

      const existing = taskManager.getTask(taskId);
      if (!existing) {
        this.printError(`Task not found: ${taskId}`);
        dbManager.close();
        return this.failure('Task not found');
      }

      const updates: any = {};

      for (const arg of args.slice(1)) {
        if (arg.startsWith('--status=')) {
          updates.status = arg.split('=')[1] as TaskStatus;
        } else if (arg.startsWith('--priority=')) {
          updates.priority = arg.split('=')[1] as TaskPriority;
        } else if (arg.startsWith('--title=')) {
          updates.title = arg.split('=')[1];
        } else if (arg.startsWith('--description=')) {
          updates.description = arg.split('=')[1];
        } else if (arg.startsWith('--assigned-to=')) {
          updates.assignedTo = arg.split('=')[1];
        } else if (arg.startsWith('--due=')) {
          updates.dueDate = arg.split('=')[1];
        } else if (arg.startsWith('--actual=')) {
          updates.actualHours = Number.parseFloat(arg.split('=')[1]);
        }
      }

      const updated = taskManager.updateTask(taskId, updates);

      if (updated) {
        this.printSuccess(`Task ${taskId} updated`);
        console.log();
        console.log(`  Title: ${updated.title}`);
        console.log(`  Status: ${colors.cyan}${updated.status}${colors.reset}`);
        console.log();
      }

      dbManager.close();
      return this.success();
    });
  }
}

/**
 * Task Stats Command
 * @public
 */
export class TaskStatsCommand extends BaseCommand {
  getName(): string {
    return 'task-stats';
  }

  getDescription(): string {
    return 'Show task statistics';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);
      const taskManager = new TaskManager(dbManager);

      const stats = taskManager.getStatistics();

      this.printHeader('Task Statistics');
      console.log();

      console.log(`  Total Tasks: ${colors.cyan}${stats.total}${colors.reset}`);
      console.log(
        `  Completion Rate: ${colors.green}${stats.completionRate.toFixed(1)}%${colors.reset}`
      );
      console.log(
        `  Avg Completion Time: ${colors.blue}${stats.avgCompletionTime.toFixed(1)}h${colors.reset}`
      );

      if (stats.overdueCount > 0) {
        console.log(`  Overdue: ${colors.red}${stats.overdueCount}${colors.reset}`);
      }

      console.log();
      this.printSection('By Status');
      for (const [status, count] of Object.entries(stats.byStatus)) {
        if (count > 0) {
          console.log(`  ${status.padEnd(15)} ${String(count).padStart(4)}`);
        }
      }

      console.log();
      this.printSection('By Priority');
      for (const [priority, count] of Object.entries(stats.byPriority)) {
        if (count > 0) {
          console.log(`  ${priority.padEnd(15)} ${String(count).padStart(4)}`);
        }
      }

      console.log();
      this.printSection('By Type');
      for (const [type, count] of Object.entries(stats.byType)) {
        if (count > 0) {
          console.log(`  ${type.padEnd(15)} ${String(count).padStart(4)}`);
        }
      }

      console.log();

      dbManager.close();
      return this.success();
    });
  }
}
