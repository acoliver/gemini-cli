# Todo UI Domain Model

## Entity Relationships

### Todo Entity
- **Attributes**: id, content, status, priority, subtasks
- **Relationships**: 
  - Has many Subtasks (0..*)
  - Belongs to Session/Agent context

### Subtask Entity
- **Attributes**: id, content, toolCalls
- **Relationships**:
  - Belongs to Todo (1)
  - Has many ToolCalls (0..*)

### ToolCall Entity
- **Attributes**: id, name, parameters
- **Relationships**:
  - Belongs to Subtask (1)

### TodoStore Entity
- **Attributes**: sessionId, agentId
- **Relationships**:
  - Contains many Todos (0..*)
  - Associated with Session/Agent context

## State Transitions

### Todo Status Transitions
```
pending ────────────────┐
  │                     │
  ▼                     ▼
in_progress ─────────► completed
  │
  └─────────────────────┐
                        ▼
                    pending (reset)
```

### UI Display States
```
Initial State: Empty Display
        │
        ▼
TodoWrite Executed [REQ-008.2]
        │
        ▼
Data Updated in Store
        │
        ▼
Context/State Notified [REQ-011.2]
        │
        ▼
TodoDisplay Re-renders [REQ-010.1]
        │
        ▼
Updated Display Shows
```

## Business Rules

1. **Task Ordering**: Tasks must be displayed in the same order as stored in the TodoStore [REQ-001]
   - Tasks must be rendered in the exact order they appear in the stored todo array [REQ-001.1]
2. **Current Task Identification**: Only one task can be "in_progress" at a time, which is considered the current task [REQ-008.1]
3. **Status Markers**: 
   - `- [x]` for completed tasks [REQ-002.1]
   - `- [ ]` for pending tasks [REQ-002.2]
   - `- [→]` for the current (in_progress) task [REQ-002.3]
4. **Current Task Highlighting**: The current task must be bolded and have a "← current task" indicator [REQ-003]
   - Current task must be bolded [REQ-003.1]
   - Current task must have trailing note "← current task" [REQ-003.2]
5. **Indentation Rules**:
   - Subtasks indented with `•` under parent tasks [REQ-004]
   - Subtasks must be indented under their parent tasks [REQ-004.1]
   - Subtasks must be prefixed with `•` [REQ-004.2]
   - Tool calls indented with `↳` under parent subtasks [REQ-005]
   - Tool calls must be indented under their parent subtasks [REQ-005.1]
   - Tool calls must be prefixed with `↳` [REQ-005.2]
6. **Display Refresh**: The entire TODO display must be redrawn on each update, not appended [REQ-006]
   - Entire display must be replaced on updates [REQ-006.1]
   - No appending of content to previous display [REQ-006.2]
7. **Output Control**: 
   - In interactive mode, TodoWrite suppresses Markdown output [REQ-012]
   - In non-interactive mode, TodoWrite provides simplified Markdown output [REQ-015, REQ-016]
   - Return minimal ToolResult in interactive mode [REQ-012.2]
   - Continue Markdown output in non-interactive mode [REQ-016.1]
   - Simplified structure in non-interactive mode [REQ-016.2]
8. **Tool Call Association**: Tool calls must be captured and associated with their respective subtasks [REQ-013]
   - Tool calls must be stored with subtasks in data structure [REQ-013.1]

## Edge Cases

1. **Empty Todo List**: Display appropriate message when no tasks exist [REQ-009]
   - Show message when todo list is empty [REQ-009.1]
2. **Tasks Without Subtasks**: Render tasks without subtask indentation [REQ-004.1]
3. **Subtasks Without Tool Calls**: Render subtasks without tool call indentation [REQ-005.1]
4. **Very Long Task Content**: Handle text wrapping or truncation appropriately
5. **Large Number of Tasks**: Maintain performance with up to 50 tasks [Performance Requirement]
6. **Malformed Data**: Gracefully handle invalid or incomplete todo data
7. **Concurrent Updates**: Handle rapid successive TodoWrite executions [REQ-008]

## Error Scenarios

1. **Data Retrieval Failure**: TodoRead unable to retrieve data from TodoStore [REQ-011.1]
2. **Data Persistence Failure**: TodoWrite unable to persist data to TodoStore
3. **UI Rendering Failure**: TodoDisplay unable to render task data [REQ-010.1]
4. **Context Update Failure**: Failure to notify TodoDisplay of data changes [REQ-011.2]
5. **Terminal Compatibility Issues**: Display issues in different terminal environments [REQ-007.1]
6. **Performance Degradation**: Display updates taking longer than 100ms [Performance Requirement]

## Integration Points

1. **With Todo Tools**: 
   - TodoWrite updates TodoStore and notifies UI [REQ-008, REQ-012]
   - TodoRead retrieves data for TodoDisplay [REQ-011.1]
2. **With TodoStore**: 
   - Persistent storage of extended Todo schema [REQ-013.1]
   - Data retrieval for UI rendering
3. **With App State**: 
   - React context/state management for TODO data [REQ-011]
   - Triggering UI updates [REQ-008.1]
4. **With CLI Application**: 
   - Integration into main application layout [REQ-014]
   - Component must be integrated into app layout [REQ-014.1]
   - Handling interactive vs. non-interactive modes [REQ-012.1, REQ-015.1, REQ-016.1]

## Implementation Constraints

1. **ASCII-only Display**: Only ASCII characters allowed in UI display [REQ-007]
   - No emoji or special symbols [REQ-007.1]
2. **File Location**: TodoDisplay component must be created at `packages/cli/src/ui/components/TodoDisplay.tsx` [REQ-010.1]
3. **Performance**: Updates must complete within 100ms for lists with up to 50 tasks [Performance Requirement]
4. **Terminal Compatibility**: Works in standard 80x24 terminal [Performance Requirement]
5. **Component Implementation**: 
   - Use React hooks or context for state management [REQ-011.1]
   - State updates must trigger component re-renders [REQ-011.2]
   - Suppress Markdown output in interactive mode [REQ-012.1]
   - Simplified Markdown output in non-interactive mode [REQ-015.1]