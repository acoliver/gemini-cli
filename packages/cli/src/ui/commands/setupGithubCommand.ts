/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CommandKind,
  SlashCommand,
  SlashCommandActionReturn,
} from './types.js';

export const setupGithubCommand: SlashCommand = {
  name: 'setup-github',
  description:
    'Set up GitHub Actions (currently disabled - needs adaptation for llxprt)',
  kind: CommandKind.BUILT_IN,
  action: (): SlashCommandActionReturn =>
    // TODO: Adapt this command for llxprt-code
    // Need to:
    // 1. Create our own GitHub Actions repository (e.g., acoliver/run-llxprt-code or vybestack/run-llxprt-code)
    // 2. Adapt the workflows to use llxprt instead of gemini
    // 3. Support multi-provider configuration in the workflows
    // 4. Update the URLs below to point to our repository
    // 5. Consider including the cherry-picker workflow as part of the setup

    // For now, return an informative message
    ({
      type: 'message',
      messageType: 'info',
      content: `The /setup-github command is currently disabled and needs adaptation for llxprt-code.

This command would download GitHub Actions workflows for:
- Automated PR reviews using llxprt
- Issue triage and labeling
- General AI assistance via @llxprt-cli mentions
- (Potentially) Automated upstream sync via cherry-picking

To implement this feature:
1. Fork https://github.com/google-github-actions/run-gemini-cli
2. Adapt it for multi-provider support
3. Update this command to point to the new repository

For now, you can manually set up GitHub Actions by creating workflows that use llxprt-code.`,
    }),
};

/* Original gemini implementation with better error handling - kept for reference:
if (!isGitHubRepository()) {
  throw new Error(
    'Unable to determine the GitHub repository. /setup-github must be run from a git repository.',
  );
}

let gitRootRepo: string;
try {
  gitRootRepo = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf-8',
  }).trim();
} catch {
  throw new Error(
    'Unable to determine the GitHub repository. /setup-github must be run from a git repository.',
  );
}

// TODO: Create llxprt-specific workflows
const version = 'v0';
const workflowBaseUrl = `https://raw.githubusercontent.com/google-github-actions/run-gemini-cli/refs/heads/${version}/workflows/`;

const workflows = [
  'gemini-cli/gemini-cli.yml',
  'issue-triage/gemini-issue-automated-triage.yml',
  'issue-triage/gemini-issue-scheduled-triage.yml',
  'pr-review/gemini-pr-review.yml',
];

const command = [
  'set -e',
  `mkdir -p "${gitRootRepo}/.github/workflows"`,
  ...workflows.map((workflow) => {
    const fileName = path.basename(workflow);
    return `curl -fsSL -o "${gitRootRepo}/.github/workflows/${fileName}" "${workflowBaseUrl}/${workflow}"`;
  }),
  'echo "Workflows downloaded successfully. Follow steps in https://github.com/google-github-actions/run-gemini-cli/blob/v0/README.md#quick-start (skipping the /setup-github step) to complete setup."',
  'open https://github.com/google-github-actions/run-gemini-cli/blob/v0/README.md#quick-start',
].join(' && ');
return {
  type: 'tool',
  toolName: 'run_shell_command',
  toolArgs: {
    description:
      'Setting up GitHub Actions to triage issues and review PRs with Gemini.',
    command,
  },
};
*/
