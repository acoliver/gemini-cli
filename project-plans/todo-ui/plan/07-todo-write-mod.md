# TodoWrite Tool Modification Plan

## Overview

Modify the TodoWrite tool to support the new UI features:
1. Suppress Markdown output in interactive mode
2. Associate tool calls with subtasks
3. Update data schema to support subtasks and tool calls

## Prerequisites

Before implementing, review the following documents:
- `project-plans/todo-ui/specification.md` - Feature specification with requirements
- `project-plans/todo-ui/analysis/pseudocode/component-todo-write.md` - Tool pseudocode
- `project-plans/todo-ui/analysis/pseudocode/component-todo-schemas.md` - Schema definitions
- `docs/RULES.md` - Development guidelines for clean code practices

## Implementation Requirements

1. Maintain all existing functionality for non-interactive mode
2. Add logic to detect interactive mode
3. Modify output generation based on mode
4. Extend data schema support
5. Add tool call association functionality
6. Follow clean code practices from `docs/RULES.md`
7. Use TypeScript strict mode
8. Work with immutable data only

## Implementation Steps

### 1. Interactive Mode Detection

1. Add property to check if in interactive mode
2. Modify execute method to detect mode from context
3. Store mode detection logic

### 2. Output Suppression

1. Modify generateOutput method to check mode
2. In interactive mode, return minimal output
3. In non-interactive mode, return simplified Markdown

### 3. Schema Extension Support

1. Update validation to support new schema
2. Ensure backward compatibility with old data
3. Add migration logic for old data formats

### 4. Tool Call Association

1. Add method to associate tool calls with subtasks
2. Modify tool execution flow to capture associations
3. Store tool calls in subtask's toolCalls array

## Quality Assurance

### Code Quality
- All code must compile with TypeScript strict mode
- No linting errors or warnings
- Follow naming conventions from `docs/RULES.md`
- Self-documenting function and variable names
- No comments in code

### Execution Quality
- All existing tests must continue to pass
- No console.log statements or debug code
- No TODO comments

## Success Criteria

- All existing tests continue to pass
- New functionality works in interactive mode
- Non-interactive mode maintains existing behavior
- Proper output based on mode
- Schema extensions work correctly
- Tool call association functions properly
- Code follows clean code practices from `docs/RULES.md`
- All code compiles with TypeScript strict mode
- No linting errors