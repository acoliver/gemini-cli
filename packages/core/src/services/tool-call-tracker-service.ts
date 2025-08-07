/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { TodoStore } from '../tools/todo-store.js';
import { TodoContextTracker } from '../services/todo-context-tracker.js';
import { TodoToolCall } from '../tools/todo-schemas.js';
import { todoEvents } from '../tools/todo-events.js';

// Map of session ID to map of todo ID to executing tool calls
// This keeps track of currently executing tool calls in memory (not persisted)
const executingToolCalls = new Map<
  string,
  Map<string, Map<string, TodoToolCall>>
>();

// Callbacks for notifying UI of updates
const updateCallbacks = new Map<string, Set<() => void>>();

/**
 * Service to track tool calls and associate them with active todos
 */
export class ToolCallTrackerService {
  /**
   * Records a tool call and associates it with the active todo if there is one
   */
  static async recordToolCall(
    sessionId: string,
    toolName: string,
    parameters: Record<string, unknown>,
  ): Promise<void> {
    // Don't record todo tools themselves
    if (toolName === 'todo_write' || toolName === 'todo_read') {
      return;
    }

    // Get the context tracker for this session
    const contextTracker = TodoContextTracker.forSession(sessionId);
    const activeTodoId = contextTracker.getActiveTodoId();

    // If there's no active todo, don't record the tool call
    if (!activeTodoId) {
      return;
    }

    // Create a tool call record
    const toolCall: TodoToolCall = {
      id: this.generateId(),
      name: toolName,
      parameters,
      timestamp: new Date(),
    };

    // Get the todo store for this session
    const store = new TodoStore(sessionId);

    // Read the current todos
    const todos = await store.readTodos();

    // If we couldn't read any todos, don't proceed
    // This prevents clearing the UI when there's a read error
    if (!todos || todos.length === 0) {
      return;
    }

    // Find the active todo and add the tool call to it
    let todoFound = false;
    const updatedTodos = todos.map((todo) => {
      if (todo.id === activeTodoId) {
        todoFound = true;
        // Add the tool call to the todo's toolCalls array
        const existingCalls = todo.toolCalls || [];
        return {
          ...todo,
          toolCalls: [...existingCalls, toolCall],
        };
      }
      return todo;
    });

    // If we didn't find the active todo, don't update anything
    if (!todoFound) {
      return;
    }

    // Write the updated todos back to the store
    await store.writeTodos(updatedTodos);

    // Emit todo update event so UI refreshes
    todoEvents.emitTodoUpdated({
      sessionId,
      todos: updatedTodos,
      timestamp: new Date(),
    });

    // Notify subscribers of the update
    this.notifySubscribers(sessionId);
  }

  /**
   * Starts tracking an executing tool call
   */
  static startTrackingToolCall(
    sessionId: string,
    toolName: string,
    parameters: Record<string, unknown>,
  ): string | null {
    console.log(
      `[DEBUG] ToolCallTrackerService.startTrackingToolCall called with:`,
      { sessionId, toolName, parameters },
    );

    // Don't track todo tools themselves
    if (toolName === 'todo_write' || toolName === 'todo_read') {
      console.log(`[DEBUG] Skipping tracking for todo tool: ${toolName}`);
      return null;
    }

    // Get the context tracker for this session
    const contextTracker = TodoContextTracker.forSession(sessionId);
    const activeTodoId = contextTracker.getActiveTodoId();
    console.log(`[DEBUG] Active todo ID: ${activeTodoId}`);

    // If there's no active todo, don't track the tool call
    if (!activeTodoId) {
      console.log(`[DEBUG] No active todo, skipping tool call tracking`);
      return null;
    }

    // Create a tool call record
    const toolCallId = this.generateId();
    const toolCall: TodoToolCall = {
      id: toolCallId,
      name: toolName,
      parameters,
      timestamp: new Date(),
    };

    // Ensure we have a map for this session
    if (!executingToolCalls.has(sessionId)) {
      executingToolCalls.set(sessionId, new Map());
    }

    const sessionCalls = executingToolCalls.get(sessionId)!;

    // Ensure we have a map for this todo
    if (!sessionCalls.has(activeTodoId)) {
      sessionCalls.set(activeTodoId, new Map());
    }

    const todoCalls = sessionCalls.get(activeTodoId)!;

    // Add the tool call to the map
    todoCalls.set(toolCallId, toolCall);
    console.log(`[DEBUG] Added tool call to tracking:`, toolCall);

    // Notify subscribers of the update
    this.notifySubscribers(sessionId);

    return toolCallId;
  }

