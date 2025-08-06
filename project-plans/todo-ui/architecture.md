# Todo UI Enhancement - Architecture Document

## 1. Introduction

This document describes the architectural design of the enhanced TODO list functionality for the LLXPRT CLI. It focuses on the components, their interactions, and the end state of the system after implementation.

## 2. System Overview

The enhanced TODO system provides a visual UI component for displaying task lists with hierarchical structure (tasks, subtasks, and tool calls) in the interactive CLI, while maintaining programmatic access for non-interactive usage.

## 3. Components and Their Interactions

### 3.1 Core System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    LLXPRT CLI Application                   │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐    ┌────────────────┐                   │
│  │   App State   │◄──▶│  TodoDisplay   │                   │
│  │ (React Hooks) │    │  Component     │                   │
│  └───────────────┘    └────────────────┘                   │
│           │                     │                          │
│           ▼                     ▼                          │
│  ┌───────────────┐    ┌────────────────┐                   │
│  │  TodoStore    │◄──▶│  Todo Context  │                   │
│  │ (Persistence) │    │   Provider     │                   │
│  └───────────────┘    └────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  Todo Tools    │
                     │ (TodoRead,     │
                     │  TodoWrite)    │
                     └────────────────┘
```

### 3.2 Component Descriptions

#### 3.2.1 TodoDisplay Component
- **Location**: `packages/cli/src/ui/components/TodoDisplay.tsx`
- **Purpose**: Renders the TODO list in a hierarchical ASCII format
- **Key Features**:
  - Displays tasks in temporal order
  - Shows status with ASCII markers (- [x], - [ ], - [→])
  - Renders subtasks with bullet indentation (•)
  - Renders tool calls with arrow indentation (↳)
  - Highlights current task (bold + "← current task")
  - Redraws completely on updates

#### 3.2.2 App State (React Hooks/Context)
- **Purpose**: Manages the current TODO list state and triggers UI updates
- **Key Responsibilities**:
  - Holds the TODO list data in React state
  - Provides update mechanism for TodoDisplay
  - Integrates with application lifecycle

#### 3.2.3 TodoStore
- **Location**: `packages/core/src/tools/todo-store.ts`
- **Purpose**: Persistent storage for TODO lists
- **Key Features**:
  - Stores TODO data per session/agent
  - Provides read/write operations
  - Maintains data consistency

#### 3.2.4 Todo Context Provider
- **Purpose**: Centralizes TODO data access for the application
- **Key Features**:
  - Provides TODO data to TodoDisplay
  - Handles data updates from tools
  - Manages subscription to data changes

#### 3.2.5 Todo Tools (TodoRead, TodoWrite)
- **Location**: `packages/core/src/tools/todo-read.ts`, `packages/core/src/tools/todo-write.ts`
- **Purpose**: Programmatic interface for TODO list management
- **Key Features**:
  - TodoRead: Retrieves current TODO list
  - TodoWrite: Updates TODO list with new data
  - Different output modes for interactive/non-interactive usage

## 4. Data Model

### 4.1 Enhanced Todo Schema

The existing Todo schema will be extended to support subtasks and tool calls:

```typescript
interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  // New fields:
  subtasks?: Subtask[];  // Optional array of subtasks
}

interface Subtask {
  id: string;
  content: string;
  toolCalls?: ToolCall[];  // Optional array of associated tool calls
}

interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
}
```

## 5. End State Architecture

### 5.1 Component Interactions in Interactive Mode

```
┌─────────────────┐         ┌────────────────┐
│     LLM         │         │   TodoWrite    │
│   (Agent)       │────────▶│     Tool       │
└─────────────────┘         └────────────────┘
                                      │
                             Update TODO data
                                      ▼
                            ┌────────────────┐
                            │   TodoStore    │
                            └────────────────┘
                                      │
                           Notify data change
                                      ▼
                            ┌────────────────┐
                            │  Todo Context  │
                            │   Provider     │
                            └────────────────┘
                                      │
                          Update React state
                                      ▼
                            ┌────────────────┐
                            │  TodoDisplay   │
                            │   Component    │
                            └────────────────┘
                                      │
                              Render to UI
                                      ▼
                            ┌────────────────┐
                            │   Terminal     │
                            └────────────────┘
