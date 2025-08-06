/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const TodoStatus = z.enum(['pending', 'in_progress', 'completed']);
export const TodoPriority = z.enum(['high', 'medium', 'low']);

export const TodoToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  parameters: z.record(z.any()),
});

export const SubtaskSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  toolCalls: z.array(TodoToolCallSchema).optional(),
});

export const TodoSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  status: TodoStatus,
  priority: TodoPriority,
  subtasks: z.array(SubtaskSchema).optional(),
});

export const TodoArraySchema = z.array(TodoSchema);

export type TodoToolCall = z.infer<typeof TodoToolCallSchema>;
export type Subtask = z.infer<typeof SubtaskSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type TodoStatus = z.infer<typeof TodoStatus>;
export type TodoPriority = z.infer<typeof TodoPriority>;
