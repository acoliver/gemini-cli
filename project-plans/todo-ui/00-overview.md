# Todo UI Enhancement Overview

## Feature Summary

This enhancement replaces the current Markdown-based TODO list output in the LLXPRT CLI with a dedicated UI component that provides a cleaner, more structured view of tasks, subtasks, and tool calls. The new TodoDisplay component will render tasks in a hierarchical ASCII format directly in the interactive CLI.

## Key Features

1. **Hierarchical Task Display** - Tasks, subtasks, and tool calls are shown in a clear nested structure
2. **Visual Status Indicators** - ASCII markers for task status (- [x], - [ ], - [→])
3. **Current Task Highlighting** - Bold text with "← current task" indicator for the active task
4. **Non-Scrolling UI** - Display redraws completely on updates rather than appending content
5. **ASCII-Only Display** - Clean interface using only standard ASCII characters

## Components to be Created/Modified

### New Components
- `TodoDisplay` - React component for visualizing TODO lists in `packages/cli/src/ui/components/TodoDisplay.tsx`

### Modified Components
- `TodoWrite` tool - Suppress Markdown output in interactive mode
- `TodoRead` tool - Handle extended data schema
- `TodoStore` - Persist extended Todo schema with subtasks and tool calls
- `Todo schemas` - Extended to support subtasks and tool calls

## Implementation Approach

The implementation follows a component-based architecture using React/Ink for UI rendering. The enhancement will:
1. Extend the existing Todo data schema to support subtasks and tool calls
2. Modify Todo tools to handle the extended schema and control output mode
3. Create the TodoDisplay component for visualizing TODO lists
4. Implement React state/context management for TODO data
5. Integrate the component into the main app layout

## Success Criteria

- TodoDisplay component correctly renders all TODO configurations
- Interactive mode displays enhanced UI instead of Markdown output
- Non-interactive mode provides simplified TODO output
- All existing tests pass with new functionality achieving at least 80% coverage
- No performance degradation in CLI operations