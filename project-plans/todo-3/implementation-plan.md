# Todo Tool Enhancement - Real-time Tool Call Display Plan

## Requirements

1. Display executing tool calls as subitems under the active todo with a spinner animation
2. Show completed tool calls as subitems under their associated todos
3. Enable real-time updates to the todo display as tools execute
4. Maintain backward compatibility with existing functionality
5. Provide visual indicators for tool execution states (spinner for executing, checkmark for completed)

## Analysis

Currently, the system:
- Records completed tool calls to the todo store via `ToolCallTrackerService`
- Displays completed tool calls in `TodoDisplay` component when todos are refreshed
- Shows executing tools separately through `useReactToolScheduler` hook
- Does not connect real-time tool execution with the todo display

## Implementation Plan

### 1. Enhance ToolCallTrackerService

**File:** `packages/core/src/services/tool-call-tracker-service.ts`

Modifications:
- Add a method to track executing tool calls in memory (not persisted)
- Add methods to update tool call status (executing → completed/failed)
- Add a way to subscribe to tool call updates for real-time UI updates

```typescript
// Add in-memory storage for executing tool calls
private static executingToolCalls = new Map<string, Map<string, TodoToolCall>>();

// Add methods to track executing tool calls
static startTrackingToolCall(sessionId: string, todoId: string, toolCall: TodoToolCall): void;
static completeToolCallTracking(sessionId: string, todoId: string, toolCallId: string): void;
static failToolCallTracking(sessionId: string, todoId: string, toolCallId: string): void;
static getExecutingToolCalls(sessionId: string, todoId: string): TodoToolCall[];
```

### 2. Update CoreToolScheduler Integration

**File:** `packages/core/src/core/coreToolScheduler.ts`

Modifications:
- Track when tool calls start executing (not just when they complete)
- Update the ToolCallTrackerService with executing tool call information
- Handle tool call completion/failure events to update status

### 3. Create ToolCallContext for Real-time Updates

**New file:** `packages/cli/src/ui/contexts/ToolCallContext.tsx`

Purpose:
- Provide real-time tool call information to UI components
- Bridge between core tool tracking and UI display

```typescript
interface ToolCallContextType {
  getExecutingToolCalls: (todoId: string) => TodoToolCall[];
  subscribe: (callback: () => void) => () => void;
}

const ToolCallContext = React.createContext<ToolCallContextType>(/* default */);
```

### 4. Update TodoDisplay Component

**File:** `packages/cli/src/ui/components/TodoDisplay.tsx`

Modifications:
- Import and use ToolCallContext
- Display executing tool calls with spinners
- Combine executing and completed tool calls in display
- Add spinner animation for executing tools

```typescript
// In renderTodo function
const executingToolCalls = toolCallContext.getExecutingToolCalls(todo.id);
const allToolCalls = [...(executingToolCalls || []), ...(todo.toolCalls || [])];

// Render executing tool calls with spinners
if (executingToolCalls.length > 0) {
  for (const toolCall of executingToolCalls) {
    result += `\n    ↳ ${spinner} ${toolCall.name}(${formatParameters(toolCall.parameters)})`;
  }
}
```

### 5. Create ToolCallProvider

**New file:** `packages/cli/src/ui/contexts/ToolCallProvider.tsx`

Purpose:
- Manage real-time tool call state
- Connect with ToolCallTrackerService
- Provide context to UI components

### 6. Update TodoProvider to Work with Real-time Updates

**File:** `packages/cli/src/ui/contexts/TodoProvider.tsx`

Modifications:
- Add subscription to tool call updates
- Trigger todo refreshes when tool calls update

## Test Modifications

### 1. ToolCallTrackerService Tests

**File:** `packages/core/src/services/tool-call-tracker-service.test.ts`

Add tests for:
- Tracking executing tool calls
- Updating tool call status
- Getting executing tool calls for a todo

### 2. TodoDisplay Tests

**File:** `packages/cli/src/ui/components/__tests__/TodoDisplay.test.tsx`

Add tests for:
- Displaying executing tool calls with spinners
- Displaying both executing and completed tool calls
- Proper formatting with spinners

### 3. Integration Tests

Create new integration tests to verify:
- Real-time updates to todo display as tools execute
- Proper state transitions (executing → completed)
- Correct spinner animations

## Implementation Order

1. Enhance ToolCallTrackerService with executing tool call tracking
2. Update CoreToolScheduler to track executing tool calls
3. Create ToolCallContext and ToolCallProvider
4. Update TodoDisplay to show real-time tool calls
5. Update TodoProvider to work with real-time updates
6. Write tests for all new functionality
7. Run integration tests
8. Update documentation

## Backward Compatibility

- Existing functionality remains unchanged when new features are not used
- Todos without associated tool calls display as before
- Configuration option to enable/disable real-time tool call display

## Expected Challenges

1. Managing real-time updates efficiently to avoid performance issues
2. Ensuring proper cleanup of in-memory tool call tracking
3. Synchronizing between persisted and real-time tool call data
4. Handling edge cases like tool call failures or cancellations
5. Implementing smooth spinner animations in terminal UI