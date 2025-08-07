/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useTodoContext } from '../contexts/TodoContext.js';
import { useToolCallContext } from '../contexts/ToolCallContext.js';
import { Colors } from '../colors.js';
import {
  Todo as CoreTodo,
  Subtask,
  TodoToolCall,
} from '@vybestack/llxprt-code-core';

interface Todo extends CoreTodo {
  subtasks?: Subtask[];
  toolCalls?: TodoToolCall[];
}

interface TodoPanelProps {
  width: number;
}

const formatParameters = (parameters: Record<string, unknown>): string => {
  const paramStrings: string[] = [];

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string') {
      // Truncate long strings
      const displayValue =
        value.length > 20 ? value.substring(0, 17) + '...' : value;
      paramStrings.push(`${key}: '${displayValue}'`);
    } else {
      const jsonStr = JSON.stringify(value);
      const displayValue =
        jsonStr.length > 20 ? jsonStr.substring(0, 17) + '...' : jsonStr;
      paramStrings.push(`${key}: ${displayValue}`);
    }
  }

  return paramStrings.join(', ');
};

// Group consecutive identical tool calls
interface GroupedToolCall {
  toolCall: TodoToolCall;
  count: number;
}

const groupConsecutiveToolCalls = (
  toolCalls: TodoToolCall[],
): GroupedToolCall[] => {
  if (toolCalls.length === 0) return [];

  const grouped: GroupedToolCall[] = [];
  let currentGroup: GroupedToolCall = {
    toolCall: toolCalls[0],
    count: 1,
  };

  for (let i = 1; i < toolCalls.length; i++) {
    const current = toolCalls[i];
    const prev = currentGroup.toolCall;

    // Check if this is the same tool call as the previous one
    if (
      current.name === prev.name &&
      JSON.stringify(current.parameters) === JSON.stringify(prev.parameters)
    ) {
      // Increment count for consecutive identical call
      currentGroup.count++;
    } else {
      // Different call, save the current group and start a new one
      grouped.push(currentGroup);
      currentGroup = {
        toolCall: current,
        count: 1,
      };
    }
  }

  // Don't forget the last group
  grouped.push(currentGroup);

  return grouped;
};

const renderToolCall = (
  toolCall: TodoToolCall,
  count: number = 1,
  indent: string = '    ',
  index: number = 0,
): React.ReactElement => {
  const params = formatParameters(toolCall.parameters);
  const toolText = `${toolCall.name}(${params})`;
  const countText = count > 1 ? ` ${count}x` : '';

  return (
    <Box
      key={`${toolCall.id || `${toolCall.name}-${index}`}`}
      flexDirection="row"
      minHeight={1}
    >
      <Text color={Colors.Gray}>
        {indent}↳ {toolText}
        {countText}
      </Text>
    </Box>
  );
};

const renderTodo = (
  todo: Todo,
  executingToolCalls: TodoToolCall[],
): React.ReactElement[] => {
  const elements: React.ReactElement[] = [];

  // Todo status marker and content
  let marker = '';
  let markerColor = Colors.Foreground;

  if (todo.status === 'completed') {
    marker = '✔';
    markerColor = Colors.AccentGreen;
  } else if (todo.status === 'pending') {
    marker = '○';
    markerColor = Colors.Gray;
  } else if (todo.status === 'in_progress') {
    marker = '→';
    markerColor = Colors.AccentYellow;
  }

  // Main todo line
  elements.push(
    <Box key={todo.id} flexDirection="row" minHeight={1}>
      <Text color={markerColor} bold>
        {marker}{' '}
      </Text>
      <Box flexGrow={1}>
        <Text
          color={
            todo.status === 'in_progress'
              ? Colors.AccentYellow
              : Colors.Foreground
          }
          bold={todo.status === 'in_progress'}
          wrap="wrap"
        >
          {todo.content}
          {todo.status === 'in_progress' && (
            <Text color={Colors.AccentYellow}> ← current</Text>
          )}
        </Text>
      </Box>
    </Box>,
  );

  // Render subtasks and their tool calls
  if (todo.subtasks && todo.subtasks.length > 0) {
    for (const subtask of todo.subtasks) {
      elements.push(
        <Box key={`${todo.id}-subtask-${subtask.content}`}>
          <Text color={Colors.Gray}> • {subtask.content}</Text>
        </Box>,
      );

      if (subtask.toolCalls && subtask.toolCalls.length > 0) {
        const grouped = groupConsecutiveToolCalls(subtask.toolCalls);
        grouped.forEach((group, index) => {
          elements.push(
            renderToolCall(group.toolCall, group.count, '      ', index),
          );
        });
      }
    }
  }

  // Combine completed and executing tool calls, then group them
  const allToolCalls = [...(todo.toolCalls || []), ...executingToolCalls];

  if (allToolCalls.length > 0) {
    const grouped = groupConsecutiveToolCalls(allToolCalls);
    grouped.forEach((group, index) => {
      elements.push(renderToolCall(group.toolCall, group.count, '  ', index));
    });
  }

  return elements;
};

const TodoPanelComponent: React.FC<TodoPanelProps> = ({ width }) => {
  const { todos } = useTodoContext();
  const { getExecutingToolCalls, subscribe } = useToolCallContext();
  const [, forceUpdate] = useState({});
  const [todoCount, setTodoCount] = useState(0);

  // Force re-render when todos change
  useEffect(() => {
    if (todos.length !== todoCount) {
      setTodoCount(todos.length);
      forceUpdate({});
    }
  }, [todos, todoCount]);

  // Subscribe to tool call updates to re-render when they change
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, [subscribe]);

  if (todos.length === 0) {
    return null; // Auto-hide when no todos exist
  }

  const allElements: React.ReactElement[] = [];

  // Add header
  allElements.push(
    <Box key="header" minHeight={1} marginBottom={1}>
      <Text color={Colors.AccentBlue} bold>
        Todo Progress
      </Text>
    </Box>,
  );

  // Add todos
  for (const todo of todos) {
    const executingToolCalls = getExecutingToolCalls(todo.id);
    const todoElements = renderTodo(todo, executingToolCalls);
    allElements.push(...todoElements);

    // Add spacing between todos
    allElements.push(<Box key={`${todo.id}-spacer`} height={1} />);
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={Colors.AccentBlue}
      paddingX={1}
      paddingY={1}
    >
      {allElements}
    </Box>
  );
};

// Export without memo to ensure updates when context changes
export const TodoPanel = TodoPanelComponent;
