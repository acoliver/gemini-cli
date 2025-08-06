/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import { TodoDisplay } from '../TodoDisplay.js';
import { TodoContext } from '../../contexts/TodoContext.js';
import { vi } from 'vitest';

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

const mockTodoContextValue = {
  todos: [],
  updateTodos: vi.fn().mockImplementation(() => {
    throw new Error('NotYetImplemented');
  }),
  refreshTodos: vi.fn().mockImplementation(() => {
    throw new Error('NotYetImplemented');
  }),
};

const renderWithContext = (todos: Todo[] = []) => {
  const contextValue = {
    ...mockTodoContextValue,
    todos,
  };
  
  return render(
    <TodoContext.Provider value={contextValue}>
      <TodoDisplay />
    </TodoContext.Provider>
  );
};

/**
 * @requirement REQ-009
 * @scenario Empty todo list
 * @given Empty array of todo items
 * @when TodoDisplay component is rendered
 * @then Returns appropriate message indicating empty list
 */
it('displays appropriate message for empty todo list', () => {
  const { lastFrame } = renderWithContext([]);
  expect(lastFrame()).toContain('Todo list is empty – use TodoWrite to add tasks.');
});

/**
 * @requirement REQ-001, REQ-002
 * @scenario Single task with no subtasks
 * @given Array with one todo item with no subtasks
 * @when TodoDisplay component is rendered
 * @then Returns formatted string with task in temporal order
 * @and Status marker is correctly applied
 */
it('renders single task with correct status marker', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Test task',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('- [ ] Test task');
});

/**
 * @requirement REQ-001
 * @scenario Multiple tasks in temporal order
 * @given Array of todo items with different statuses
 * @when TodoDisplay component is rendered
 * @then Returns formatted string with tasks in temporal order
 */
it('renders multiple tasks in temporal order', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'First task',
      status: 'pending',
      priority: 'high',
    },
    {
      id: 'task-2',
      content: 'Second task',
      status: 'in_progress',
      priority: 'medium',
    },
    {
      id: 'task-3',
      content: 'Third task',
      status: 'completed',
      priority: 'low',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  const output = lastFrame();
  expect(output).toContain('## Todo List (temporal order)');
  expect(output).toContain('- [ ] First task');
  expect(output).toContain('**- [→] Second task** ← current task');
  expect(output).toContain('- [x] Third task');
});

/**
 * @requirement REQ-002.1
 * @scenario Completed task marker
 * @given Array with one completed todo item
 * @when TodoDisplay component is rendered
 * @then Returns formatted string with completed task marker (- [x])
 */
it('shows correct marker for completed tasks (- [x])', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Completed task',
      status: 'completed',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('- [x] Completed task');
});

/**
 * @requirement REQ-002.2
 * @scenario Pending task marker
 * @given Array with one pending todo item
 * @when TodoDisplay component is rendered
 * @then Returns formatted string with pending task marker (- [ ])
 */
it('shows correct marker for pending tasks (- [ ])', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Pending task',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('- [ ] Pending task');
});

/**
 * @requirement REQ-002.3
 * @scenario In-progress task marker
 * @given Array with one in_progress todo item
 * @when TodoDisplay component is rendered
 * @then Returns formatted string with in-progress task marker (- [→])
 */
it('shows correct marker for in-progress tasks (- [→])', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'In-progress task',
      status: 'in_progress',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('**- [→] In-progress task** ← current task');
});

/**
 * @requirement REQ-003.1
 * @scenario Current task bolding
 * @given Array with one in_progress todo item
 * @when TodoDisplay component is rendered
 * @then Current task text is bolded
 */
it('bolds current task text', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Current task',
      status: 'in_progress',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('**- [→] Current task** ← current task');
});

/**
 * @requirement REQ-003.2
 * @scenario Current task indicator
 * @given Array with one in_progress todo item
 * @when TodoDisplay component is rendered
 * @then Current task has "← current task" indicator
 */
it('shows "← current task" indicator for current task', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Current task',
      status: 'in_progress',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('**- [→] Current task** ← current task');
});

/**
 * @requirement REQ-003.1
 * @scenario Non-current task unbolded
 * @given Array with one pending todo item
 * @when TodoDisplay component is rendered
 * @then Non-current task text is not bolded
 */
it('does not bold non-current task text', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Non-current task',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  // Should not contain bolding (**)
  expect(lastFrame()).toContain('- [ ] Non-current task');
  expect(lastFrame()).not.toContain('**- [ ] Non-current task**');
});

/**
 * @requirement REQ-004
 * @scenario Task with subtasks
 * @given Array with one todo item that has subtasks
 * @when TodoDisplay component is rendered
 * @then Subtasks render indented with • marker
 */
it('renders subtasks indented with • marker', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Main task',
      status: 'pending',
      priority: 'high',
      subtasks: [
        {
          id: 'subtask-1',
          content: 'First subtask',
        },
      ],
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  const output = lastFrame();
  expect(output).toContain('- [ ] Main task');
  expect(output).toContain('    • First subtask');
});

/**
 * @requirement REQ-004
 * @scenario Task without subtasks
 * @given Array with one todo item that has no subtasks
 * @when TodoDisplay component is rendered
 * @then Task renders without extra indentation
 */
it('renders tasks without subtasks without extra indentation', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Task without subtasks',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  // Should not contain subtask indentation (    •)
  expect(lastFrame()).toContain('- [ ] Task without subtasks');
  expect(lastFrame()).not.toContain('    •');
});

