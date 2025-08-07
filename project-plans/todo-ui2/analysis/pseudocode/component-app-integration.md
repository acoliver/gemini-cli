# App Integration Pseudocode

## AppWrapper Modification

```
Component: AppWrapper
Props:
- config: Config
- settings: LoadedSettings
- startupWarnings: string[]
- version: string

Dependencies:
- SessionStatsProvider
- VimModeProvider
- TodoProvider
- AppWithState
```

## AppWrapper Structure

```
FUNCTION AppWrapper(props)
  // Extract session and agent IDs from context or props
  sessionId = props.config.getSessionId()
  agentId = props.config.getAgentId()
  
  RETURN (
    <SessionStatsProvider>
      <VimModeProvider settings={props.settings}>
        <TodoProvider sessionId={sessionId} agentId={agentId}>
          <AppWithState {...props} />
        </TodoProvider>
      </VimModeProvider>
    </SessionStatsProvider>
  )
END FUNCTION
```

## AppWithState Modification

```
Component: AppWithState
Props:
- config: Config
- settings: LoadedSettings
- startupWarnings: string[]
- version: string

State:
- Various existing state properties
- todos: ExtendedTodo[] (from TodoContext)

Dependencies:
- useTodoContext
- TodoDisplay component
- Existing components
```

## Conditional TodoDisplay Rendering

```
FUNCTION renderTodoDisplay()
  // Get todos from context
  { todos } = useTodoContext()
  
  // Only render if we have todos
  IF todos.length > 0
    RETURN <TodoDisplay />
  END IF
  
  RETURN null
END FUNCTION
```

## App Layout Integration

```
FUNCTION AppWithState(props)
  // Existing state and hooks...
  
  RETURN (
    <Box flexDirection="column" height="100%">
      // Existing components...
      <Header ... />
      
      // TodoDisplay integration
      {renderTodoDisplay()}
      
      // Existing components...
      <InputPrompt ... />
      <Footer ... />
    </Box>
  )
END FUNCTION
```

## Proper Placement in Render Tree

```
// Determine appropriate placement in the render tree
// Should be below main content but above input/footer
<Box flexDirection="column" height="100%">
  <Header ... />
  
  // Main content area
  <Box flexGrow={1}>
    // Existing history/messages
    <HistoryDisplay ... />
    
    // Todo display (conditionally rendered)
    {renderTodoDisplay()}
  </Box>
  
  // Input and footer
  <InputPrompt ... />
  <Footer ... />
</Box>
```

## Context Usage in App

```
FUNCTION AppWithState(props)
  // Use todo context
  { todos, loading, error } = useTodoContext()
  
  // Handle loading and error states
  IF loading
    // Show loading indicator in appropriate place
  END IF
  
  IF error
    // Show error message in appropriate place
  END IF
  
  RETURN (
    // Existing render structure with TodoDisplay added
  )
END FUNCTION
```