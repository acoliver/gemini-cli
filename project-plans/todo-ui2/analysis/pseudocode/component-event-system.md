# Event System Pseudocode

## Event Emitter Structure

```
Class: TodoEventEmitter
Properties:
- listeners: Map<string, Function[]>

Methods:
- emit(event: string, data: any)
- on(event: string, listener: Function)
- off(event: string, listener: Function)
```

## Event Emitter Implementation

```
FUNCTION TodoEventEmitter()
  listeners = NEW Map()
  
  FUNCTION emit(event, data)
    IF listeners.has(event)
      FOR EACH listener IN listeners.get(event)
        TRY
          listener(data)
        CATCH error
          console.error("Error in event listener:", error)
        END TRY
      END FOR
    END IF
  END FUNCTION
  
  FUNCTION on(event, listener)
    IF NOT listeners.has(event)
      listeners.set(event, [])
    END IF
    
    listeners.get(event).push(listener)
  END FUNCTION
  
  FUNCTION off(event, listener)
    IF listeners.has(event)
      listenersArray = listeners.get(event)
      index = listenersArray.indexOf(listener)
      IF index >= 0
        listenersArray.splice(index, 1)
      END IF
    END IF
  END FUNCTION
END FUNCTION
```

## TodoWrite Event Emission

```
FUNCTION TodoWrite.execute(params, signal, updateOutput)
  // Existing validation and processing...
  
  // Write to store
  store = NEW TodoStore(sessionId, agentId)
  await store.writeTodos(params.todos)
  
  // Determine if we're in interactive mode
  isInteractive = this.context?.interactiveMode OR false
  
  // Emit event for UI update in interactive mode
  IF isInteractive
    eventEmitter.emit('todoUpdated', {
      sessionId: sessionId,
      agentId: agentId,
      todos: params.todos
    })
  END IF
  
  // Existing output generation...
END FUNCTION
```

## TodoProvider Event Listening

```
FUNCTION TodoProvider(props)
  // Existing state initialization...
  
  // Listen for todo updates
  useEffect(() => {
    FUNCTION handleTodoUpdate(eventData)
      // Verify this update is for our session/agent
      IF eventData.sessionId === props.sessionId AND 
         (eventData.agentId === props.agentId OR 
          (!eventData.agentId AND !props.agentId))
        refreshTodos()
      END IF
    END FUNCTION
    
    eventEmitter.on('todoUpdated', handleTodoUpdate)
    
    RETURN () => {
      eventEmitter.off('todoUpdated', handleTodoUpdate)
    }
  }, [props.sessionId, props.agentId])
  
  // Existing render...
END FUNCTION
```

## Event Data Structure

```
Interface: TodoUpdateEvent
Properties:
- sessionId: string
- agentId: string (optional)
- todos: ExtendedTodo[]
- timestamp: Date
```

## Error Handling in Event System

```
FUNCTION TodoProvider.handleTodoUpdate(eventData)
  TRY
    // Verify session and agent match
    IF eventData.sessionId !== sessionId
      RETURN
    END IF
    
    IF eventData.agentId !== agentId
      RETURN
    END IF
    
    // Refresh todos
    await refreshTodos()
  CATCH error
    setError("Failed to update TODOs: " + error.message)
  END TRY
END FUNCTION
```

## Event System Integration

```
// In application initialization
// Create global event emitter
globalEventEmitter = NEW TodoEventEmitter()

// Make available to tools and UI components
// This could be through context, singleton, or import
```