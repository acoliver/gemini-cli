# TodoRead Tool Pseudocode

## Tool Structure

```
Class: TodoRead EXTENDS BaseTool [REQ-011]
Properties:
- context: SessionContext

Methods:
- execute(params): Promise<ToolResult> [REQ-011.1]
- formatTodos(todos): string
```

## Execute Method

```
FUNCTION execute(params: TodoReadParams, signal: AbortSignal) [REQ-011.1]
  // Get session and agent IDs from context
  sessionId = this.context?.sessionId OR "default"
  agentId = this.context?.agentId
  
  // Read todos from store [REQ-011.1]
  store = NEW TodoStore(sessionId, agentId)
  todos = store.readTodos()
  
  // Format output
  IF todos.length == 0 [REQ-009.1]
    output = "## Todo List\n\nNo todos found.\n\nUse TodoWrite to create a task list." [REQ-009.1]
  ELSE
    output = this.formatTodos(todos)
  END IF
  
  RETURN {
    llmContent: output,
    returnDisplay: output
  }
END FUNCTION
```

## Format Todos Method

```
FUNCTION formatTodos(todos)
  output = "## Todo List\n\n"
  
  // Group todos by status
  inProgress = todos.filter(todo => todo.status == "in_progress") [REQ-008.1]
  pending = todos.filter(todo => todo.status == "pending")
  completed = todos.filter(todo => todo.status == "completed")
  
  // Render in progress tasks
  IF inProgress.length > 0
    output += "### In Progress\n\n"
    FOR EACH todo IN inProgress
      output += "- " + todo.content + "\n"
    END FOR
    output += "\n"
  END IF
  
  // Render pending tasks
  IF pending.length > 0
    output += "### Pending\n\n"
    FOR EACH todo IN pending
      output += "- " + todo.content + "\n"
    END FOR
    output += "\n"
  END IF
  
  // Render completed tasks
  IF completed.length > 0
    output += "### Completed\n\n"
    FOR EACH todo IN completed
      output += "- " + todo.content + "\n"
    END FOR
    output += "\n"
  END IF
  
  // Add summary
  output += "### Summary\n\n"
  output += "- Total: " + todos.length + " tasks\n"
  output += "- In Progress: " + inProgress.length + "\n"
  output += "- Pending: " + pending.length + "\n"
  output += "- Completed: " + completed.length + "\n"
  
  RETURN output
END FUNCTION
```