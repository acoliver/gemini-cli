/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  subtasks?: Subtask[];
}

interface Subtask {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

interface TodoContextType {
  todos: Todo[];
  updateTodos: (todos: Todo[]) => void;
  refreshTodos: () => void;
}

const defaultContextValue: TodoContextType = {
  todos: [],
  updateTodos: () => {
    throw new Error('NotYetImplemented');
  },
  refreshTodos: () => {
    throw new Error('NotYetImplemented');
  },
};

export const TodoContext = React.createContext<TodoContextType>(defaultContextValue);

export const useTodoContext = () => React.useContext(TodoContext);