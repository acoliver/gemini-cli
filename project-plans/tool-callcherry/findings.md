# DeclarativeTool Migration Analysis and Plan

## 1. What Changed in Gemini-CLI Codebase

### Architectural Shift
The commit 8bac9e7d introduces a new pattern that separates tool definition from tool execution:

**Old Pattern:**
```typescript
class EditTool extends BaseTool {
  execute(params, signal) { /* all logic here */ }
  shouldConfirmExecute(params, signal) { /* confirmation logic */ }
  getDescription(params) { /* description logic */ }
}
```

**New Pattern:**
```typescript
class EditTool extends BaseDeclarativeTool {
  createInvocation(params): ToolInvocation {
    return new EditToolInvocation(this.config, params);
  }
}

class EditToolInvocation implements ToolInvocation {
  constructor(config, params) { }
  execute(signal) { /* execution logic */ }
  shouldConfirmExecute(signal) { /* confirmation logic */ }
  getDescription() { /* description logic */ }
}
```

### Key Changes:
1. **New Interfaces**:
   - `ToolInvocation<TParams, TResult>` - Represents a single tool execution
   - `BaseToolInvocation` - Base implementation
   - `BaseDeclarativeTool` - New base class for tools

2. **Method Changes**:
   - `build(params)` creates invocations instead of direct execution
   - Tool classes become factories for invocations
   - Lifecycle methods move to invocation classes

3. **Separation of Concerns**:
   - Tool class: Definition, validation, invocation creation
   - Invocation class: Execution, confirmation, description

## 2. LLxprt's Unique Effective Features

### Multi-Provider Support
- Provider-specific tool formatting
- Provider-aware error handling
- Provider-specific configuration options
- Authentication type awareness

### Enhanced Parameters
- **GlobTool**: `max_files` parameter for limiting results
- **GrepTool**: `max_matches` parameter for controlling output
- **All Tools**: Token-based output limiting with configurable modes

### Advanced Settings Integration
- `tool-output-max-items` ephemeral setting
- `tool-output-truncate-mode` (warn/truncate/sample)
- Git ignore respect settings
- File filtering with `.llxprtignore`

### Enhanced User Experience
- Detailed error guidance when limits exceeded
- Suggestions for better search strategies
- Token usage tracking and warnings
- Multi-workspace directory support

### Telemetry and Metrics
- File operation metrics recording
- Provider-specific usage tracking
- Performance monitoring

## 3. Provider-Related Feature Migration

### What Needs Migration:
1. **Provider Manager Integration**
   - Pass provider context to invocations
   - Maintain provider-specific formatting

2. **Error Handling**
   - Provider-specific error messages
   - Retry logic awareness

3. **Configuration Access**
   - Provider settings in invocation context
   - Dynamic provider switching support

### Migration Strategy:
```typescript
class EditToolInvocation extends BaseToolInvocation {
  constructor(
    private config: Config,
    private providerContext: ProviderContext, // NEW
    params: EditToolParams
  ) {
    super(params);
  }
  
  // Access provider-specific features
  private getToolFormatter() {
    return this.providerContext.getToolFormatter();
  }
}
```

## 4. Feature Migration Requirements

### Parameter Enhancements
1. **Keep all custom parameters** in tool schemas
2. **Pass parameters** through to invocations
3. **Maintain validation** in both tool and invocation

### Settings Integration
```typescript
class GrepToolInvocation {
  execute() {
    // Access settings through config
    const ephemeralSettings = this.config.getEphemeralSettings();
    const maxItems = this.params.max_matches ?? 
      ephemeralSettings['tool-output-max-items'] ?? 50;
  }
}
```

### Token Limiting
- Move `limitOutputTokens` calls to invocation classes
- Maintain all truncation modes
- Keep user guidance messages

## 5. Test Changes Required

### Test Structure Updates
1. **Create Invocation Tests**
   ```typescript
   // Old
   const result = await tool.execute(params, signal);
   
   // New
   const invocation = tool.build(params);
   const result = await invocation.execute(signal);
   ```

2. **Mock Updates**
   - Mock `createInvocation` instead of direct methods
   - Test invocation lifecycle separately

3. **Validation Testing**
   - Test validation in tool class
   - Test parameter access in invocation

### Specific Test Files:
- `edit.test.ts`: Update all execute calls to use invocations
- `glob.test.ts`: Test max_files in invocation context
- `grep.test.ts`: Test max_matches and multi-directory search
- Add new invocation-specific test files

## 6. NO BACKWARD COMPATIBILITY

### Clean Migration Approach:
1. **Delete old patterns completely**
   - Remove direct execute from tools
   - No adapter patterns
   - No legacy support

2. **Update all callers**
   - Find all tool.execute() calls
   - Replace with tool.build().execute()
   - Update tool registry if needed

3. **Clean breaks**
   - Change interfaces without deprecation
   - Update documentation immediately
   - No migration period

## 7. Implementation Plan

### Phase 1: Core Infrastructure
1. Add new interfaces and base classes
2. Implement `BaseToolInvocation`
3. Update `BaseDeclarativeTool`

### Phase 2: Tool Migration (One at a time)
1. **EditTool**:
   - Create `EditToolInvocation`
   - Move all execution logic
   - Update tests
   
2. **GrepTool**:
   - Create `GrepToolInvocation`
   - Preserve multi-directory search
   - Maintain provider features
   
3. **GlobTool**:
   - Create `GlobToolInvocation`
   - Keep max_files parameter
   - Maintain file filtering

### Phase 3: Integration
1. Update tool registry
2. Update all tool callers
3. Remove old base classes
4. Update documentation

### Phase 4: Verification
1. Run all tests
2. Test with each provider
3. Verify all features work
4. Performance testing

## Critical Success Factors

1. **Maintain ALL LLxprt features** - No regression
2. **Clean architecture** - No legacy code
3. **Provider support** - All providers work
4. **Performance** - No degradation
5. **User experience** - Same or better

## Risk Mitigation

1. **Test Coverage**: Write tests for invocation lifecycle first
2. **Provider Testing**: Test each provider extensively
3. **Feature Checklist**: Verify each unique feature works
4. **Performance Benchmarks**: Before/after comparison
5. **Staged Rollout**: One tool at a time

## Estimated Effort

- Infrastructure: 2-3 hours
- Per tool migration: 3-4 hours
- Testing and verification: 4-5 hours
- Total: ~15-20 hours

This is a significant refactoring but will result in cleaner, more maintainable code with better separation of concerns.