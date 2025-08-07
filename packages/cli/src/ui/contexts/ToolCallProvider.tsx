/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { ToolCallContextType, ToolCallContext } from './ToolCallContext.js';
import {
  ToolCallTrackerService,
  TodoToolCall,
} from '@vybestack/llxprt-code-core';

interface ToolCallProviderProps {
  children: React.ReactNode;
  sessionId: string;
}

export const ToolCallProvider: React.FC<ToolCallProviderProps> = ({
  children,
  sessionId,
}) => {
  // Store executing tool calls in state to trigger re-renders
  const [executingToolCalls, setExecutingToolCalls] = useState<
    Map<string, TodoToolCall[]>
  >(new Map());

  // Track if we've already subscribed to avoid duplicate subscriptions
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get executing tool calls for a specific todo
  const getExecutingToolCalls = useCallback(
    (todoId: string): TodoToolCall[] => executingToolCalls.get(todoId) || [],
    [executingToolCalls],
  );

  // Update the state with current executing tool calls
  const updateExecutingToolCalls = useCallback(() => {
    // Get all executing tool calls for this session
    const allCalls = ToolCallTrackerService.getAllExecutingToolCalls(sessionId);

    // Convert to the format we want for state
    const newExecutingToolCalls = new Map<string, TodoToolCall[]>();
    for (const [todoId, todoCalls] of allCalls) {
      newExecutingToolCalls.set(todoId, Array.from(todoCalls.values()));
    }

    setExecutingToolCalls(newExecutingToolCalls);
  }, [sessionId]);

  // Set up subscription to tool call updates
  useEffect(() => {
    // Unsubscribe from previous subscription if it exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Subscribe to updates
    const unsubscribe = ToolCallTrackerService.subscribeToUpdates(
      sessionId,
      updateExecutingToolCalls,
    );
    unsubscribeRef.current = unsubscribe;

    // Do an initial update to get current state
    updateExecutingToolCalls();

    // Clean up subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [sessionId, updateExecutingToolCalls]);

  const contextValue = useMemo<ToolCallContextType>(
    () => ({
      getExecutingToolCalls,
      subscribe: (callback: () => void) => {
        const unsubscribe = ToolCallTrackerService.subscribeToUpdates(
          sessionId,
          () => {
            updateExecutingToolCalls();
            callback();
          },
        );
        return unsubscribe;
      },
    }),
    [getExecutingToolCalls, sessionId, updateExecutingToolCalls],
  );

  return (
    <ToolCallContext.Provider value={contextValue}>
      {children}
    </ToolCallContext.Provider>
  );
};
