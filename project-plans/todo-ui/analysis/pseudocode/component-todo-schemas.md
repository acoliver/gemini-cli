# Todo Schema Extensions Pseudocode

## Extended Todo Schema

```
// Base Todo schema (existing)
BaseTodoSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['high', 'medium', 'low'])
})

// Subtask schema (new) [REQ-013.1]
SubtaskSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    parameters: z.record(z.any())
  })).optional()
})

// Extended Todo schema (new) [REQ-013.1]
ExtendedTodoSchema = BaseTodoSchema.extend({
  subtasks: z.array(SubtaskSchema).optional()
})

// Array of extended todos
TodoArraySchema = z.array(ExtendedTodoSchema)

// TodoWrite parameters
TodoWriteParamsSchema = z.object({
  todos: TodoArraySchema
})

// TodoRead parameters (empty)
TodoReadParamsSchema = z.object({})
```

## Schema Validation Examples

```
FUNCTION validateTodoArray(todos)
  result = TodoArraySchema.safeParse(todos)
  
  IF result.success
    RETURN { valid: true, data: result.data }
  ELSE
    errors = result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }))
    RETURN { valid: false, errors: errors }
  END IF
END FUNCTION
```

## Schema Migration

```
FUNCTION migrateTodoSchema(oldTodo)
  // If it's already in the new format, return as is
  newValidation = ExtendedTodoSchema.safeParse(oldTodo)
  IF newValidation.success
    RETURN oldTodo
  END IF
  
  // Try to parse with old schema
  oldValidation = BaseTodoSchema.safeParse(oldTodo)
  IF oldValidation.success
    // Migrate by adding missing fields
    return {
      ...oldValidation.data,
      subtasks: undefined  // Add optional subtasks field
    }
  ELSE
    THROW Error with validation details
  END IF
END FUNCTION
```