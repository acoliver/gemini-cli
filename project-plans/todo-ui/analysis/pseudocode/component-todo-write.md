# TodoWrite Tool Pseudocode

## Tool Structure

```
Class: TodoWrite EXTENDS BaseTool [REQ-012, REQ-013, REQ-015, REQ-016]
Properties:
- isInteractiveMode: boolean
- context: SessionContext

Methods:
- execute(params): Promise<ToolResult> [REQ-008, REQ-012]
- generateOutput(oldTodos, newTodos): string [REQ-015, REQ-016]
- suppressMarkdownInInteractiveMode(): boolean [REQ-012.1]
```

## Execute Method

```
FUNCTION execute(params: TodoWriteParams, signal: AbortSignal) [REQ-008, REQ-012, REQ-013]
  // Validate todos with Zod schema [REQ-013.1]
  validationResult = TodoArraySchema.safeParse(params.todos)
  IF NOT validationResult.success
    THROW Error with validation details
  END IF
  
  // Get session and agent IDs from context
  sessionId = this.context?.sessionId OR "default"
  agentId = this.context?.agentId
  
  // Read old todos for diff tracking
  store = NEW TodoStore(sessionId, agentId)
  oldTodos = store.readTodos()
  
  // Write new todos [REQ-013.1]
  store.writeTodos(params.todos)
  
  // Determine if we're in interactive mode [REQ-012.1, REQ-015.1]
  isInteractive = this.context?.interactiveMode OR false
  
  // Generate appropriate output based on mode [REQ-012, REQ-015, REQ-016]
  IF isInteractive [REQ-012.1]
    // In interactive mode, suppress markdown and return minimal result [REQ-012.2]
    RETURN {
      llmContent: "TODO list updated",
      returnDisplay: ""  // Empty to suppress display [REQ-012.1]
    }
  ELSE [REQ-015.1, REQ-016.1]
    // In non-interactive mode, provide simplified markdown [REQ-015.1, REQ-016.2]
    output = this.generateSimplifiedOutput(params.todos)
    RETURN {
      llmContent: output,
      returnDisplay: output
    }
  END IF
END FUNCTION
```

## Generate Simplified Output

```
FUNCTION generateSimplifiedOutput(todos) [REQ-015, REQ-016]
  output = "## Todo List (" + todos.length + " tasks)\n" [REQ-016.2]
  
  FOR EACH todo IN todos
    // Determine status marker [REQ-002]
    marker = ""
    IF todo.status == "completed" [REQ-002.1]
      marker = "- [x]" [REQ-002.1]
    ELSE IF todo.status == "pending" [REQ-002.2]
      marker = "- [ ]" [REQ-002.2]
    ELSE IF todo.status == "in_progress" [REQ-002.3]
      marker = "- [→] ← current" [REQ-002.3]
    END IF
    
    output += marker + " " + todo.content + "\n"
  END FOR
  
  RETURN output [REQ-015.1, REQ-016.1]
END FUNCTION
```

## Tool Call Association

```
FUNCTION associateToolCallsWithSubtasks(toolExecutionResults) [REQ-013]
  // When tools are executed as part of subtasks,
  // associate the results with the appropriate subtask [REQ-013.1]
  FOR EACH result IN toolExecutionResults
    // Find the subtask this tool call belongs to
    subtask = findSubtaskForToolCall(result.toolCallId)
    
    IF subtask EXISTS
      // Add tool call to subtask's toolCalls array [REQ-013.1]
      subtask.toolCalls.push({
        id: result.toolCallId,
        name: result.toolName,
        parameters: result.parameters
      })
    END IF
  END FOR
END FUNCTION
```

## Error Handling

```
FUNCTION handleStoreError(error)
  // Handle errors from TodoStore
  IF error.code == "PERMISSION_DENIED"
    THROW new Error("Permission denied accessing todo storage")
  ELSE IF error.code == "STORAGE_FULL"
    THROW new Error("Storage full, cannot save todos")
  ELSE
    THROW new Error("Failed to access todo storage: " + error.message)
  END IF
END FUNCTION

FUNCTION handleValidationError(validationResult)
  // Handle validation errors
  errors = validationResult.error.errors
  errorMessages = errors.map(e => e.path.join(".") + ": " + e.message)
  THROW new Error("Invalid todo data: " + errorMessages.join("; "))
END FUNCTION
```