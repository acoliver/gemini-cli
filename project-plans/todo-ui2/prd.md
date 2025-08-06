# Feature Specification: Todo UI Enhancement Remediation

## Purpose

Remediate the non-functional Todo UI Enhancement by integrating the existing TodoDisplay component into the application and implementing the missing state management and data flow mechanisms. This will deliver the promised hierarchical visualization of tasks, subtasks, and tool calls to users in interactive mode.

## Architectural Decisions

- **Pattern**: Component-based architecture with React/Ink for UI rendering
- **Technology Stack**: TypeScript, React, Ink, Zod for schema validation
- **Data Flow**: Unidirectional data flow from tools to UI component through React state/context
- **Integration Points**: 
  - Existing TodoWrite and TodoRead tools in `packages/core/src/tools/`
  - CLI application in `packages/cli/src/`
  - TodoStore for persistence in `packages/core/src/tools/todo-store.ts`

## Project Structure

```
packages/
  cli/
    src/
      ui/
        components/
          TodoDisplay.tsx        # Existing UI component
        contexts/
          TodoContext.tsx        # Existing context definition
          TodoProvider.tsx       # NEW provider implementation
        App.tsx                  # Modified for integration
  core/
    src/
      tools/
        todo-write.ts            # Modified to emit events
        todo-read.ts             # Existing functionality
        todo-store.ts            # Existing functionality
        todo-schemas.ts          # Existing extended schemas
```

## Technical Environment
- **Type**: CLI Tool
- **Runtime**: Node.js 20.x
- **Dependencies**: 
  - React 18.x
  - Ink 4.x
  - Zod 3.x
  - Existing project dependencies

## Formal Requirements

[REQ-001] The system shall display TODO tasks in temporal order matching their stored sequence.
  [REQ-001.1] Tasks must be rendered in the exact order they appear in the stored todo array.

[REQ-002] The system shall use ASCII-only status markers for tasks.
  [REQ-002.1] Render `- [x]` for completed tasks
  [REQ-002.2] Render `- [ ]` for pending tasks
  [REQ-002.3] Render `- [→]` for the current task

[REQ-003] The system shall highlight the current task by bolding its text and adding a "← current task" indicator.
  [REQ-003.1] Current task must be bolded
  [REQ-003.2] Current task must have trailing note "← current task"

[REQ-004] The system shall display subtasks indented with a bullet character (`•`).
  [REQ-004.1] Subtasks must be indented under their parent tasks
  [REQ-004.2] Subtasks must be prefixed with `•`

[REQ-005] The system shall display tool calls nested under their respective subtasks with a right arrow character (`↳`).
  [REQ-005.1] Tool calls must be indented under their parent subtasks
  [REQ-005.2] Tool calls must be prefixed with `↳`

[REQ-006] The system shall redraw the entire TODO display on each update rather than appending new content.
  [REQ-006.1] Entire display must be replaced on updates
  [REQ-006.2] No appending of content to previous display

[REQ-007] The system shall use only ASCII characters in the display, with no emoji or special symbols.
  [REQ-007.1] Only ASCII characters allowed in UI display

[REQ-008] The system shall update the TODO display automatically whenever the TodoWrite tool is executed in interactive mode.
  [REQ-008.1] UI must automatically refresh after TodoWrite execution
  [REQ-008.2] No manual refresh required

[REQ-009] The system shall display an appropriate message when the TODO list is empty.
  [REQ-009.1] Show message when todo list is empty

[REQ-010] The system shall create a TodoDisplay React component at `packages/cli/src/ui/components/TodoDisplay.tsx`.
  [REQ-010.1] Component must be created at specified location

[REQ-011] The system shall implement React state or context management for TODO data that triggers component re-renders.
  [REQ-011.1] Use React hooks or context for state management
  [REQ-011.2] State updates must trigger component re-renders

[REQ-012] The TodoWrite tool shall suppress Markdown output in interactive mode, returning only a minimal ToolResult.
  [REQ-012.1] Suppress Markdown output in interactive mode
  [REQ-012.2] Return minimal ToolResult in interactive mode

[REQ-013] The system shall associate tool calls with their respective subtasks in the data structure.
  [REQ-013.1] Tool calls must be stored with subtasks in data structure

[REQ-014] The TodoDisplay component shall be integrated into the main app layout.
  [REQ-014.1] Component must be integrated into app layout

[REQ-015] The system shall provide simplified output in non-interactive mode focused on essential information.
  [REQ-015.1] Simplified Markdown output in non-interactive mode

[REQ-016] The system shall continue returning Markdown format in non-interactive mode but in a simplified structure.
  [REQ-016.1] Continue Markdown output in non-interactive mode
  [REQ-016.2] Simplified structure in non-interactive mode

## Data Schemas

```typescript
// Extended Todo entity
interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  subtasks?: Subtask[];  // Optional array of subtasks
}

// Subtask entity
interface Subtask {
  id: string;
  content: string;
  toolCalls?: ToolCall[];  // Optional array of associated tool calls
}

// ToolCall entity
interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
}

// TodoWrite parameters
interface TodoWriteParams {
  todos: Todo[];
}

// TodoRead parameters (empty for now)
type TodoReadParams = Record<string, never>;
```

## Example Data

```json
{
  "sampleTodoList": [
    {
      "id": "task-1",
      "content": "Implement role-based access control",
      "status": "in_progress",
      "priority": "high",
      "subtasks": [
        {
          "id": "subtask-1",
          "content": "Define role enum",
          "toolCalls": [
            {
              "id": "tool-1",
              "name": "runShellCommand",
              "parameters": {
                "command": "git add src/roles.ts"
              }
            },
            {
              "id": "tool-2",
              "name": "editFile",
              "parameters": {
                "filePath": "src/roles.ts"
              }
            }
          ]
        },
        {
          "id": "subtask-2",
          "content": "Guard API endpoints",
          "toolCalls": [
            {
              "id": "tool-3",
              "name": "writeFile",
              "parameters": {
                "filePath": "src/middleware/acl.ts"
              }
            },
            {
              "id": "tool-4",
              "name": "runShellCommand",
              "parameters": {
                "command": "npm run lint"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "task-2",
      "content": "Document security model",
      "status": "pending",
      "priority": "medium",
      "subtasks": [
        {
          "id": "subtask-3",
          "content": "Draft markdown page"
        },
        {
          "id": "subtask-4",
          "content": "Add examples"
        }
      ]
    }
  ],
  "emptyTodoList": []
}
```

## Constraints

- No external HTTP calls in unit tests
- All async operations must have timeouts
- UI component must not exceed terminal width
- Performance updates must complete within 100ms for lists with up to 50 tasks
- Maintain compatibility with existing TodoStore for data persistence

## Performance Requirements

- Todo display updates: <100ms for lists with up to 50 tasks
- Memory usage: <10MB for todo list data
- Terminal compatibility: Works in standard 80x24 terminal