/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TodoToolCall } from '@vybestack/llxprt-code-core';

export interface ToolCallContextType {
  /**
   * Get executing tool calls for a specific todo
   */
  getExecutingToolCalls: (todoId: string) => TodoToolCall[];

  /**
   * Subscribe to tool call updates
   */
  subscribe: (callback: () => void) => () => void;
}

const defaultContextValue: ToolCallContextType = {
  getExecutingToolCalls: () => [],
  subscribe: () => () => {},
};

export const ToolCallContext =
  React.createContext<ToolCallContextType>(defaultContextValue);

export const useToolCallContext = () => React.useContext(ToolCallContext);
