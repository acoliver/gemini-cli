/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Todo } from '@vybestack/llxprt-code-core';

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

export const TodoContext =
  React.createContext<TodoContextType>(defaultContextValue);

export const useTodoContext = () => React.useContext(TodoContext);
