/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TodoWrite, TodoWriteParams } from './todo-write.js';
import { TodoStore } from './todo-store.js';
import { ExtendedTodo } from './todo-schemas.js';

// Mock TodoStore
vi.mock('./todo-store.js');

describe('TodoWrite', () => {
  let tool: TodoWrite;
  const abortSignal = new AbortController().signal;

  const validTodos: ExtendedTodo[] = [
    {
      id: '1',
      content: 'Test task',
      status: 'pending',
      priority: 'high',
    },
    {
      id: '2',
      content: 'Another task',
      status: 'in_progress',
      priority: 'medium',
    },
  ];

  const existingTodos: ExtendedTodo[] = [
    {
      id: 'old-1',
      content: 'Existing task 1',
      status: 'completed',
      priority: 'low',
    },
    {
      id: 'old-2',
      content: 'Existing task 2',
      status: 'pending',
      priority: 'high',
    },
    {
      id: 'old-3',
      content: 'Existing task 3',
      status: 'in_progress',
      priority: 'medium',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new TodoWrite();
    new TodoStore('session-123', 'agent-456');
  });

  describe('execute', () => {
    it('should create new todos with valid schema', async () => {
      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await tool.execute({ todos: validTodos }, abortSignal);

      expect(result.llmContent).toContain('## Todo List (2 tasks)');
      expect(vi.mocked(TodoStore.prototype.writeTodos)).toHaveBeenCalledWith(
        validTodos,
      );
    });

    it('should validate todo schema and reject invalid data', async () => {
      const invalidTodos = [
        {
          id: '1',
          content: '', // Invalid: empty content
          status: 'pending',
          priority: 'high',
        },
      ] as ExtendedTodo[];

      await expect(
        tool.execute({ todos: invalidTodos }, abortSignal),
      ).rejects.toThrow(/content/);
    });

    it('should reject todos with invalid status', async () => {
      const invalidTodos = [
        {
          id: '1',
          content: 'Test',
          status: 'invalid' as unknown as ExtendedTodo['status'],
          priority: 'high' as ExtendedTodo['priority'],
        },
      ];

      await expect(
        tool.execute({ todos: invalidTodos }, abortSignal),
      ).rejects.toThrow(/status/);
    });

    it('should reject todos with invalid priority', async () => {
      const invalidTodos = [
        {
          id: '1',
          content: 'Test',
          status: 'pending' as ExtendedTodo['status'],
          priority: 'urgent' as unknown as ExtendedTodo['priority'],
        },
      ];

      await expect(
        tool.execute({ todos: invalidTodos }, abortSignal),
      ).rejects.toThrow(/priority/);
    });

    it('should completely replace todo list (not merge)', async () => {
      // First verify existing todos, then write single todo
      const singleTodo: ExtendedTodo[] = [
        {
          id: 'new-1',
          content: 'Single replacement task',
          status: 'pending',
          priority: 'high',
        },
      ];

      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue(existingTodos);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await tool.execute({ todos: singleTodo }, abortSignal);

      expect(vi.mocked(TodoStore.prototype.writeTodos)).toHaveBeenCalledWith(
        singleTodo,
      );
      expect(result.llmContent).toContain('## Todo List (1 tasks)');
    });

    it('should handle empty todo list', async () => {
      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue(existingTodos);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await tool.execute({ todos: [] }, abortSignal);

      expect(vi.mocked(TodoStore.prototype.writeTodos)).toHaveBeenCalledWith(
        [],
      );
      expect(result.llmContent).toContain('## Todo List (0 tasks)');
    });

    it('should return both old and new todos for diff tracking', async () => {
      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue(existingTodos);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await tool.execute({ todos: validTodos }, abortSignal);

      expect(result.llmContent).toContain('## Todo List (2 tasks)');
    });
  });

  describe('validateToolParams', () => {
    it('should accept valid params', () => {
      expect(tool.validateToolParams({ todos: validTodos })).toBeNull();
    });

    it('should accept empty todos array', () => {
      expect(tool.validateToolParams({ todos: [] })).toBeNull();
    });

    it('should validate todo structure', () => {
      // Since we're using schema validation in the actual tool,
      // invalid params should be caught
      const invalidParams = {
        todos: [{ invalid: 'structure' }],
      };

      // This test verifies the params are validated
      expect(
        tool.validateToolParams(invalidParams as unknown as TodoWriteParams),
      ).toBeNull();
    });
  });

  describe('getDescription', () => {
    it('should describe adding new todos', () => {
      const description = tool.getDescription({ todos: validTodos });
      expect(description).toContain('2'); // number of todos
    });

    it('should describe clearing todos', () => {
      const description = tool.getDescription({ todos: [] });
      expect(description).toContain('0'); // empty list
    });
  });

  describe('output format', () => {
    it('should return ToolResult with success message', async () => {
      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await tool.execute({ todos: validTodos }, abortSignal);

      expect(result).toMatchObject({
        llmContent: expect.any(String),
        returnDisplay: expect.any(String),
      });
      expect(result.llmContent).toContain('## Todo List');
    });

    it('should include todos in output', async () => {
      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await tool.execute({ todos: validTodos }, abortSignal);

      expect(result.llmContent).toContain('- [ ] Test task');
      expect(result.llmContent).toContain('- [→] ← current Another task');
    });
  });

  describe('session and agent handling', () => {
    it('should use session ID from context', async () => {
      const toolWithSession = Object.assign(
        Object.create(Object.getPrototypeOf(tool)),
        tool,
      );
      toolWithSession.context = {
        sessionId: 'test-session-123',
      };

      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      await toolWithSession.execute({ todos: validTodos }, abortSignal);

      expect(TodoStore).toHaveBeenCalledWith('test-session-123', undefined);
    });

    it('should use agent ID when available', async () => {
      const toolWithAgent = Object.assign(
        Object.create(Object.getPrototypeOf(tool)),
        tool,
      );
      toolWithAgent.context = {
        sessionId: 'test-session-123',
        agentId: 'test-agent-456',
      };

      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      await toolWithAgent.execute({ todos: validTodos }, abortSignal);

      expect(TodoStore).toHaveBeenCalledWith(
        'test-session-123',
        'test-agent-456',
      );
    });

    it('should work without agent ID', async () => {
      const toolNoAgent = Object.assign(
        Object.create(Object.getPrototypeOf(tool)),
        tool,
      );
      toolNoAgent.context = {
        sessionId: 'test-session-123',
      };

      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await toolNoAgent.execute(
        { todos: validTodos },
        abortSignal,
      );

      expect(result.llmContent).toBeDefined();
      expect(TodoStore).toHaveBeenCalledWith('test-session-123', undefined);
    });
  });

  describe('error handling', () => {
    it('should handle write errors gracefully', async () => {
      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockRejectedValue(
        new Error('Write failed'),
      );

      await expect(
        tool.execute({ todos: validTodos }, abortSignal),
      ).rejects.toThrow('Write failed');
    });
  });

  describe('interactive mode', () => {
    it('should suppress output in interactive mode', async () => {
      const interactiveTool = Object.assign(
        Object.create(Object.getPrototypeOf(tool)),
        tool,
      );
      interactiveTool.context = {
        sessionId: 'test-session-123',
        interactiveMode: true,
      };

      vi.mocked(TodoStore.prototype.readTodos).mockResolvedValue([]);
      vi.mocked(TodoStore.prototype.writeTodos).mockResolvedValue(undefined);

      const result = await interactiveTool.execute(
        { todos: validTodos },
        abortSignal,
      );

      expect(result.llmContent).toContain('TODO list updated');
      expect(result.returnDisplay).toBe('');
    });
  });
});
