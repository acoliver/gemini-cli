# Todo Tool Enhancement - Technical Design

## Overview

This document outlines the technical approach for implementing automatic tool call tracking and subordinate display in the todo system.

## Design Goals

1. Automatically associate tool calls with active todo items
2. Suppress normal tool call rendering when in todo mode
3. Display tool calls subordinate to their associated todos
4. Maintain backward compatibility with existing todo functionality
5. Provide configuration options for the new behavior

## Implementation Approach

### 1. Tool Context Tracking

We need a mechanism to track which todo is currently active and associate tool calls with it.

```typescript
// New service to track active todo context
class TodoContextTracker {
  private static activeTodoId: string | null = null;
  private static sessionId: string | null = null;
  
  static setActiveTodo(sessionId: string, todoId: string | null) {
    this.sessionId = sessionId;
    this.activeTodoId = todoId;
  }
  
  static getActiveTodo(): { sessionId: string; todoId: string } | null {
    if (!this.sessionId || !this.activeTodoId) return null;
    return { sessionId: this.sessionId, todoId: this.activeTodoId };
  }
  
  static clearActiveTodo() {
    this.activeTodoId = null;
  }
}
```

### 2. TodoWrite Enhancement

Modify the `TodoWrite` tool to update the active context:

```typescript
// In TodoWrite.execute()
const inProgressTodo = params.todos.find(t => t.status === 'in_progress');
if (inProgressTodo) {
  TodoContextTracker.setActiveTodo(sessionId, inProgressTodo.id);
} else {
  TodoContextTracker.clearActiveTodo();
}
```

### 3. Tool Call Interception

Intercept tool calls in the execution pipeline:

```typescript
// In tool execution middleware (likely coreToolScheduler)
// Before executing a tool:
const activeContext = TodoContextTracker.getActiveTodo();
if (activeContext && activeContext.sessionId === sessionId) {
  // Record this tool call with the active todo
  const store = new TodoStore(sessionId);
  const todos = await store.readTodos();
  
  const updatedTodos = todos.map(todo => {
    if (todo.id === activeContext.todoId) {
      // Add tool call to the todo's metadata or a special field
      return {
        ...todo,
        toolCalls: [
          ...(todo.toolCalls || []),
          {
            id: generateId(),
            name: tool.name,
            parameters: toolParams,
            timestamp: new Date()
          }
        ]
      };
    }
    return todo;
  });
  
  await store.writeTodos(updatedTodos);
}
```

### 4. Data Schema Enhancement

Modify the todo schema to include direct tool call support:

```typescript
// Extend the existing schema
export const TodoSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  status: TodoStatus,
  priority: TodoPriority,
  toolCalls: z.array(TodoToolCallSchema).optional(), // Add this field
});
```

### 5. UI Display Enhancement

Update `TodoDisplay.tsx` to render tool calls:

```typescript
// In TodoDisplay.tsx
const renderTodo = (todo: Todo): string => {
  // ... existing rendering code ...
  
  // Add tool call rendering
  if (todo.toolCalls && todo.toolCalls.length > 0) {
    for (const toolCall of todo.toolCalls) {
      result += `\n    ↳ ${toolCall.name}(${formatParameters(toolCall.parameters)})`;
    }
  }
  
  return result;
};
```

### 6. Tool Call Rendering Suppression

Add a mechanism to suppress normal tool call rendering:

```typescript
// In tool result rendering
const suppressToolCallRender = getSetting('suppressToolCallRenderInTodoMode', false);
if (suppressToolCallRender && TodoContextTracker.getActiveTodo()) {
  // Skip normal rendering in favor of todo-integrated display
  return;
}
```

## Component Modifications

### Core Components
1. `TodoWrite`: Set active todo context
2. `coreToolScheduler`: Track and store tool calls
3. `TodoStore`: Handle extended schema with tool calls
4. `TodoDisplay`: Render tool calls subordinate to todos
5. `TodoContextTracker`: New service for tracking active todo

### New Components
1. `TodoContextTracker`: Service to track which todo is active

## Data Flow

1. User marks a todo as "in_progress" via `TodoWrite`
2. `TodoWrite` updates the `TodoContextTracker` with the active todo ID
3. When a tool is called, the execution pipeline checks `TodoContextTracker`
4. If there's an active todo, the tool call is stored with that todo
5. `TodoStore` persists the updated todo with its associated tool calls
6. UI components (`TodoDisplay`) render the todo with its subordinate tool calls
7. Normal tool call rendering is suppressed to avoid duplication

## Configuration

Add new settings:
- `suppressToolCallRenderInTodoMode`: Boolean, default false
- `autoAssociateToolCallsWithTodos`: Boolean, default true

## Backward Compatibility

- Existing todo functionality remains unchanged when new features are disabled
- Todos without tool calls continue to work as before
- The schema extension is optional and backward compatible

## Testing Considerations

1. Tool call association with active todos
2. UI rendering of todos with tool calls
3. Suppression of normal tool call rendering
4. Persistence of tool call data
5. Edge cases (multiple sessions, clearing active todo, etc.)
6. Performance impact of tracking and storing tool calls