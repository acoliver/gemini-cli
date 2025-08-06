/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult, Icon } from './tools.js';
import { Todo } from './todo-schemas.js';
import { TodoStore } from './todo-store.js';
import { Type } from '@google/genai';
import { TodoReminderService } from '../services/todo-reminder-service.js';

export type TodoReadParams = Record<string, never>;

export class TodoRead extends BaseTool<TodoReadParams, ToolResult> {
  static readonly Name = 'todo_read';
  private reminderService = new TodoReminderService();

  constructor() {
    super(
      TodoRead.Name,
      'TodoRead',
      'Read the current todo list for the session. Returns all todos with their status, priority, and content.',
      Icon.LightBulb,
      {
        type: Type.OBJECT,
        properties: {},
      },
      true, // isOutputMarkdown
      false, // canUpdateOutput
    );
  }

  getDescription(_params: TodoReadParams): string {
    return 'Read current todo list';
  }

  async execute(
    _params: TodoReadParams,
    _signal: AbortSignal,
    _updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    // Get session and agent IDs from context
    const sessionId = this.context?.sessionId || 'default';
    const agentId = this.context?.agentId;

    const store = new TodoStore(sessionId, agentId);
    const todos = await store.readTodos();

    if (todos.length === 0) {
      // Check if this is part of a complex task (will be enhanced in Phase 5)
      const isComplexTask = false; // Placeholder - will be determined by context
      const reminder =
        this.reminderService.getReminderForEmptyTodos(isComplexTask);

      const emptyOutput =
        '## Todo List\n\n' +
        'No todos found.\n\n' +
        'Use TodoWrite to create a task list when working on multi-step projects.';

      return {
        llmContent: emptyOutput + (reminder || ''),
        returnDisplay: emptyOutput,
      };
    }

    // Group and sort todos
    const groupedTodos = this.groupTodosByStatus(todos);

    // Format output
    const output = this.formatTodos(groupedTodos, todos);

    // Calculate metadata
    const statistics = this.calculateStatistics(todos);
    const suggestedAction = this.determineSuggestedAction(todos);

    return {
      llmContent: output,
      returnDisplay: output,
      metadata: {
        totalTasks: todos.length,
        statistics,
        suggestedAction,
      },
    };
  }

  private groupTodosByStatus(todos: Todo[]): {
    inProgress: Todo[];
    pending: Todo[];
    completed: Todo[];
  } {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortByPriority = (a: Todo, b: Todo) =>
      priorityOrder[a.priority] - priorityOrder[b.priority];

    return {
      inProgress: todos
        .filter((t) => t.status === 'in_progress')
        .sort(sortByPriority),
      pending: todos.filter((t) => t.status === 'pending').sort(sortByPriority),
      completed: todos
        .filter((t) => t.status === 'completed')
        .sort(sortByPriority),
    };
  }

  private formatTodos(
    groupedTodos: ReturnType<typeof this.groupTodosByStatus>,
    allTodos: Todo[],
  ): string {
    const priorityIndicators = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };

    const statusIcons = {
      in_progress: '⏳',
      pending: '○',
      completed: '✓',
    };

    let output = '## Todo List\n\n';

    // In Progress section
    if (groupedTodos.inProgress.length > 0) {
      output += '### In Progress\n\n';
      for (const todo of groupedTodos.inProgress) {
        const icon = statusIcons[todo.status];
        const priorityIcon = priorityIndicators[todo.priority];
        output += `${icon} **${todo.content}** ${priorityIcon} ${todo.priority}\n`;
      }
      output += '\n';
    }

    // Pending section
    if (groupedTodos.pending.length > 0) {
      output += '### Pending\n\n';
      for (const todo of groupedTodos.pending) {
        const icon = statusIcons[todo.status];
        const priorityIcon = priorityIndicators[todo.priority];
        output += `${icon} **${todo.content}** ${priorityIcon} ${todo.priority}\n`;
      }
      output += '\n';
    }

    // Completed section
    if (groupedTodos.completed.length > 0) {
      output += '### Completed\n\n';
      for (const todo of groupedTodos.completed) {
        const icon = statusIcons[todo.status];
        const priorityIcon = priorityIndicators[todo.priority];
        output += `${icon} **${todo.content}** ${priorityIcon} ${todo.priority}\n`;
      }
      output += '\n';
    }

    // Summary
    const stats = this.calculateStatistics(allTodos);
    output += '### Summary\n\n';
    output += `- Total: ${stats.total} tasks\n`;
    output += `- In Progress: ${stats.inProgress}\n`;
    output += `- Pending: ${stats.pending}\n`;
    output += `- Completed: ${stats.completed}\n\n`;
    output += `Priority distribution:\n`;
    output += `- High priority: ${stats.highPriority}\n`;
    output += `- Medium priority: ${stats.mediumPriority}\n`;
    output += `- Low priority: ${stats.lowPriority}\n\n`;

    // Suggested Next Action
    const suggestedAction = this.determineSuggestedAction(allTodos);
    output += '### Suggested Next Action\n\n';
    if (suggestedAction.type === 'all-complete') {
      output += 'All tasks are completed\n';
    } else if (suggestedAction.type === 'continue') {
      output += `Continue working on: **${suggestedAction.taskContent}**\n`;
    } else if (suggestedAction.type === 'start') {
      output += `Consider starting: **${suggestedAction.taskContent}**\n`;
    }

    return output;
  }

  private calculateStatistics(todos: Todo[]): {
    inProgress: number;
    pending: number;
    completed: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    total: number;
  } {
    return {
      total: todos.length,
      inProgress: todos.filter((t) => t.status === 'in_progress').length,
      pending: todos.filter((t) => t.status === 'pending').length,
      completed: todos.filter((t) => t.status === 'completed').length,
      highPriority: todos.filter((t) => t.priority === 'high').length,
      mediumPriority: todos.filter((t) => t.priority === 'medium').length,
      lowPriority: todos.filter((t) => t.priority === 'low').length,
    };
  }

  private determineSuggestedAction(todos: Todo[]): {
    type: 'continue' | 'start' | 'all-complete';
    taskId?: string;
    taskContent?: string;
  } {
    // Check if any tasks are in progress
    const inProgressTasks = todos.filter((t) => t.status === 'in_progress');
    if (inProgressTasks.length > 0) {
      // Continue with highest priority in-progress task
      const task = inProgressTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })[0];
      return {
        type: 'continue',
        taskId: task.id,
        taskContent: task.content,
      };
    }

    // Check if any tasks are pending
    const pendingTasks = todos.filter((t) => t.status === 'pending');
    if (pendingTasks.length > 0) {
      // Start with highest priority pending task
      const task = pendingTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })[0];
      return {
        type: 'start',
        taskId: task.id,
        taskContent: task.content,
      };
    }

    // All tasks are completed
    return { type: 'all-complete' };
  }
}
