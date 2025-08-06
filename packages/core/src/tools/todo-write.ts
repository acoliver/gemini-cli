/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type } from '@google/genai';
import { BaseTool, ToolResult, Icon } from './tools.js';
import { Todo, TodoArraySchema } from './todo-schemas.js';
import { TodoStore } from './todo-store.js';
import { TodoReminderService } from '../services/todo-reminder-service.js';
import { todoEvents, TodoUpdateEvent } from './todo-events.js';

export interface TodoWriteParams {
  todos: Todo[];
}

export class TodoWrite extends BaseTool<TodoWriteParams, ToolResult> {
  static readonly Name = 'todo_write';
  private reminderService = new TodoReminderService();

  constructor() {
    super(
      TodoWrite.Name,
      'TodoWrite',
      'Create and manage a structured task list for the current coding session. Updates the entire todo list.',
      Icon.LightBulb,
      {
        type: Type.OBJECT,
        properties: {
          todos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING,
                  description: 'Unique identifier for the todo item',
                },
                content: {
                  type: Type.STRING,
                  description: 'Description of the todo item',
                  minLength: '1',
                },
                status: {
                  type: Type.STRING,
                  enum: ['pending', 'in_progress', 'completed'],
                  description: 'Current status of the todo item',
                },
                priority: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                  description: 'Priority level of the todo item',
                },
                subtasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: {
                        type: Type.STRING,
                        description: 'Unique identifier for the subtask',
                      },
                      content: {
                        type: Type.STRING,
                        description: 'Description of the subtask',
                        minLength: '1',
                      },
                      toolCalls: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: {
                              type: Type.STRING,
                              description:
                                'Unique identifier for the tool call',
                            },
                            name: {
                              type: Type.STRING,
                              description: 'Name of the tool being called',
                            },
                            parameters: {
                              type: Type.OBJECT,
                              description: 'Parameters for the tool call',
                            },
                          },
                          required: ['id', 'name', 'parameters'],
                        },
                        description: 'Tool calls associated with the subtask',
                      },
                    },
                    required: ['id', 'content'],
                  },
                  description: 'Subtasks associated with this todo',
                },
              },
              required: ['id', 'content', 'status', 'priority'],
            },
            description: 'The updated todo list',
          },
        },
        required: ['todos'],
      },
      true, // isOutputMarkdown
      false, // canUpdateOutput
    );
  }

  getDescription(params: TodoWriteParams): string {
    return `Update todo list with ${params.todos.length} items`;
  }

  async execute(
    params: TodoWriteParams,
    _signal: AbortSignal,
    _updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    // Validate todos with Zod schema
    const result = TodoArraySchema.safeParse(params.todos);
    if (!result.success) {
      const error = result.error.errors[0];
      throw new Error(
        `Validation error: ${error.path.join('.')} - ${error.message}`,
      );
    }

    // Get session and agent IDs from context
    const sessionId = this.context?.sessionId || 'default';
    const agentId = this.context?.agentId;

    const store = new TodoStore(sessionId, agentId);

    // Read old todos for diff tracking
    const oldTodos = await store.readTodos();

    // Write new todos
    await store.writeTodos(params.todos);

    // Calculate state change
    const stateChange = this.reminderService.calculateStateChange(
      oldTodos,
      params.todos,
    );

    // Generate reminder if needed
    let reminder: string | null = null;
    if (this.reminderService.shouldGenerateReminder(stateChange)) {
      reminder = this.reminderService.getReminderForStateChange(stateChange);
    }

    // Determine if we're in interactive mode
    const isInteractive = this.context?.interactiveMode || false;

    // Emit event for UI update in interactive mode
    if (isInteractive) {
      const event: TodoUpdateEvent = {
        sessionId,
        agentId,
        todos: params.todos,
        timestamp: new Date(),
      };
      todoEvents.emitTodoUpdated(event);
    }

    // Generate output based on mode
    let output: string;
    if (isInteractive) {
      // In interactive mode, suppress markdown and return minimal result
      output = 'TODO list updated';
    } else {
      // In non-interactive mode, provide simplified markdown
      output = this.generateSimplifiedOutput(params.todos);
    }

    const statistics = this.calculateStatistics(params.todos);
    const nextAction = this.determineNextAction(params.todos);

    return {
      llmContent: output + (reminder || ''),
      returnDisplay: isInteractive ? '' : output, // Empty to suppress display in interactive mode
      metadata: {
        stateChanged: this.reminderService.shouldGenerateReminder(stateChange),
        todosAdded: stateChange.added.length,
        todosRemoved: stateChange.removed.length,
        statusChanged: stateChange.statusChanged.length,
        statistics,
        nextAction,
      },
    };
  }

  private generateSimplifiedOutput(todos: Todo[]): string {
    let output = `## Todo List (${todos.length} tasks)\n`;

    for (const todo of todos) {
      // Determine status marker
      let marker = '';
      if (todo.status === 'completed') {
        marker = '- [x]';
      } else if (todo.status === 'pending') {
        marker = '- [ ]';
      } else if (todo.status === 'in_progress') {
        marker = '- [→] ← current';
      }

      output += `${marker} ${todo.content}\n`;
    }

    return output;
  }

  private calculateStatistics(todos: Todo[]): {
    total: number;
    inProgress: number;
    pending: number;
    completed: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
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

  private determineNextAction(todos: Todo[]): {
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
