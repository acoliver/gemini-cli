/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Box } from 'ink';
import { IndividualToolCallDisplay, ToolCallStatus } from '../../types.js';
import { ToolMessage } from './ToolMessage.js';
import { ToolConfirmationMessage } from './ToolConfirmationMessage.js';
import { Colors } from '../../colors.js';
import { Config } from '@vybestack/llxprt-code-core';
import { SHELL_COMMAND_NAME } from '../../constants.js';
import { useTodoContext } from '../../contexts/TodoContext.js';

interface ToolGroupMessageProps {
  groupId: number;
  toolCalls: IndividualToolCallDisplay[];
  availableTerminalHeight?: number;
  terminalWidth: number;
  config?: Config;
  isFocused?: boolean;
}

// Main component renders the border and maps the tools using ToolMessage
export const ToolGroupMessage: React.FC<ToolGroupMessageProps> = ({
  toolCalls,
  availableTerminalHeight,
  terminalWidth,
  config,
  isFocused = true,
}) => {
  const { todos } = useTodoContext();
  const hasTodoPanel = todos.length > 0;

  // only prompt for tool approval on the first 'confirming' tool in the list
  // note, after the CTA, this automatically moves over to the next 'confirming' tool
  const toolAwaitingApproval = useMemo(
    () => toolCalls.find((tc) => tc.status === ToolCallStatus.Confirming),
    [toolCalls],
  );

  // Filter out todo_read completely when panel is visible
  // and minimize todo_write output
  const filteredToolCalls = useMemo(() => {
    if (!hasTodoPanel) return toolCalls;

    return toolCalls
      .map((tool) => {
        if (tool.name === 'todo_read') {
          return null; // Don't show todo_read at all when panel is visible
        }
        if (tool.name === 'todo_write') {
          // Minimize todo_write output when panel is visible
          return {
            ...tool,
            resultDisplay: '✦ Todo list updated.',
          };
        }
        return tool;
      })
      .filter(Boolean) as IndividualToolCallDisplay[];
  }, [toolCalls, hasTodoPanel]);

  // If all tools were filtered out, don't render anything
  if (filteredToolCalls.length === 0) {
    return null;
  }

  const hasPending = !filteredToolCalls.every(
    (t) => t.status === ToolCallStatus.Success,
  );
  const isShellCommand = filteredToolCalls.some(
    (t) => t.name === SHELL_COMMAND_NAME,
  );
  const borderColor =
    hasPending || isShellCommand ? Colors.AccentYellow : Colors.Gray;

  const staticHeight = /* border */ 2 + /* marginBottom */ 1;
  // This is a bit of a magic number, but it accounts for the border and
  // marginLeft.
  const innerWidth = terminalWidth - 4;

  let countToolCallsWithResults = 0;
  for (const tool of filteredToolCalls) {
    if (tool.resultDisplay !== undefined && tool.resultDisplay !== '') {
      countToolCallsWithResults++;
    }
  }
  const countOneLineToolCalls =
    filteredToolCalls.length - countToolCallsWithResults;
  const availableTerminalHeightPerToolMessage = availableTerminalHeight
    ? Math.max(
        Math.floor(
          (availableTerminalHeight - staticHeight - countOneLineToolCalls) /
            Math.max(1, countToolCallsWithResults),
        ),
        1,
      )
    : undefined;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      /*
        This width constraint is highly important and protects us from an Ink rendering bug.
        Since the ToolGroup can typically change rendering states frequently, it can cause
        Ink to render the border of the box incorrectly and span multiple lines and even
        cause tearing.
      */
      width="100%"
      marginLeft={1}
      borderDimColor={hasPending}
      borderColor={borderColor}
    >
      {filteredToolCalls.map((tool) => {
        const isConfirming = toolAwaitingApproval?.callId === tool.callId;
        return (
          <Box key={tool.callId} flexDirection="column" minHeight={1}>
            <Box flexDirection="row" alignItems="center">
              <ToolMessage
                callId={tool.callId}
                name={tool.name}
                description={tool.description}
                resultDisplay={tool.resultDisplay}
                status={tool.status}
                confirmationDetails={tool.confirmationDetails}
                availableTerminalHeight={availableTerminalHeightPerToolMessage}
                terminalWidth={innerWidth}
                emphasis={
                  isConfirming
                    ? 'high'
                    : toolAwaitingApproval
                      ? 'low'
                      : 'medium'
                }
                renderOutputAsMarkdown={tool.renderOutputAsMarkdown}
              />
            </Box>
            {tool.status === ToolCallStatus.Confirming &&
              isConfirming &&
              tool.confirmationDetails && (
                <ToolConfirmationMessage
                  confirmationDetails={tool.confirmationDetails}
                  config={config}
                  isFocused={isFocused}
                  availableTerminalHeight={
                    availableTerminalHeightPerToolMessage
                  }
                  terminalWidth={innerWidth}
                />
              )}
          </Box>
        );
      })}
    </Box>
  );
};
