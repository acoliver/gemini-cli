# Todo Tool Enhancement - User Guide

## Overview

This enhancement to the todo tool automatically captures and displays tool calls subordinate to active todo items. This provides better visibility into what tools are being used for each task and helps track progress more effectively.

## Features

1. **Automatic Tool Call Association** - When a todo is marked as "in_progress", any subsequent tool calls are automatically associated with that todo.
2. **Subordinate Display** - Tool calls are displayed directly under their associated todo items in the todo list.
3. **Conditional Rendering** - Normal tool call rendering can be suppressed when in todo mode to avoid duplication.

## Configuration

To enable the new functionality, add the following to your configuration:

```json
{
  "suppressToolCallRenderInTodoMode": true
}
```

This setting tells the system to suppress normal tool call rendering when there's an active todo, showing tool calls only in the context of their associated todo items.

## Usage

1. Create or update a todo list with the `todo_write` tool, marking one item as `in_progress`:
   ```json
   {
     "todos": [
       {
         "id": "task-1",
         "content": "Research authentication options",
         "status": "in_progress",
         "priority": "high"
       },
       {
         "id": "task-2",
         "content": "Implement user registration",
         "status": "pending",
         "priority": "medium"
       }
     ]
   }
   ```

2. As you execute tools, they will be automatically associated with the active todo item.

3. View your todo list with `todo_read` to see tool calls displayed subordinate to their associated todos:
   ```
   ## Todo List (temporal order)

   - → Research authentication options ← current task
       ↳ web_search(query: 'OAuth2 vs JWT authentication')
       ↳ read_file(absolute_path: '/path/to/auth-options.md')

   - ○ Implement user registration
   ```

## How It Works

1. When you mark a todo as `in_progress` with `todo_write`, the system tracks which todo is active.
2. When tools are executed, they are recorded and associated with the active todo.
3. The todo data is updated to include the tool calls.
4. When the todo list is displayed, tool calls appear directly under their associated todos.
5. If `suppressToolCallRenderInTodoMode` is enabled, normal tool call rendering is suppressed to avoid duplication.

## Benefits

- Better task tracking and visibility into tool usage
- Reduced clutter in the interface by consolidating related information
- Improved context for understanding what actions were taken for each task
- Enhanced debugging capabilities for complex workflows

## Backward Compatibility

This enhancement is fully backward compatible. Existing todo functionality continues to work unchanged when the new features are not enabled.