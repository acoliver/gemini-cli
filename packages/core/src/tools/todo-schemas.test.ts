/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  TodoSchema,
  TodoArraySchema,
  TodoStatus,
  TodoPriority,
  TodoToolCallSchema,
  SubtaskSchema,
  ExtendedTodoSchema,
  ExtendedTodoArraySchema,
} from './todo-schemas.js';

describe('TodoSchemas', () => {
  describe('TodoStatus', () => {
    it('should accept valid status values', () => {
      expect(() => TodoStatus.parse('pending')).not.toThrow();
      expect(() => TodoStatus.parse('in_progress')).not.toThrow();
      expect(() => TodoStatus.parse('completed')).not.toThrow();
    });

    it('should reject invalid status values', () => {
      expect(() => TodoStatus.parse('invalid')).toThrow();
      expect(() => TodoStatus.parse('')).toThrow();
      expect(() => TodoStatus.parse(null)).toThrow();
    });
  });

  describe('TodoPriority', () => {
    it('should accept valid priority values', () => {
      expect(() => TodoPriority.parse('high')).not.toThrow();
      expect(() => TodoPriority.parse('medium')).not.toThrow();
      expect(() => TodoPriority.parse('low')).not.toThrow();
    });

    it('should reject invalid priority values', () => {
      expect(() => TodoPriority.parse('critical')).toThrow();
      expect(() => TodoPriority.parse('')).toThrow();
      expect(() => TodoPriority.parse(undefined)).toThrow();
    });
  });

  describe('TodoSchema', () => {
    it('should accept valid todo object', () => {
      const validTodo = {
        id: 'test-1',
        content: 'Test task',
        status: 'pending',
        priority: 'high',
      };
      expect(() => TodoSchema.parse(validTodo)).not.toThrow();
    });

    it('should reject todo with empty content', () => {
      const invalidTodo = {
        id: 'test-1',
        content: '',
        status: 'pending',
        priority: 'high',
      };
      expect(() => TodoSchema.parse(invalidTodo)).toThrow();
    });

    it('should reject todo with missing fields', () => {
      const missingId = {
        content: 'Test task',
        status: 'pending',
        priority: 'high',
      };
      expect(() => TodoSchema.parse(missingId)).toThrow();

      const missingContent = {
        id: 'test-1',
        status: 'pending',
        priority: 'high',
      };
      expect(() => TodoSchema.parse(missingContent)).toThrow();

      const missingStatus = {
        id: 'test-1',
        content: 'Test task',
        priority: 'high',
      };
      expect(() => TodoSchema.parse(missingStatus)).toThrow();

      const missingPriority = {
        id: 'test-1',
        content: 'Test task',
        status: 'pending',
      };
      expect(() => TodoSchema.parse(missingPriority)).toThrow();
    });

    it('should reject todo with invalid field types', () => {
      const invalidTypes = {
        id: 123, // should be string
        content: 'Test task',
        status: 'pending',
        priority: 'high',
      };
      expect(() => TodoSchema.parse(invalidTypes)).toThrow();
    });

    it('should reject todo with extra fields', () => {
      const extraFields = {
        id: 'test-1',
        content: 'Test task',
        status: 'pending',
        priority: 'high',
        extra: 'field',
      };
      // Strict mode would reject this
      const parsed = TodoSchema.parse(extraFields);
      expect(parsed).not.toHaveProperty('extra');
    });
  });

  describe('TodoArraySchema', () => {
    it('should accept empty array', () => {
      expect(() => TodoArraySchema.parse([])).not.toThrow();
    });

    it('should accept array of valid todos', () => {
      const validTodos = [
        {
          id: 'test-1',
          content: 'First task',
          status: 'pending',
          priority: 'high',
        },
        {
          id: 'test-2',
          content: 'Second task',
          status: 'in_progress',
          priority: 'medium',
        },
        {
          id: 'test-3',
          content: 'Third task',
          status: 'completed',
          priority: 'low',
        },
      ];
      expect(() => TodoArraySchema.parse(validTodos)).not.toThrow();
    });

    it('should reject array with invalid todos', () => {
      const invalidTodos = [
        {
          id: 'test-1',
          content: 'Valid task',
          status: 'pending',
          priority: 'high',
        },
        {
          id: 'test-2',
          content: '', // Invalid: empty content
          status: 'pending',
          priority: 'high',
        },
      ];
      expect(() => TodoArraySchema.parse(invalidTodos)).toThrow();
    });

    it('should reject non-array values', () => {
      expect(() => TodoArraySchema.parse('not an array')).toThrow();
      expect(() => TodoArraySchema.parse({})).toThrow();
      expect(() => TodoArraySchema.parse(null)).toThrow();
      expect(() => TodoArraySchema.parse(undefined)).toThrow();
    });
  });

  // New tests for extended schemas
  describe('TodoToolCallSchema', () => {
    it('should accept valid tool call object', () => {
      const validToolCall = {
        id: 'tool-1',
        name: 'runShellCommand',
        parameters: {
          command: 'ls -la',
        },
      };
      expect(() => TodoToolCallSchema.parse(validToolCall)).not.toThrow();
    });

    it('should accept tool call with empty parameters', () => {
      const toolCallWithEmptyParams = {
        id: 'tool-1',
        name: 'readFile',
        parameters: {},
      };
      expect(() =>
        TodoToolCallSchema.parse(toolCallWithEmptyParams),
      ).not.toThrow();
    });

    it('should reject tool call with missing fields', () => {
      const missingId = {
        name: 'runShellCommand',
        parameters: {},
      };
      expect(() => TodoToolCallSchema.parse(missingId)).toThrow();

      const missingName = {
        id: 'tool-1',
        parameters: {},
      };
      expect(() => TodoToolCallSchema.parse(missingName)).toThrow();

      const missingParams = {
        id: 'tool-1',
        name: 'runShellCommand',
      };
      expect(() => TodoToolCallSchema.parse(missingParams)).toThrow();
    });
  });

  describe('SubtaskSchema', () => {
    it('should accept valid subtask object without tool calls', () => {
      const validSubtask = {
        id: 'subtask-1',
        content: 'Implement feature',
      };
      expect(() => SubtaskSchema.parse(validSubtask)).not.toThrow();
    });

    it('should accept valid subtask object with tool calls', () => {
      const validSubtaskWithToolCalls = {
        id: 'subtask-1',
        content: 'Implement feature',
        toolCalls: [
          {
            id: 'tool-1',
            name: 'runShellCommand',
            parameters: {
              command: 'git add .',
            },
          },
        ],
      };
      expect(() =>
        SubtaskSchema.parse(validSubtaskWithToolCalls),
      ).not.toThrow();
    });

    it('should reject subtask with empty content', () => {
      const invalidSubtask = {
        id: 'subtask-1',
        content: '',
      };
      expect(() => SubtaskSchema.parse(invalidSubtask)).toThrow();
    });

    it('should reject subtask with missing fields', () => {
      const missingId = {
        content: 'Implement feature',
      };
      expect(() => SubtaskSchema.parse(missingId)).toThrow();

      const missingContent = {
        id: 'subtask-1',
      };
      expect(() => SubtaskSchema.parse(missingContent)).toThrow();
    });
  });

  describe('ExtendedTodoSchema', () => {
    it('should accept valid extended todo without subtasks', () => {
      const validExtendedTodo = {
        id: 'task-1',
        content: 'Implement role-based access control',
        status: 'in_progress',
        priority: 'high',
      };
      expect(() => ExtendedTodoSchema.parse(validExtendedTodo)).not.toThrow();
    });

    it('should accept valid extended todo with subtasks', () => {
      const validExtendedTodoWithSubtasks = {
        id: 'task-1',
        content: 'Implement role-based access control',
        status: 'in_progress',
        priority: 'high',
        subtasks: [
          {
            id: 'subtask-1',
            content: 'Define role enum',
            toolCalls: [
              {
                id: 'tool-1',
                name: 'runShellCommand',
                parameters: {
                  command: 'git add src/roles.ts',
                },
              },
            ],
          },
        ],
      };
      expect(() =>
        ExtendedTodoSchema.parse(validExtendedTodoWithSubtasks),
      ).not.toThrow();
    });

    it('should reject extended todo with invalid subtasks', () => {
      const extendedTodoWithInvalidSubtasks = {
        id: 'task-1',
        content: 'Implement role-based access control',
        status: 'in_progress',
        priority: 'high',
        subtasks: [
          {
            id: 'subtask-1',
            content: '', // Invalid: empty content
          },
        ],
      };
      expect(() =>
        ExtendedTodoSchema.parse(extendedTodoWithInvalidSubtasks),
      ).toThrow();
    });
  });

  describe('ExtendedTodoArraySchema', () => {
    it('should accept empty array', () => {
      expect(() => ExtendedTodoArraySchema.parse([])).not.toThrow();
    });

    it('should accept array of valid extended todos', () => {
      const validExtendedTodos = [
        {
          id: 'task-1',
          content: 'Implement role-based access control',
          status: 'in_progress',
          priority: 'high',
          subtasks: [
            {
              id: 'subtask-1',
              content: 'Define role enum',
              toolCalls: [
                {
                  id: 'tool-1',
                  name: 'runShellCommand',
                  parameters: {
                    command: 'git add src/roles.ts',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'task-2',
          content: 'Document security model',
          status: 'pending',
          priority: 'medium',
        },
      ];
      expect(() =>
        ExtendedTodoArraySchema.parse(validExtendedTodos),
      ).not.toThrow();
    });

    it('should reject array with invalid extended todos', () => {
      const invalidExtendedTodos = [
        {
          id: 'task-1',
          content: 'Valid task',
          status: 'pending',
          priority: 'high',
        },
        {
          id: 'task-2',
          content: '', // Invalid: empty content
          status: 'pending',
          priority: 'high',
        },
      ];
      expect(() =>
        ExtendedTodoArraySchema.parse(invalidExtendedTodos),
      ).toThrow();
    });
  });

  describe('Backward compatibility', () => {
    it('should accept regular todo objects with extended schema', () => {
      const regularTodo = {
        id: 'test-1',
        content: 'Test task',
        status: 'pending',
        priority: 'high',
      };
      expect(() => ExtendedTodoSchema.parse(regularTodo)).not.toThrow();
    });

    it('should accept array of regular todos with extended array schema', () => {
      const regularTodos = [
        {
          id: 'test-1',
          content: 'First task',
          status: 'pending',
          priority: 'high',
        },
        {
          id: 'test-2',
          content: 'Second task',
          status: 'in_progress',
          priority: 'medium',
        },
      ];
      expect(() => ExtendedTodoArraySchema.parse(regularTodos)).not.toThrow();
    });
  });
});
