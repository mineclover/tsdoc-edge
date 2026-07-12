/**
 * TaskManager Tests
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { TaskManager } from '../../task/TaskManager';
import { TaskPriority, TaskStatus, TaskType } from '../../types/task';

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let dbManager: DatabaseManager;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-test-'));
    const dbPath = path.join(testDir, 'test.db');
    const jsonlPath = path.join(testDir, 'jsonl');
    dbManager = new DatabaseManager(dbPath, jsonlPath);
    taskManager = new TaskManager(dbManager);
  });

  afterEach(() => {
    dbManager.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createTask', () => {
    it('should create a task with required fields', () => {
      const task = taskManager.createTask({
        title: 'Test Task',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        type: TaskType.FEATURE,
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.type).toBe(TaskType.FEATURE);
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should create a task with all optional fields', () => {
      const task = taskManager.createTask({
        title: 'Full Task',
        description: 'A detailed description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        type: TaskType.BUG,
        assignedTo: 'developer',
        symbolId: 'symbol-123',
        filePath: 'src/test.ts',
        line: 42,
        estimatedHours: 4,
        dueDate: '2025-12-31',
        tags: ['urgent', 'backend'],
        notes: 'Some notes',
      });

      expect(task.description).toBe('A detailed description');
      expect(task.assignedTo).toBe('developer');
      expect(task.symbolId).toBe('symbol-123');
      expect(task.filePath).toBe('src/test.ts');
      expect(task.line).toBe(42);
      expect(task.estimatedHours).toBe(4);
      expect(task.dueDate).toBe('2025-12-31');
      expect(task.tags).toEqual(['urgent', 'backend']);
      expect(task.notes).toBe('Some notes');
    });
  });

  describe('getTask', () => {
    it('should retrieve an existing task', () => {
      const created = taskManager.createTask({
        title: 'Get Me',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        type: TaskType.DOCS,
      });

      const retrieved = taskManager.getTask(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Get Me');
    });

    it('should return null for non-existent task', () => {
      const result = taskManager.getTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update task fields', () => {
      const task = taskManager.createTask({
        title: 'Original',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        type: TaskType.FEATURE,
      });

      const updated = taskManager.updateTask(task.id, {
        title: 'Updated',
        priority: TaskPriority.HIGH,
      });

      expect(updated?.title).toBe('Updated');
      expect(updated?.priority).toBe(TaskPriority.HIGH);
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should set completedAt when marking as done', () => {
      const task = taskManager.createTask({
        title: 'Complete Me',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        type: TaskType.FEATURE,
      });

      const updated = taskManager.updateTask(task.id, {
        status: TaskStatus.DONE,
      });

      expect(updated?.status).toBe(TaskStatus.DONE);
      expect(updated?.completedAt).toBeDefined();
    });

    it('should return null for non-existent task', () => {
      const result = taskManager.updateTask('non-existent', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete an existing task', () => {
      const task = taskManager.createTask({
        title: 'Delete Me',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        type: TaskType.FEATURE,
      });

      const result = taskManager.deleteTask(task.id);

      expect(result).toBe(true);
      expect(taskManager.getTask(task.id)).toBeNull();
    });

    it('should return false for non-existent task', () => {
      const result = taskManager.deleteTask('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('listTasks', () => {
    beforeEach(() => {
      taskManager.createTask({
        title: 'Task 1',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        type: TaskType.FEATURE,
      });
      taskManager.createTask({
        title: 'Task 2',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        type: TaskType.BUG,
        assignedTo: 'developer',
      });
      taskManager.createTask({
        title: 'Task 3',
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        type: TaskType.DOCS,
        symbolId: 'sym-1',
      });
    });

    it('should list all tasks without filter', () => {
      const tasks = taskManager.listTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should filter by status', () => {
      const tasks = taskManager.listTasks({ status: TaskStatus.TODO });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('should filter by multiple statuses', () => {
      const tasks = taskManager.listTasks({ status: [TaskStatus.TODO, TaskStatus.DONE] });
      expect(tasks).toHaveLength(2);
    });

    it('should filter by priority', () => {
      const tasks = taskManager.listTasks({ priority: TaskPriority.HIGH });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('should filter by type', () => {
      const tasks = taskManager.listTasks({ type: TaskType.BUG });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 2');
    });

    it('should filter by assignedTo', () => {
      const tasks = taskManager.listTasks({ assignedTo: 'developer' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 2');
    });

    it('should filter by symbolId', () => {
      const tasks = taskManager.listTasks({ symbolId: 'sym-1' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 3');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty list', () => {
      const stats = taskManager.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.avgCompletionTime).toBe(0);
      expect(stats.overdueCount).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      taskManager.createTask({
        title: 'Todo',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        type: TaskType.FEATURE,
      });
      taskManager.createTask({
        title: 'Done',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        type: TaskType.BUG,
        completedAt: new Date().toISOString(),
      });
      taskManager.createTask({
        title: 'Overdue',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
        type: TaskType.DOCS,
        dueDate: '2020-01-01',
      });

      const stats = taskManager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus[TaskStatus.TODO]).toBe(1);
      expect(stats.byStatus[TaskStatus.DONE]).toBe(1);
      expect(stats.byStatus[TaskStatus.IN_PROGRESS]).toBe(1);
      expect(stats.byPriority[TaskPriority.HIGH]).toBe(1);
      expect(stats.byType[TaskType.FEATURE]).toBe(1);
      expect(stats.overdueCount).toBe(1);
    });
  });

  describe('parseMarkdownChecklist', () => {
    it('should parse empty checklist from non-existent file', () => {
      const items = taskManager.parseMarkdownChecklist('/non/existent/file.md');
      expect(items).toHaveLength(0);
    });

    it('should parse checklist items from markdown', () => {
      const checklistPath = path.join(testDir, 'checklist.md');
      fs.writeFileSync(
        checklistPath,
        `# Checklist
- [ ] Todo item
- [x] Done item
- [~] In progress item
- [-] Blocked item
- [!] Urgent item
  - [ ] Nested item
`
      );

      const items = taskManager.parseMarkdownChecklist(checklistPath);

      expect(items).toHaveLength(6);
      expect(items[0].status).toBe(TaskStatus.TODO);
      expect(items[0].text).toBe('Todo item');
      expect(items[1].status).toBe(TaskStatus.DONE);
      expect(items[2].status).toBe(TaskStatus.IN_PROGRESS);
      expect(items[3].status).toBe(TaskStatus.BLOCKED);
      expect(items[4].status).toBe(TaskStatus.URGENT);
      expect(items[5].level).toBe(1);
    });

    it('should handle asterisk list markers', () => {
      const checklistPath = path.join(testDir, 'asterisk.md');
      fs.writeFileSync(
        checklistPath,
        `* [x] Item with asterisk
`
      );

      const items = taskManager.parseMarkdownChecklist(checklistPath);

      expect(items).toHaveLength(1);
      expect(items[0].status).toBe(TaskStatus.DONE);
    });
  });
});
