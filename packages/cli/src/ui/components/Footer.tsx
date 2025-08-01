/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import {
  shortenPath,
  tildeifyPath,
  tokenLimit,
} from '@vybestack/llxprt-code-core';
import { ConsoleSummaryDisplay } from './ConsoleSummaryDisplay.js';
import process from 'node:process';
import Gradient from 'ink-gradient';
import { MemoryUsageDisplay } from './MemoryUsageDisplay.js';
import { getProviderManager } from '../../providers/providerManagerInstance.js';

import { DebugProfiler } from './DebugProfiler.js';

interface FooterProps {
  model: string;
  targetDir: string;
  branchName?: string;
  debugMode: boolean;
  debugMessage: string;
  errorCount: number;
  showErrorDetails: boolean;
  showMemoryUsage?: boolean;
  promptTokenCount: number;
  isPaidMode?: boolean;
  nightly: boolean;
  vimMode?: string;
}

export const Footer: React.FC<FooterProps> = ({
  model,
  targetDir,
  branchName,
  debugMode,
  debugMessage,
  errorCount,
  showErrorDetails,
  showMemoryUsage,
  promptTokenCount,
  isPaidMode,
  nightly,
  vimMode,
}) => {
  const limit = tokenLimit(model);
  const percentage = promptTokenCount / limit;

  return (
    <Box justifyContent="space-between" width="100%">
      <Box>
        {debugMode && <DebugProfiler />}
        {vimMode && <Text color={Colors.Gray}>[{vimMode}] </Text>}
        {nightly ? (
          <Gradient colors={Colors.GradientColors}>
            <Text>
              {shortenPath(tildeifyPath(targetDir), 70)}
              {branchName && <Text> ({branchName}*)</Text>}
            </Text>
          </Gradient>
        ) : (
          <Text color={Colors.LightBlue}>
            {shortenPath(tildeifyPath(targetDir), 70)}
            {branchName && <Text color={Colors.Gray}> ({branchName}*)</Text>}
          </Text>
        )}
        {debugMode && (
          <Text color={Colors.AccentRed}>
            {' ' + (debugMessage || '--debug')}
          </Text>
        )}
      </Box>

      {/* Middle Section: Centered Sandbox Info */}
      <Box
        flexGrow={1}
        alignItems="center"
        justifyContent="center"
        display="flex"
      >
        {process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec' ? (
          <Text color={Colors.AccentGreen}>
            {process.env.SANDBOX.replace(/^gemini-(?:cli-)?/, '')}
          </Text>
        ) : process.env.SANDBOX === 'sandbox-exec' ? (
          <Text color={Colors.AccentYellow}>
            macOS Seatbelt{' '}
            <Text color={Colors.Gray}>({process.env.SEATBELT_PROFILE})</Text>
          </Text>
        ) : (
          <Text color={Colors.AccentRed}>
            no sandbox <Text color={Colors.Gray}>(see /docs)</Text>
          </Text>
        )}
      </Box>

      {/* Right Section: Gemini Label and Console Summary */}
      <Box alignItems="center">
        <Text color={Colors.AccentBlue}>
          {' '}
          {model}{' '}
          <Text color={Colors.Gray}>
            ({Math.max(0, Math.round((1 - percentage) * 100))}% context left)
          </Text>
        </Text>
        {isPaidMode !== undefined &&
          (() => {
            const providerManager = getProviderManager();
            const activeProvider = providerManager?.getActiveProvider?.();
            const isGeminiProvider = activeProvider?.name === 'gemini';

            // Only show paid/free mode for Gemini provider
            if (isGeminiProvider) {
              return (
                <Text>
                  <Text color={Colors.Gray}> | </Text>
                  <Text
                    color={
                      isPaidMode ? Colors.AccentYellow : Colors.AccentGreen
                    }
                  >
                    {isPaidMode ? 'paid mode' : 'free mode'}
                  </Text>
                </Text>
              );
            }
            return null;
          })()}

        {!showErrorDetails && errorCount > 0 && (
          <Box>
            <Text color={Colors.Gray}>| </Text>
            <ConsoleSummaryDisplay errorCount={errorCount} />
          </Box>
        )}
        {showMemoryUsage && <MemoryUsageDisplay />}
      </Box>
    </Box>
  );
};
