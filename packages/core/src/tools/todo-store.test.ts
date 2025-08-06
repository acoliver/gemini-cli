/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoStore } from './todo-store.js';
import { Todo } from './todo-schemas.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('TodoStore', () => {
  let tempDir: string;
  let store: TodoStore;
  const sessionId = 'test-session-123';
  const agentId = 'test-agent-456';

  const sampleTodos: Todo[] = [
    {
      id: '1',
      content: 'First task',
      status: 'pending',
      priority: 'high',
    },
    {
      id: '2',
      content: 'Second task',
      status: 'in_progress',
      priority: 'medium',
    },
    {
      id: '3',
      content: 'Third task',
      status: 'completed',
      priority: 'low',
    },
  ];

  beforeEach(() => {
    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-store-test-'));
    // Mock the home directory to use our temp dir
    process.env.HOME = tempDir;
    store = new TodoStore(sessionId, agentId);
  });

  afterEach(() => {
    // Clean up the temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('readTodos', () => {
    it('should return empty array when no todos exist', async () => {
      const result = await store.readTodos();
      expect(result).toEqual([]);
    });

    it('should read todos from file system', async () => {
      // Write some todos first
      await store.writeTodos(sampleTodos);

      // Read them back
      const result = await store.readTodos();
      expect(result).toEqual(sampleTodos);
    });

    it('should handle missing file gracefully', async () => {
      // Ensure file doesn't exist
      const filePath = path.join(
        tempDir,
        '.llxprt',
        'todos',
        `todo-${sessionId}-${agentId}.json`,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const result = await store.readTodos();
      expect(result).toEqual([]);
    });
  });

  describe('writeTodos', () => {
    it('should write todos to file system', async () => {
      await store.writeTodos(sampleTodos);

      const filePath = path.join(
        tempDir,
        '.llxprt',
        'todos',
        `todo-${sessionId}-${agentId}.json`,
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toEqual(sampleTodos);
    });

    it('should create todos directory if not exists', async () => {
      const todosDir = path.join(tempDir, '.llxprt', 'todos');
      if (fs.existsSync(todosDir)) {
        fs.rmSync(todosDir, { recursive: true });
      }

      await store.writeTodos(sampleTodos);

      expect(fs.existsSync(todosDir)).toBe(true);
    });

    it('should overwrite existing todos', async () => {
      // Write initial todos
      await store.writeTodos(sampleTodos);

      // Write different todos
      const newTodos: Todo[] = [
        {
          id: '99',
          content: 'New task',
          status: 'pending',
          priority: 'high',
        },
      ];
      await store.writeTodos(newTodos);

      // Verify only new todos exist
      const result = await store.readTodos();
      expect(result).toEqual(newTodos);
    });

    it('should write empty array when no todos provided', async () => {
      await store.writeTodos([]);

      const result = await store.readTodos();
      expect(result).toEqual([]);
    });
  });

  describe('agent-specific storage', () => {
    it('should use different files for different agents', async () => {
      const store1 = new TodoStore(sessionId, 'agent1');
      const store2 = new TodoStore(sessionId, 'agent2');

      await store1.writeTodos(sampleTodos);
      await store2.writeTodos([]);

      expect(await store1.readTodos()).toEqual(sampleTodos);
      expect(await store2.readTodos()).toEqual([]);
    });

    it('should use session-only file when no agent ID provided', async () => {
      const sessionStore = new TodoStore(sessionId);
      await sessionStore.writeTodos(sampleTodos);

      const filePath = path.join(
        tempDir,
        '.llxprt',
        'todos',
        `${sessionId}.json`,
      );
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('concurrent access', () => {
    it('should handle multiple simultaneous reads safely', async () => {
      await store.writeTodos(sampleTodos);

      const promises = Array(10)
        .fill(null)
        .map(() => store.readTodos());

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toEqual(sampleTodos);
      });
    });

    it('should handle simultaneous read and write', async () => {
      const readPromise = store.readTodos();
      const writePromise = store.writeTodos(sampleTodos);

      await Promise.all([readPromise, writePromise]);

      // Verify write succeeded
      const result = await store.readTodos();
      expect(result).toEqual(sampleTodos);
    });
  });

  describe('file path generation', () => {
    it('should generate correct file path for session and agent', async () => {
      // This test verifies the private getFilePath method indirectly
      await store.writeTodos(sampleTodos);

      const expectedPath = path.join(
        tempDir,
        '.llxprt',
        'todos',
        `todo-${sessionId}-${agentId}.json`,
      );
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });
});
