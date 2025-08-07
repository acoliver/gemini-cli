/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ToolContext {
  /** Unique session identifier */
  sessionId: string;
  /** Optional agent identifier for subagent contexts */
  agentId?: string;
  /** Whether the tool is running in interactive mode */
  interactiveMode?: boolean;
}

export interface ContextAwareTool {
  context?: ToolContext;
}