/**
 * @requirement REQ-004
 * @scenario Multiple subtasks
 * @given Array with one todo item that has multiple subtasks
 * @when TodoDisplay component is rendered
 * @then All subtasks render correctly with proper indentation
 */
it('renders multiple subtasks correctly', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Main task',
      status: 'pending',
      priority: 'high',
      subtasks: [
        {
          id: 'subtask-1',
          content: 'First subtask',
        },
        {
          id: 'subtask-2',
          content: 'Second subtask',
        },
      ],
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  const output = lastFrame();
  expect(output).toContain('- [ ] Main task');
  expect(output).toContain('    • First subtask');
  expect(output).toContain('    • Second subtask');
});

/**
 * @requirement REQ-005
 * @scenario Subtask with tool calls
 * @given Array with one todo item that has a subtask with tool calls
 * @when TodoDisplay component is rendered
 * @then Tool calls render indented with ↳ marker
 */
it('renders tool calls indented with ↳ marker', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Main task',
      status: 'pending',
      priority: 'high',
      subtasks: [
        {
          id: 'subtask-1',
          content: 'Subtask with tool call',
          toolCalls: [
            {
              id: 'tool-1',
              name: 'runShellCommand',
              parameters: {
                command: 'ls -la',
              },
            },
          ],
        },
      ],
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  const output = lastFrame();
  expect(output).toContain('- [ ] Main task');
  expect(output).toContain('    • Subtask with tool call');
  expect(output).toContain("        ↳ runShellCommand(command: 'ls -la')");
});

/**
 * @requirement REQ-005
 * @scenario Subtask without tool calls
 * @given Array with one todo item that has a subtask without tool calls
 * @when TodoDisplay component is rendered
 * @then Subtask renders without tool call indentation
 */
it('renders subtasks without tool calls without tool call indentation', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Main task',
      status: 'pending',
      priority: 'high',
      subtasks: [
        {
          id: 'subtask-1',
          content: 'Subtask without tool calls',
        },
      ],
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  const output = lastFrame();
  expect(output).toContain('- [ ] Main task');
  expect(output).toContain('    • Subtask without tool calls');
  // Should not contain tool call indentation (        ↳)
  expect(output).not.toContain('        ↳');
});

/**
 * @requirement REQ-005
 * @scenario Tool call parameter formatting
 * @given Array with one todo item that has a subtask with tool call parameters
 * @when TodoDisplay component is rendered
 * @then Tool call parameters are formatted correctly
 */
it('formats tool call parameters correctly', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Main task',
      status: 'pending',
      priority: 'high',
      subtasks: [
        {
          id: 'subtask-1',
          content: 'Subtask with complex parameters',
          toolCalls: [
            {
              id: 'tool-1',
              name: 'editFile',
              parameters: {
                filePath: '/path/to/file.ts',
                content: 'console.log("Hello World");',
              },
            },
          ],
        },
      ],
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  const output = lastFrame();
  expect(output).toContain('- [ ] Main task');
  expect(output).toContain('    • Subtask with complex parameters');
  expect(output).toContain("        ↳ editFile(filePath: '/path/to/file.ts', content: 'console.log(\"Hello World\");')");
});

/**
 * @requirement REQ-025
 * @scenario Very long task content
 * @given Array with one todo item that has very long content
 * @when TodoDisplay component is rendered
 * @then Content handles appropriately (no crash or truncation issues)
 */
it('handles very long task content appropriately', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'A'.repeat(1000), // Very long content
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  // Should contain the beginning of the long content
  expect(lastFrame()).toContain('- [ ]\nA');
});

/**
 * @requirement REQ-023
 * @scenario Special characters in content
 * @given Array with todo item that has special characters
 * @when TodoDisplay component is rendered
 * @then Content renders correctly with special characters
 */
it('renders tasks with special characters correctly', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Task with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('- [ ] Task with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?');
});

/**
 * @requirement REQ-022
 * @scenario Malformed data handling
 * @given Array with malformed todo data
 * @when TodoDisplay component is rendered
 * @then Data is handled gracefully without crashing
 */
it('handles malformed data gracefully', () => {
  const todos = [
    {
      id: 'task-1',
    },
  ] as unknown as Todo[];
  const { lastFrame } = renderWithContext(todos);
  // Should not crash and render something meaningful
  expect(lastFrame()).toBeDefined();
});

/**
 * @requirement REQ-011
 * @scenario TodoContext integration
 * @given TodoContext with todo data
 * @when TodoDisplay component is rendered
 * @then Component integrates correctly with TodoContext
 */
it('integrates with TodoContext', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Context integration test',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame } = renderWithContext(todos);
  expect(lastFrame()).toContain('- [ ] Context integration test');
});

/**
 * @requirement REQ-008
 * @scenario Context updates
 * @given TodoContext with updating todo data
 * @when TodoDisplay component is rendered and context updates
 * @then Component re-renders with updated data
 */
it('re-renders when context updates', () => {
  const todos: Todo[] = [
    {
      id: 'task-1',
      content: 'Re-render test',
      status: 'pending',
      priority: 'high',
    },
  ];
  const { lastFrame, rerender } = renderWithContext(todos);
  
  const contextValue = {
    ...mockTodoContextValue,
    todos: [
      {
        id: 'task-2',
        content: 'Updated task',
        status: 'in_progress',
        priority: 'high',
      },
    ],
  };
  
  rerender(
    <TodoContext.Provider value={contextValue}>
      <TodoDisplay />
    </TodoContext.Provider>
  );
  
  expect(lastFrame()).toContain('**- [→] Updated task** ← current task');
});