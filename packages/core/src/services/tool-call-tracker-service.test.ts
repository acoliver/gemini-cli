/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolCallTrackerService } from '../services/tool-call-tracker-service.js';
import { TodoContextTracker } from '../services/todo-context-tracker.js';
import { TodoStore } from '../tools/todo-store.js';

// Mock the file system
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...(actual as object),
    promises: {
      ...(actual as object as { promises: object }).promises,
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
    },
    existsSync: vi.fn(),
  };
});

// Mock the TodoStore
vi.mock('../tools/todo-store.js', () => ({
  TodoStore: vi.fn().mockImplementation(() => ({
    readTodos: vi.fn(),
    writeTodos: vi.fn(),
  })),
}));

describe('ToolCallTrackerService', () => {
  const sessionId = 'test-session';
  const todoId = 'test-todo';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clear any existing executing tool calls for this session
    ToolCallTrackerService.clearExecutingToolCallsForSession(sessionId);

    // Set up the context tracker
    const contextTracker = TodoContextTracker.forSession(sessionId);
    contextTracker.setActiveTodo(todoId);
  });

  afterEach(() => {
    // Clear the context tracker
    const contextTracker = TodoContextTracker.forSession(sessionId);
    contextTracker.clearActiveTodo();

    // Clear any executing tool calls for this session
    ToolCallTrackerService.clearExecutingToolCallsForSession(sessionId);
  });

  it('should record a tool call and associate it with the active todo', async () => {
    // Set up mock data
    const mockTodos = [
      {
        id: todoId,
        content: 'Test todo',
        status: 'in_progress',
        priority: 'medium',
        toolCalls: [],
      },
    ];

    const storeInstance = new TodoStore(sessionId);
    storeInstance.readTodos = vi.fn().mockResolvedValue(mockTodos);
    storeInstance.writeTodos = vi.fn().mockResolvedValue(undefined);

    // Mock TodoStore constructor to return our instance
    (TodoStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => storeInstance,
    );

    // Record a tool call
    await ToolCallTrackerService.recordToolCall(sessionId, 'test_tool', {
      param1: 'value1',
      param2: 42,
    });

    // Verify the store methods were called correctly
    expect(storeInstance.readTodos).toHaveBeenCalled();
    expect(storeInstance.writeTodos).toHaveBeenCalled();

    // Verify the updated todos contain the tool call
    const updatedTodos = (storeInstance.writeTodos as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(updatedTodos).toHaveLength(1);
    expect(updatedTodos[0].id).toBe(todoId);
    expect(updatedTodos[0].toolCalls).toHaveLength(1);
    expect(updatedTodos[0].toolCalls[0].name).toBe('test_tool');
    expect(updatedTodos[0].toolCalls[0].parameters).toEqual({
      param1: 'value1',
      param2: 42,
    });
  });

  it('should not record a tool call when there is no active todo', async () => {
    // Clear the active todo
    const contextTracker = TodoContextTracker.forSession(sessionId);
    contextTracker.setActiveTodo(null);

    // Set up mock
    const storeInstance = new TodoStore(sessionId);
    storeInstance.readTodos = vi.fn().mockResolvedValue([]);
    storeInstance.writeTodos = vi.fn().mockResolvedValue(undefined);

    // Mock TodoStore constructor to return our instance
    (TodoStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => storeInstance,
    );

    // Record a tool call
    await ToolCallTrackerService.recordToolCall(sessionId, 'test_tool', {
      param1: 'value1',
    });

    // Verify the store methods were not called
    expect(storeInstance.readTodos).not.toHaveBeenCalled();
    expect(storeInstance.writeTodos).not.toHaveBeenCalled();
  });

  it('should track executing tool calls', () => {
    // Start tracking a tool call
    const toolCallId = ToolCallTrackerService.startTrackingToolCall(
      sessionId,
      'executing_tool',
      { param: 'value' },
    );

    // Verify we got a tool call ID
    expect(toolCallId).toBeTruthy();

    // Get executing tool calls for the todo
    const executingCalls = ToolCallTrackerService.getExecutingToolCalls(
      sessionId,
      todoId,
    );

    // Verify we have one executing tool call
    expect(executingCalls).toHaveLength(1);
    expect(executingCalls[0].name).toBe('executing_tool');
    expect(executingCalls[0].parameters).toEqual({ param: 'value' });
  });

  it('should complete tracking of executing tool calls', async () => {
    // Start tracking a tool call
    const toolCallId = ToolCallTrackerService.startTrackingToolCall(
      sessionId,
      'completing_tool',
      { param: 'value' },
    );

    // Verify we have one executing tool call
    let executingCalls = ToolCallTrackerService.getExecutingToolCalls(
      sessionId,
      todoId,
    );
    expect(executingCalls).toHaveLength(1);

    // Complete the tool call tracking
    await ToolCallTrackerService.completeToolCallTracking(
      sessionId,
      toolCallId!,
    );

    // Verify the tool call is no longer executing
    executingCalls = ToolCallTrackerService.getExecutingToolCalls(
      sessionId,
      todoId,
    );
    expect(executingCalls).toHaveLength(0);
  });

  it('should fail tracking of executing tool calls', () => {
    // Start tracking a tool call
    const toolCallId = ToolCallTrackerService.startTrackingToolCall(
      sessionId,
      'failing_tool',
      { param: 'value' },
    );

    // Verify we have one executing tool call
    let executingCalls = ToolCallTrackerService.getExecutingToolCalls(
      sessionId,
      todoId,
    );
    expect(executingCalls).toHaveLength(1);

    // Fail the tool call tracking
    ToolCallTrackerService.failToolCallTracking(sessionId, toolCallId!);

    // Verify the tool call is no longer executing
    executingCalls = ToolCallTrackerService.getExecutingToolCalls(
      sessionId,
      todoId,
    );
    expect(executingCalls).toHaveLength(0);
  });
});
