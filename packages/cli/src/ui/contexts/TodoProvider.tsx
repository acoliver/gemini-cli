import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TodoStore,
  Todo,
  todoEvents,
  type TodoUpdateEvent,
} from '@vybestack/llxprt-code-core';
import { TodoContext } from './TodoContext.js';

interface TodoProviderProps {
  children: React.ReactNode;
  sessionId: string;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({
  children,
  sessionId = 'default',
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTodos = useCallback(async () => {
    try {
      setLoading(true);
      const store = new TodoStore(sessionId);
      const todos = await store.readTodos();
      setTodos(todos);
      setError(null);
    } catch (err) {
      setError(
        `Failed to load todos: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load initial data
  useEffect(() => {
    refreshTodos();
  }, [refreshTodos]);

  // Listen for todo updates
  useEffect(() => {
    const handleTodoUpdate = (eventData: TodoUpdateEvent) => {
      console.log(
        `[TODO PROVIDER DEBUG] Received todo update event for session ${eventData.sessionId}`,
      );
      // Verify this update is for our session
      if (eventData.sessionId === sessionId) {
        console.log(
          `[TODO PROVIDER DEBUG] Event is for our session, using todos from event`,
        );
        // Use the todos from the event instead of re-reading from file
        // This avoids race conditions with file I/O
        setTodos(eventData.todos);
        setError(null);
      }
    };

    todoEvents.onTodoUpdated(handleTodoUpdate);

    return () => {
      todoEvents.offTodoUpdated(handleTodoUpdate);
    };
  }, [sessionId]);

  const updateTodos = useCallback(
    (newTodos: Todo[]) => {
      setTodos(newTodos);
      // Persist to store
      const store = new TodoStore(sessionId);
      store.writeTodos(newTodos).catch((err) => {
        setError(
          `Failed to save todos: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      });
    },
    [sessionId],
  );

  const contextValue = useMemo(
    () => ({
      todos,
      updateTodos,
      refreshTodos,
      loading,
      error,
    }),
    [todos, updateTodos, refreshTodos, loading, error],
  );

  return (
    <TodoContext.Provider value={contextValue}>{children}</TodoContext.Provider>
  );
};
