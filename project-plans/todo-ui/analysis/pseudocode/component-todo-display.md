# TodoDisplay Component Pseudocode

## Component Structure

```
Component: TodoDisplay [REQ-010]
Props:
- None (gets data from context) [REQ-011]

State:
- todoList: Array of Todo items (from context) [REQ-011]

Dependencies:
- TodoContext (provides todo data) [REQ-011]
- React hooks for rendering

// Only ASCII characters allowed in UI display [REQ-007, REQ-007.1]
```

## Render Algorithm

```
FUNCTION render() [REQ-001, REQ-006]
  // Get todos from context
  todos = TodoContext.getTodos() [REQ-011.1]
  
  // Handle empty state [REQ-009]
  IF todos.length == 0 [REQ-009.1]
    RETURN "Todo list is empty – use TodoWrite to add tasks." [REQ-009.1]
  END IF
  
  // Build display string [REQ-006]
  display = "## Todo List (temporal order)\n\n" [REQ-001.1]
  
  // Render each todo in order [REQ-001, REQ-001.1]
  FOR EACH todo IN todos
    display += renderTodo(todo)
    display += "\n"
  END FOR
  
  RETURN display [REQ-006.1, REQ-006.2]
END FUNCTION
```

## Todo Rendering

```
FUNCTION renderTodo(todo) [REQ-002, REQ-003, REQ-004]
  // Determine status marker [REQ-002]
  marker = ""
  IF todo.status == "completed" [REQ-002.1]
    marker = "- [x]" [REQ-002.1]
  ELSE IF todo.status == "pending" [REQ-002.2]
    marker = "- [ ]" [REQ-002.2]
  ELSE IF todo.status == "in_progress" [REQ-002.3]
    marker = "- [→]" [REQ-002.3]
  END IF
  
  // Format task line
  taskLine = marker + " " + todo.content
  
  // Highlight current task [REQ-003]
  IF todo.status == "in_progress" [REQ-003.1, REQ-003.2]
    taskLine = "**" + taskLine + "** ← current task" [REQ-003.1, REQ-003.2]
  END IF
  
  result = taskLine
  
  // Render subtasks if present [REQ-004]
  IF todo.subtasks EXISTS AND todo.subtasks.length > 0 [REQ-004.1]
    FOR EACH subtask IN todo.subtasks
      result += "\n    • " + subtask.content [REQ-004.2]
      
      // Render tool calls if present [REQ-005]
      IF subtask.toolCalls EXISTS AND subtask.toolCalls.length > 0 [REQ-005.1]
        FOR EACH toolCall IN subtask.toolCalls
          result += "\n        ↳ " + toolCall.name + "(" + formatParameters(toolCall.parameters) + ")" [REQ-005.2]
        END FOR
      END IF
    END FOR
  END IF
  
  RETURN result
END FUNCTION
```

## Parameter Formatting

```
FUNCTION formatParameters(parameters)
  // Format parameters as string
  // Simple JSON-like representation
  paramStrings = []
  
  FOR EACH key, value IN parameters
    IF typeof value == "string"
      paramStrings.push(key + ": '" + value + "'")
    ELSE
      paramStrings.push(key + ": " + JSON.stringify(value))
    END IF
  END FOR
  
  RETURN paramStrings.join(", ")
END FUNCTION
```

## Component Lifecycle

```
FUNCTION useEffect() [REQ-008, REQ-011]
  // Subscribe to todo updates [REQ-008.1, REQ-011.2]
  subscription = TodoContext.subscribeToUpdates(() => {
    // Trigger re-render when todos change [REQ-011.2]
    setState({ todos: TodoContext.getTodos() })
  })
  
  RETURN () => {
    // Cleanup subscription
    subscription.unsubscribe()
  }
END FUNCTION
```

## Integration with App

```
// In AppWrapper or similar parent component [REQ-014]
FUNCTION updateTodosAfterTodoWrite() [REQ-008.2]
  // After TodoWrite execution [REQ-008]
  newTodos = TodoRead.execute()
  TodoContext.updateTodos(newTodos) [REQ-011.2]
END FUNCTION

// Component location [REQ-010.1]
// TodoDisplay component must be created at `packages/cli/src/ui/components/TodoDisplay.tsx` [REQ-010.1, REQ-014.1]
```