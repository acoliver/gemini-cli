# Subagents for LLxprt - Overview

## Purpose

This document provides an overview of the subagents feature for LLxprt, which enables the creation of specialized AI agents that can work on specific tasks while keeping the main agent's context clean and organized.

## Concept

Subagents in LLxprt are specialized AI instances that:
1. Are assigned specific subsets of work from the main agent's task list
2. Operate with isolated contexts to prevent context pollution
3. Can use different model configurations through profile references
4. Report progress and results through the existing Todo system
5. Enable both synchronous (blocking) and asynchronous (background) execution

## Key Features

### Todo System Integration
Subagents are managed through the existing Todo system:
- Subagents appear as special subtasks in the main Todo list
- Subagents update their progress by modifying their Todo lists
- Parent agents monitor subagent progress through the Todo UI
- The visualization shows subagent tasks hierarchically nested under parent tasks

### Context Isolation
Each subagent operates with a focused context:
- Parent provides only the relevant context needed for the subagent's tasks
- Subagent's work doesn't pollute the parent's context
- Enables complex multi-step processes without overwhelming the main context

### Profile-Based Configuration
Subagents use specialized profiles:
- Stored in `~/.llxprt/agents/` directory
- Reference existing model profiles in `~/.llxprt/profiles/`
- Can specify different models, parameters, and tool configurations
- Enable specialization (e.g., "qwen3-conflict-merger-fireworks", "claude4opus-reviewer")

### Flexible Execution Models
Support for both execution patterns:
- **Synchronous**: Block parent until completion (like regular tool calls)
- **Asynchronous**: Run in background while parent continues (updates Todo list)

## Workflow Example

### Parent Task List
```
## Todo List (temporal order)
- [→] **1. Implement user authentication feature** ← current task
    • subtask: Launch backend implementation subagent
        ↳ launchSubagent(name: 'o3backend-dev', task: 'Implement auth endpoints')
    • subtask: Launch frontend implementation subagent
        ↳ launchSubagent(name: 'claude4fe-dev', task: 'Create auth UI components')
    • subtask: Review and integrate subagent outputs
- [ ] 2. Optimize database queries
    • subtask: Performance analysis subagent
```

### Backend Subagent Task List
```
## Todo List (temporal order)
- [→] **Implement auth endpoints** ← current task
    • subtask: Design REST API
        ↳ editFile('src/api/auth.routes.ts')
    • subtask: Implement controllers
        ↳ editFile('src/controllers/auth.controller.ts')
    • subtask: Add validation middleware
        ↳ editFile('src/middleware/validation.ts')
```

## Technical Approach

### Subagent Creation
Subagents are launched through the Todo system:
1. Parent creates Todo with subagent subtasks
2. When processing Todo, subagent subtasks trigger `launchSubagent` tool calls
3. Tool calls create isolated subagent contexts with provided configuration
4. Subagents begin working on their assigned tasks

### Communication
Communication between parent and subagents occurs through the Todo system:
- Subagents update their progress via `TodoWrite` calls
- Parent monitors progress through `TodoRead` calls
- UI updates automatically through the existing event system

### Context Management
1. Parent determines relevant context for each subagent
2. Context is provided as part of the subagent launch parameters
3. Subagents operate with isolated context windows
4. Results are integrated back into parent context when subagent completes

## Benefits

1. **Clean Context Management**: Parent context remains focused while subagents handle details
2. **Specialization**: Different subagents can use different models and configurations
3. **Parallel Execution**: Asynchronous subagents enable concurrent task processing
4. **Visibility**: Progress tracked through familiar Todo UI
5. **Reusability**: Subagent configurations can be saved and reused
6. **Scalability**: Complex tasks can be broken down into manageable pieces

## Future Extensions

1. **Out-of-Process Subagents**: Run subagents in separate processes to manage memory
2. **Adversarial Review**: Independent subagents for review without shared context
3. **Dynamic Task Allocation**: Parent can reassign tasks between subagents
4. **Subagent Communication**: Direct communication channels between subagents