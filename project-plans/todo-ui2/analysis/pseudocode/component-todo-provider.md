# TodoProvider Pseudocode

## Provider Structure

```
Component: TodoProvider
Props:
- children: ReactNode
- sessionId: string
- agentId: string (optional)

State:
- todos: ExtendedTodo[]
- loading: boolean
- error: string | null

Dependencies:
- TodoStore for data persistence
- React hooks for state management
- Event system for update notifications
```

## Provider Initialization

```
FUNCTION TodoProvider(props)
  // Initialize state
  [todos, setTodos] = useState([])
  [loading, setLoading] = useState(true)
  [error, setError] = useState(null)
  
  // Load initial data
  useEffect(() => {
    refreshTodos()
  }, [props.sessionId, props.agentId])
  
  // Listen for update events
  useEffect(() => {
    subscription = eventEmitter.on('todoUpdated', () => {
      refreshTodos()
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  RETURN (
    <TodoContext.Provider value={{ todos, loading, error, updateTodos, refreshTodos }}>
      {props.children}
    </TodoContext.Provider>
  )
END FUNCTION
```

## Refresh Todos Method

```
FUNCTION refreshTodos()
  // Set loading state
  setLoading(true)
  
  TRY
    // Create store instance
    store = NEW TodoStore(sessionId, agentId)
    
    // Load todos from store
    newTodos = await store.readTodos()
    
    // Update state
    setTodos(newTodos)
    setError(null)
  CATCH error
    // Handle error
    setError("Failed to load todos: " + error.message)
    setTodos([])
  FINALLY
    // Clear loading state
    setLoading(false)
  END TRY
END FUNCTION
```

## Update Todos Method

```
FUNCTION updateTodos(newTodos)
  // Update state immediately for responsiveness
  setTodos(newTodos)
  
  TRY
    // Persist to store
    store = NEW TodoStore(sessionId, agentId)
    await store.writeTodos(newTodos)
  CATCH error
    // Handle persistence error
    setError("Failed to save todos: " + error.message)
  END TRY
END FUNCTION
```

## Loading State Handling

```
FUNCTION renderLoading()
  IF loading
    RETURN "Loading TODOs..."
  END IF
  
  RETURN null
END FUNCTION
```

## Error State Handling

```
FUNCTION renderError()
  IF error
    RETURN "Error: " + error
  END IF
  
  RETURN null
END FUNCTION
```

## Integration with App

```
// In AppWrapper or similar parent component
FUNCTION AppWrapper(props)
  sessionId = getSessionIdFromContext()
  agentId = getAgentIdFromContext()
  
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