# Todo Tool Enhancement Project - Overview

## Objective

Enhance the existing todo tool functionality in LLXPRT to automatically capture and display tool calls subordinate to active todo items. This feature would improve task tracking and provide better visibility into the execution context of each task, similar to how Claude Code handles todo lists and associated tool calls.

## Current State Analysis

### Todo Tool Structure
The todo tool in LLXPRT has the following characteristics:
- Maintains a list of tasks with status (pending, in_progress, completed)
- Supports priority levels (high, medium, low)
- Has a schema that supports subtasks and associated tool calls
- Stores data in a session-specific JSON file
- Includes UI components for displaying todos in the CLI interface

### Tool Call Tracking
Currently, tool calls are displayed separately from todo items and are not associated with specific tasks. When a tool is executed, its output is shown independently in the interface.

### Missing Features
1. Automatic association of tool calls with the currently active todo item
2. Suppression of normal tool call rendering when in "todo mode"
3. Subordinate display of tool calls under their associated todo items

## Requirements

1. **Tool Call Association**: When a todo item is marked as "in_progress", any subsequent tool calls should be automatically associated with that item.
2. **UI Integration**: Tool calls should be displayed as subordinate items under their associated todo in the todo list display.
3. **Conditional Rendering**: Normal tool call rendering should be suppressed when tool calls are being shown as part of a todo list.
4. **Data Persistence**: Associated tool calls should be persisted with their todo items in the JSON store.

## Technical Findings

### Existing Components
- `TodoStore`: Handles reading/writing todo data to JSON files
- `TodoRead`/`TodoWrite`: Tools for interacting with the todo system
- `TodoContext`/`TodoProvider`: React context for todo state management in the UI
- `TodoDisplay`: UI component for rendering the todo list
- `TodoEventEmitter`: Event system for real-time todo updates

### Schema Support
The existing todo schema already includes support for subtasks and associated tool calls:
- Todos can have an array of subtasks
- Subtasks can contain an array of tool calls with name and parameters

### Synchronization
The system already has an event system (`TodoEventEmitter`) that can update the UI when todos change.

## Next Steps

1. Design the technical implementation approach for associating tool calls with active todos
2. Modify the tool execution pipeline to track calls in the context of active todos
3. Update UI rendering to show tool calls subordinate to their associated todos
4. Add configuration options for controlling the new behavior
5. Implement data persistence for associated tool calls
6. Test the integration with various tool types and edge cases

## Expected Benefits

1. Better task visibility and tracking
2. Improved understanding of what tools are being used for each task
3. More organized display of execution context
4. Enhanced debugging capabilities for complex tasks