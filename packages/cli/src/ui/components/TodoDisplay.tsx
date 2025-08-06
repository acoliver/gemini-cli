/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTodoContext } from '../contexts/TodoContext.js';

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

const formatParameters = (parameters: Record<string, unknown>): string => {
  const paramStrings: string[] = [];
  
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string') {
      paramStrings.push(`${key}: '${value}'`);
    } else {
      paramStrings.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  
  return paramStrings.join(', ');
};

const renderTodo = (todo: Todo): string => {
  let marker = '';
  if (todo.status === 'completed') {
    marker = '- [x]';
  } else if (todo.status === 'pending') {
    marker = '- [ ]';
  } else if (todo.status === 'in_progress') {
    marker = '- [→]';
  }
  
  let taskLine = `${marker} ${todo.content}`;
  
  if (todo.status === 'in_progress') {
    taskLine = `**${taskLine}** ← current task`;
  }
  
  let result = taskLine;
  
  if (todo.subtasks && todo.subtasks.length > 0) {
    for (const subtask of todo.subtasks) {
      result += `\n    • ${subtask.content}`;
      
      if (subtask.toolCalls && subtask.toolCalls.length > 0) {
        for (const toolCall of subtask.toolCalls) {
          result += `\n        ↳ ${toolCall.name}(${formatParameters(toolCall.parameters)})`;
        }
      }
    }
  }
  
  return result;
};

export const TodoDisplay: React.FC = () => {
  const { todos } = useTodoContext();
  
  if (todos.length === 0) {
    return (
      <Box>
        <Text>Todo list is empty – use TodoWrite to add tasks.</Text>
      </Box>
    );
  }
  
  let display = '## Todo List (temporal order)\n\n';
  
  for (const todo of todos) {
    display += renderTodo(todo);
    display += '\n';
  }
  
  return (
    <Box>
      <Text>{display}</Text>
    </Box>
  );
};