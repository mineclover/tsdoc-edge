/**
 * Task Management Types
 * @packageDocumentation
 * @responsibility Define task and checklist types for project management
 */

/**
 * Task status enum
 * @public
 */
export enum TaskStatus {
  /** [ ] Not started */
  TODO = 'todo',
  /** [~] In progress */
  IN_PROGRESS = 'in_progress',
  /** [x] Completed */
  DONE = 'done',
  /** [-] Blocked or on hold */
  BLOCKED = 'blocked',
  /** [!] High priority */
  URGENT = 'urgent',
}

/**
 * Task priority levels
 * @public
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Task type categories
 * @public
 */
export enum TaskType {
  /** Feature implementation */
  FEATURE = 'feature',
  /** Bug fix */
  BUG = 'bug',
  /** Documentation */
  DOCS = 'docs',
  /** Refactoring */
  REFACTOR = 'refactor',
  /** Testing */
  TEST = 'test',
  /** Research/Investigation */
  RESEARCH = 'research',
}

/**
 * Task definition
 * @public
 */
export interface Task {
  /** Unique task ID */
  id: string;
  /** Task title */
  title: string;
  /** Detailed description */
  description?: string;
  /** Current status */
  status: TaskStatus;
  /** Priority level */
  priority: TaskPriority;
  /** Task type/category */
  type: TaskType;
  /** Assigned to (symbol, file, or person) */
  assignedTo?: string;
  /** Related symbol ID */
  symbolId?: string;
  /** Related file path */
  filePath?: string;
  /** Line number in source */
  line?: number;
  /** Estimated effort (hours) */
  estimatedHours?: number;
  /** Actual effort (hours) */
  actualHours?: number;
  /** Due date */
  dueDate?: string;
  /** Parent task ID (for subtasks) */
  parentId?: string;
  /** Dependent task IDs (must complete before this) */
  dependencies?: string[];
  /** Tags for categorization */
  tags?: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Notes or comments */
  notes?: string;
}

/**
 * Checklist item for markdown-style checklists
 * @public
 */
export interface ChecklistItem {
  /** Checkbox character: [ ], [x], [~], [-], [!] */
  status: TaskStatus;
  /** Item text */
  text: string;
  /** Indentation level (for nested items) */
  level: number;
  /** Line number in file */
  line: number;
  /** File path */
  filePath: string;
}

/**
 * Task filter options
 * @public
 */
export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  type?: TaskType | TaskType[];
  assignedTo?: string;
  symbolId?: string;
  tags?: string[];
  dueBefore?: string;
  dueAfter?: string;
}

/**
 * Task statistics
 * @public
 */
export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  byType: Record<TaskType, number>;
  completionRate: number;
  avgCompletionTime: number;
  overdueCount: number;
}

/**
 * Task update payload
 * @public
 */
export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  tags?: string[];
  notes?: string;
}
