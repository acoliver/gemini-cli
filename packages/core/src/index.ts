/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Export config
export * from './config/config.js';
export * from './config/profileManager.js';

// Export types
export * from './types/modelParams.js';

// Export Core Logic
export * from './core/client.js';
export * from './core/contentGenerator.js';
export * from './core/geminiChat.js';
export * from './core/logger.js';
export * from './core/prompts.js';
export * from './core/tokenLimits.js';
export * from './core/turn.js';
export * from './core/geminiRequest.js';
export * from './core/coreToolScheduler.js';
export * from './core/nonInteractiveToolExecutor.js';

export * from './code_assist/codeAssist.js';
export * from './code_assist/oauth2.js';
export * from './code_assist/server.js';
export * from './code_assist/types.js';

// Export utilities
export * from './utils/paths.js';
export * from './utils/schemaValidator.js';
export * from './utils/errors.js';
export * from './utils/getFolderStructure.js';
export * from './utils/memoryDiscovery.js';
export * from './utils/gitIgnoreParser.js';
export * from './utils/gitUtils.js';
export * from './utils/editor.js';
export * from './utils/quotaErrorDetection.js';
export * from './utils/fileUtils.js';
export * from './utils/retry.js';
export * from './utils/shell-utils.js';
export * from './utils/systemEncoding.js';
export * from './utils/textUtils.js';
export * from './utils/formatters.js';
export * from './utils/sanitization.js';
export * from './utils/unicodeUtils.js';
export * from './utils/filesearch/fileSearch.js';

// Export services
export * from './services/fileDiscoveryService.js';
export * from './services/gitService.js';

// Export IDE specific logic
export * from './ide/ide-client.js';
export * from './ide/ideContext.js';
export * from './ide/ide-installer.js';
export { getIdeDisplayName, DetectedIde } from './ide/detect-ide.js';

// Export Shell Execution Service
export * from './services/shellExecutionService.js';

// Export base tool definitions
export * from './tools/tools.js';
export * from './tools/tool-error.js';
export * from './tools/tool-registry.js';
export * from './tools/tool-context.js';

// Export prompt logic
export * from './prompts/mcp-prompts.js';

// Export prompt configuration system
export * from './prompt-config/prompt-service.js';
export * from './prompt-config/types.js';

// Export specific tool logic
export * from './tools/read-file.js';
export * from './tools/ls.js';
export * from './tools/grep.js';
export * from './tools/glob.js';
export * from './tools/edit.js';
export * from './tools/write-file.js';
export * from './tools/web-fetch.js';
export * from './tools/memoryTool.js';
export * from './tools/shell.js';
export * from './tools/web-search.js';
export * from './tools/read-many-files.js';
export * from './tools/mcp-client.js';
export * from './tools/mcp-tool.js';
export * from './tools/todo-read.js';
export * from './tools/todo-write.js';
export { ExtendedTodo } from './tools/todo-schemas.js';
export * from './tools/todo-schemas.js';
export * from './tools/todo-store.js';

// MCP OAuth
export { MCPOAuthProvider } from './mcp/oauth-provider.js';
export {
  MCPOAuthToken,
  MCPOAuthCredentials,
  MCPOAuthTokenStorage,
} from './mcp/oauth-token-storage.js';
export type { MCPOAuthConfig } from './mcp/oauth-provider.js';
export type {
  OAuthAuthorizationServerMetadata,
  OAuthProtectedResourceMetadata,
} from './mcp/oauth-utils.js';
export { OAuthUtils } from './mcp/oauth-utils.js';

// Export telemetry functions
export * from './telemetry/index.js';
export * from './telemetry/uiTelemetry.js';
export { sessionId } from './utils/session.js';
// Export provider types and classes
export type {
  Provider,
  ProviderMessage,
  ProviderTool,
  ProviderToolCall,
} from './providers/types.js';
// Export the actual interfaces too
export * from './providers/IProvider.js';
export * from './providers/IMessage.js';
export * from './providers/ITool.js';
export * from './providers/IModel.js';
export * from './providers/IProviderManager.js';
export * from './providers/ContentGeneratorRole.js';
export * from './providers/ProviderContentGenerator.js';
export * from './providers/ProviderManager.js';

// Export provider implementations
export { OpenAIProvider } from './providers/openai/OpenAIProvider.js';
export { ConversationCache } from './providers/openai/ConversationCache.js';
export { getOpenAIProviderInfo } from './providers/openai/getOpenAIProviderInfo.js';
export { AnthropicProvider } from './providers/anthropic/AnthropicProvider.js';
export { GeminiProvider } from './providers/gemini/GeminiProvider.js';
export * from './providers/ProviderManager.js';
export * from './providers/adapters/GeminiCompatibleWrapper.js';
export * from './providers/errors.js';

// Export tokenizers
export * from './providers/tokenizers/ITokenizer.js';
export * from './providers/tokenizers/OpenAITokenizer.js';
export * from './providers/tokenizers/AnthropicTokenizer.js';
export * from './utils/browser.js';

// Export adapters
export * from './adapters/IStreamAdapter.js';

// Export parsers
export * from './parsers/TextToolCallParser.js';

// Export tool formatters
export * from './tools/IToolFormatter.js';
export * from './tools/ToolFormatter.js';
