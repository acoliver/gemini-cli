/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtendedTodo } from './todo-schemas.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

export class TodoStore {
  private sessionId: string;
  private agentId?: string;

  constructor(sessionId: string, agentId?: string) {
    this.sessionId = sessionId;
    this.agentId = agentId;
  }

  async readTodos(): Promise<ExtendedTodo[]> {
    const filePath = this.getFilePath();
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const rawData = JSON.parse(content);

      // If it's already an array of ExtendedTodo, return as is
      if (Array.isArray(rawData)) {
        return rawData as ExtendedTodo[];
      }

      // Handle any unexpected data format
      return [];
    } catch (error) {
      // Return empty array if file doesn't exist
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async writeTodos(todos: ExtendedTodo[]): Promise<void> {
    const filePath = this.getFilePath();
    const dir = path.dirname(filePath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write todos to file
    await fs.writeFile(filePath, JSON.stringify(todos, null, 2), 'utf-8');
  }

  async clearTodos(): Promise<void> {
    const filePath = this.getFilePath();
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private getFilePath(): string {
    const homeDir = process.env.HOME || os.homedir();
    const todosDir = path.join(homeDir, '.llxprt', 'todos');

    const fileName = this.agentId
      ? `${this.sessionId}-agent-${this.agentId}.json`
      : `${this.sessionId}.json`;

    return path.join(todosDir, fileName);
  }
}