  /**
   * Marks a tool call as completed and moves it to the todo's toolCalls array
   */
  static async completeToolCallTracking(
    sessionId: string,
    toolCallId: string,
  ): Promise<void> {
    // Get the tool call before removing it
    const contextTracker = TodoContextTracker.forSession(sessionId);
    const activeTodoId = contextTracker.getActiveTodoId();

    if (!activeTodoId) {
      this.updateToolCallStatus(sessionId, toolCallId);
      return;
    }

    const sessionCalls = executingToolCalls.get(sessionId);
    if (!sessionCalls) return;

    const todoCalls = sessionCalls.get(activeTodoId);
    if (!todoCalls) return;

    const toolCall = todoCalls.get(toolCallId);
    if (!toolCall) return;

    // Add to the todo's completed toolCalls
    await this.recordToolCall(sessionId, toolCall.name, toolCall.parameters);

    // Remove from executing
    this.updateToolCallStatus(sessionId, toolCallId);
  }

  /**
   * Marks a tool call as failed
   */
  static failToolCallTracking(sessionId: string, toolCallId: string): void {
    this.updateToolCallStatus(sessionId, toolCallId);
  }

  /**
   * Gets executing tool calls for a specific todo
   */
  static getExecutingToolCalls(
    sessionId: string,
    todoId: string,
  ): TodoToolCall[] {
    const sessionCalls = executingToolCalls.get(sessionId);
    if (!sessionCalls) {
      return [];
    }

    const todoCalls = sessionCalls.get(todoId);
    if (!todoCalls) {
      return [];
    }

    return Array.from(todoCalls.values());
  }

  /**
   * Subscribes to tool call updates
   */
  static subscribeToUpdates(
    sessionId: string,
    callback: () => void,
  ): () => void {
    if (!updateCallbacks.has(sessionId)) {
      updateCallbacks.set(sessionId, new Set());
    }

    const callbacks = updateCallbacks.get(sessionId)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        updateCallbacks.delete(sessionId);
      }
    };
  }

  /**
   * Gets all executing tool calls for testing and debugging purposes
   */
  static getAllExecutingToolCalls(
    sessionId: string,
  ): Map<string, Map<string, TodoToolCall>> {
    const sessionCalls = executingToolCalls.get(sessionId);
    if (!sessionCalls) {
      return new Map();
    }
    return new Map(sessionCalls);
  }

  /**
   * Clears all executing tool calls for a session (for testing purposes)
   */
  static clearExecutingToolCallsForSession(sessionId: string): void {
    executingToolCalls.delete(sessionId);
    updateCallbacks.delete(sessionId);
  }

  /**
   * Generates a unique ID for tool calls
   */
  private static generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Updates tool call status (removes from executing tracking)
   */
  private static updateToolCallStatus(
    sessionId: string,
    toolCallId: string,
  ): void {
    const contextTracker = TodoContextTracker.forSession(sessionId);
    const activeTodoId = contextTracker.getActiveTodoId();

    if (!activeTodoId) {
      return;
    }

    const sessionCalls = executingToolCalls.get(sessionId);
    if (!sessionCalls) {
      return;
    }

    const todoCalls = sessionCalls.get(activeTodoId);
    if (!todoCalls) {
      return;
    }

    // Remove the tool call from executing tracking
    todoCalls.delete(toolCallId);

    // Clean up empty maps
    if (todoCalls.size === 0) {
      sessionCalls.delete(activeTodoId);
    }

    if (sessionCalls.size === 0) {
      executingToolCalls.delete(sessionId);
    }

    // Notify subscribers of the update
    this.notifySubscribers(sessionId);
  }

  /**
   * Notifies all subscribers of updates
   */
  private static notifySubscribers(sessionId: string): void {
    const callbacks = updateCallbacks.get(sessionId);
    if (callbacks) {
      callbacks.forEach((callback) => callback());
    }
  }
}
