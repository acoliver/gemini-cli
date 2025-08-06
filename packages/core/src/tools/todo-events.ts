/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import { ExtendedTodo } from './todo-schemas.js';

export interface TodoUpdateEvent {
  sessionId: string;
  agentId?: string;
  todos: ExtendedTodo[];
  timestamp: Date;
}

export enum TodoEvent {
  TODO_UPDATED = 'todo-updated',
}

export class TodoEventEmitter extends EventEmitter {
  emitTodoUpdated(event: TodoUpdateEvent): boolean {
    return this.emit(TodoEvent.TODO_UPDATED, event);
  }

  onTodoUpdated(listener: (event: TodoUpdateEvent) => void): this {
    return this.on(TodoEvent.TODO_UPDATED, listener);
  }

  offTodoUpdated(listener: (event: TodoUpdateEvent) => void): this {
    return this.off(TodoEvent.TODO_UPDATED, listener);
  }
}

// Create a singleton instance
export const todoEvents = new TodoEventEmitter();
