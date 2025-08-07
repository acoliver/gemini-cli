/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to track which todo item is currently active in a session.
 * This allows associating tool calls with the active todo.
 */
export class TodoContextTracker {
  private static instances = new Map<string, TodoContextTracker>();

  private activeTodoId: string | null = null;

  private constructor(private readonly sessionId: string) {}

  /**
   * Get or create a tracker instance for a session
   */
  static forSession(sessionId: string): TodoContextTracker {
    if (!this.instances.has(sessionId)) {
      this.instances.set(sessionId, new TodoContextTracker(sessionId));
    }
    return this.instances.get(sessionId)!;
  }

  /**
   * Set the active todo for this session
   */
  setActiveTodo(todoId: string | null): void {
    this.activeTodoId = todoId;
  }

  /**
   * Get the active todo ID for this session
   */
  getActiveTodoId(): string | null {
    return this.activeTodoId;
  }

  /**
   * Clear the active todo for this session
   */
  clearActiveTodo(): void {
    this.activeTodoId = null;
  }
}
