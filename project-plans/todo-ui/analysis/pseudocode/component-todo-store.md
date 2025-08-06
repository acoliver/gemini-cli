# TodoStore Pseudocode

## Store Structure

```
Class: TodoStore [REQ-013.1]
Properties:
- sessionId: string
- agentId: string (optional)
- filePath: string (computed from sessionId and agentId)

Methods:
- readTodos(): Promise<Todo[]> [REQ-011.1, REQ-013.1]
- writeTodos(todos: Todo[]): Promise<void> [REQ-013.1]
- getFilePath(): string
```

## Read Todos Method

```
FUNCTION readTodos() [REQ-011.1]
  filePath = this.getFilePath()
  
  // Check if file exists
  IF NOT fileExists(filePath)
    RETURN []
  END IF
  
  // Read file content
  content = readFile(filePath)
  
  // Parse JSON
  parsed = JSON.parse(content)
  
  // Validate with Zod schema
  result = TodoArraySchema.safeParse(parsed)
  
  IF result.success
    RETURN result.data
  ELSE
    // Log error and return empty array
    logError("Invalid todo data in file: " + filePath)
    RETURN []
  END IF
END FUNCTION
```

## Write Todos Method

```
FUNCTION writeTodos(todos: Todo[]) [REQ-013.1]
  // Validate todos with Zod schema
  result = TodoArraySchema.safeParse(todos)
  
  IF NOT result.success
    THROW Error with validation details
  END IF
  
  filePath = this.getFilePath()
  
  // Ensure directory exists
  ensureDirectoryExists(dirname(filePath))
  
  // Serialize to JSON
  content = JSON.stringify(todos, null, 2)
  
  // Write to file
  writeFile(filePath, content)
END FUNCTION
```

## Get File Path Method

```
FUNCTION getFilePath()
  // Determine storage directory
  storageDir = getStorageDirectory()  // From config or default
  
  // Create filename based on session and agent
  filename = "todos"
  IF this.agentId
    filename += "-" + this.agentId
  END IF
  filename += ".json"
  
  // Combine into full path
  RETURN joinPaths(storageDir, this.sessionId, filename)
END FUNCTION
```

## Data Migration (for backward compatibility)

```
FUNCTION migrateOldData(oldTodos: OldTodo[])
  newTodos = []
  
  FOR EACH oldTodo IN oldTodos
    newTodo = {
      id: oldTodo.id,
      content: oldTodo.content,
      status: oldTodo.status,
      priority: oldTodo.priority,
      // subtasks and toolCalls are omitted for old data
      subtasks: undefined
    }
    newTodos.push(newTodo)
  END FOR
  
  RETURN newTodos
END FUNCTION
```