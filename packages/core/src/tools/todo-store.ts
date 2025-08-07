/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Todo, TodoArraySchema } from './todo-schemas.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class TodoStore {
  private readonly filePath: string;

  constructor(sessionId: string, agentId?: string) {
    const todoDir = path.join(os.homedir(), '.llxprt', 'todos');
    // Ensure directory exists
    fs.mkdirSync(todoDir, { recursive: true });

    // Create filename based on session and agent
    const fileName = agentId
      ? `todo-${sessionId}-${agentId}.json`
      : `todo-${sessionId}.json`;
    this.filePath = path.join(todoDir, fileName);
  }

  async readTodos(): Promise<Todo[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      // Read file content
      const content = await fs.promises.readFile(this.filePath, 'utf8');

      // Parse and validate
      const rawData = JSON.parse(content);
      const result = TodoArraySchema.safeParse(rawData);

      if (!result.success) {
        // If validation fails, return empty array
        // In a production system, we might want to handle this differently
        return [];
      }

      return result.data;
    } catch (_error) {
      // If any error occurs, return empty array
      // In a production system, we might want to handle this differently
      return [];
    }
  }

  async writeTodos(todos: Todo[]): Promise<void> {
    // Validate todos before writing
    const result = TodoArraySchema.safeParse(todos);
    if (!result.success) {
      throw new Error('Invalid todo data');
    }

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Write to file
    const content = JSON.stringify(result.data, null, 2);
    await fs.promises.writeFile(this.filePath, content, 'utf8');
  }
}