```

### 5.2 Component Interactions in Non-Interactive Mode

```
┌─────────────────┐         ┌────────────────┐
│   Program       │         │   TodoWrite    │
│   (Caller)      │────────▶│     Tool       │
└─────────────────┘         └────────────────┘
                                      │
                             Update TODO data
                                      ▼
                            ┌────────────────┐
                            │   TodoStore    │
                            └────────────────┘
                                      │
                         Return simplified
                           Markdown output
                                      ▼
                            ┌────────────────┐
                            │   Program      │
                            │   (Caller)     │
                            └────────────────┘
```

## 6. Key Technical Changes

### 6.1 Modifications to Existing Components

#### TodoWrite Tool (`packages/core/src/tools/todo-write.ts`)
- Modified to suppress Markdown output in interactive mode
- Enhanced to associate tool calls with subtasks
- Updated data schema to support subtasks and tool calls

#### TodoRead Tool (`packages/core/src/tools/todo-read.ts`)
- Minor adjustments to handle extended data schema
- Maintains existing functionality for data retrieval

#### TodoStore (`packages/core/src/tools/todo-store.ts`)
- Updated to persist extended Todo schema
- Maintains backward compatibility with existing data

### 6.2 New Components

#### TodoDisplay Component (`packages/cli/src/ui/components/TodoDisplay.tsx`)
- New React component for visualizing TODO lists
- Implements hierarchical rendering with ASCII characters
- Integrates with Todo Context for data access

#### Todo Context Provider
- Centralized state management for TODO data
- Provides data to TodoDisplay component
- Handles updates from Todo tools

## 7. Data Flow Patterns

### 7.1 Interactive Mode Data Flow

1. **LLM Execution**: LLM calls TodoWrite with updated TODO list
2. **Data Update**: TodoWrite updates TodoStore with enhanced data
3. **State Update**: Todo Context Provider is notified of data change
4. **UI Refresh**: TodoDisplay re-renders with updated TODO list
5. **Terminal Output**: Enhanced TODO list is displayed in terminal

### 7.2 Non-Interactive Mode Data Flow

1. **Program Execution**: Program calls TodoWrite with TODO list
2. **Data Update**: TodoWrite updates TodoStore with data
3. **Output Generation**: TodoWrite generates simplified Markdown
4. **Return Output**: Simplified output is returned to caller

## 8. Integration with Existing System

### 8.1 React/Ink Integration
- TodoDisplay component follows existing patterns in the codebase
- Integrated into the main application layout
- Uses existing styling and theming mechanisms

### 8.2 Tool System Integration
- Todo tools maintain their BaseTool inheritance
- Follow existing patterns for tool registration and execution
- Integrate with existing tool execution framework

## 9. Error Handling Architecture

### 9.1 Component-Level Error Boundaries
- TodoDisplay includes error boundaries for rendering failures
- Graceful degradation to error messages when data is unavailable

### 9.2 Data-Level Error Handling
- TodoStore provides error handling for persistence failures
- Todo Context Provider handles data retrieval errors gracefully

## 10. Performance Considerations

### 10.1 Rendering Efficiency
- TodoDisplay implements efficient rendering for typical TODO sizes
- Minimal re-renders through proper React state management

### 10.2 Data Access Optimization
- TodoStore implements efficient data retrieval
- Todo Context Provider minimizes unnecessary updates

## 11. Testing Architecture

### 11.1 Component Testing
- TodoDisplay has dedicated unit tests for rendering scenarios
- Tests cover various TODO configurations and edge cases

### 11.2 Integration Testing
- End-to-end tests verify LLM-to-UI data flow
- Tests validate both interactive and non-interactive modes

## 12. Deployment Architecture

### 12.1 Build Process
- TodoDisplay component is included in the standard build process
- No additional build steps required

### 12.2 Runtime Requirements
- Uses existing React/Ink dependencies
- No additional runtime dependencies