/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { SchemaValidator } from '../utils/schemaValidator.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Icon,
  ToolResult,
  ToolInvocation,
  ToolLocation,
} from './tools.js';
import { Type } from '@google/genai';
import { shortenPath, makeRelative } from '../utils/paths.js';
import { Config } from '../config/config.js';
import {
  limitOutputTokens,
  formatLimitedOutput,
  getOutputLimits,
} from '../utils/toolOutputLimiter.js';

// Subset of 'Path' interface provided by 'glob' that we can implement for testing
export interface GlobPath {
  fullpath(): string;
  mtimeMs?: number;
}

/**
 * Sorts file entries based on recency and then alphabetically.
 * Recent files (modified within recencyThresholdMs) are listed first, newest to oldest.
 * Older files are listed after recent ones, sorted alphabetically by path.
 */
export function sortFileEntries(
  entries: GlobPath[],
  nowTimestamp: number,
  recencyThresholdMs: number,
): GlobPath[] {
  const sortedEntries = [...entries];
  sortedEntries.sort((a, b) => {
    const mtimeA = a.mtimeMs ?? 0;
    const mtimeB = b.mtimeMs ?? 0;
    const aIsRecent = nowTimestamp - mtimeA < recencyThresholdMs;
    const bIsRecent = nowTimestamp - mtimeB < recencyThresholdMs;

    if (aIsRecent && bIsRecent) {
      return mtimeB - mtimeA;
    } else if (aIsRecent) {
      return -1;
    } else if (bIsRecent) {
      return 1;
    } else {
      return a.fullpath().localeCompare(b.fullpath());
    }
  });
  return sortedEntries;
}

/**
 * Parameters for the GlobTool
 */
export interface GlobToolParams {
  /**
   * The glob pattern to match files against
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory)
   */
  path?: string;

  /**
   * Whether the search should be case-sensitive (optional, defaults to false)
   */
  case_sensitive?: boolean;

  /**
   * Whether to respect .gitignore patterns (optional, defaults to true)
   */
  respect_git_ignore?: boolean;

  /**
   * Maximum number of files to return (optional, helps prevent overwhelming output)
   */
  max_files?: number;
}

/**
 * Implementation of a single glob tool invocation
 */
class GlobToolInvocation extends BaseToolInvocation<
  GlobToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: GlobToolParams,
  ) {
    super(params);
  }

  toolLocations(): ToolLocation[] {
    if (this.params.path) {
      const searchDir = path.resolve(
        this.config.getTargetDir(),
        this.params.path,
      );
      return [{ path: searchDir }];
    }
    // When no path specified, could search multiple directories
    return this.config
      .getWorkspaceContext()
      .getDirectories()
      .map((dir) => ({
        path: dir,
      }));
  }

  getDescription(): string {
    let description = `'${this.params.pattern}'`;
    if (this.params.path) {
      const searchDir = path.resolve(
        this.config.getTargetDir(),
        this.params.path || '.',
      );
      const relativePath = makeRelative(searchDir, this.config.getTargetDir());
      description += ` within ${shortenPath(relativePath)}`;
    }
    return description;
  }

  /**
   * Executes the glob search with the given parameters
   */
  async execute(signal: AbortSignal): Promise<ToolResult> {
    try {
      const workspaceContext = this.config.getWorkspaceContext();
      const workspaceDirectories = workspaceContext.getDirectories();

      // If a specific path is provided, resolve it and check if it's within workspace
      let searchDirectories: readonly string[];
      if (this.params.path) {
        const searchDirAbsolute = path.resolve(
          this.config.getTargetDir(),
          this.params.path,
        );
        if (!workspaceContext.isPathWithinWorkspace(searchDirAbsolute)) {
          return {
            llmContent: `Error: Path "${this.params.path}" is not within any workspace directory`,
            returnDisplay: `Path is not within workspace`,
          };
        }
        searchDirectories = [searchDirAbsolute];
      } else {
        // Search across all workspace directories
        searchDirectories = workspaceDirectories;
      }

      // Get centralized file discovery service
      const respectGitIgnore =
        this.params.respect_git_ignore ??
        this.config.getFileFilteringRespectGitIgnore();
      const fileDiscovery = this.config.getFileService();

      // Collect entries from all search directories
      let allEntries: GlobPath[] = [];

      for (const searchDir of searchDirectories) {
        const entries = (await glob(this.params.pattern, {
          cwd: searchDir,
          withFileTypes: true,
          nodir: true,
          stat: true,
          nocase: !this.params.case_sensitive,
          dot: true,
          ignore: ['**/node_modules/**', '**/.git/**'],
          follow: false,
          signal,
        })) as GlobPath[];

        allEntries = allEntries.concat(entries);
      }

      const entries = allEntries;

      // Apply git-aware filtering if enabled and in git repository
      let filteredEntries = entries;
      let gitIgnoredCount = 0;

      if (respectGitIgnore) {
        const relativePaths = entries.map((p) =>
          path.relative(this.config.getTargetDir(), p.fullpath()),
        );
        const filteredRelativePaths = fileDiscovery.filterFiles(relativePaths, {
          respectGitIgnore,
        });
        const filteredAbsolutePaths = new Set(
          filteredRelativePaths.map((p) =>
            path.resolve(this.config.getTargetDir(), p),
          ),
        );

        filteredEntries = entries.filter((entry) =>
          filteredAbsolutePaths.has(entry.fullpath()),
        );
        gitIgnoredCount = entries.length - filteredEntries.length;
      }

      if (!filteredEntries || filteredEntries.length === 0) {
        let message = `No files found matching pattern "${this.params.pattern}"`;
        if (searchDirectories.length === 1) {
          message += ` within ${searchDirectories[0]}`;
        } else {
          message += ` within ${searchDirectories.length} workspace directories`;
        }
        if (gitIgnoredCount > 0) {
          message += ` (${gitIgnoredCount} files were git-ignored)`;
        }
        return {
          llmContent: message,
          returnDisplay: `No files found`,
        };
      }

      // Set filtering such that we first show the most recent files
      const oneDayInMs = 24 * 60 * 60 * 1000;
      const nowTimestamp = new Date().getTime();

      // Sort the filtered entries using the new helper function
      const sortedEntries = sortFileEntries(
        filteredEntries,
        nowTimestamp,
        oneDayInMs,
      );

      // Apply max_files limit if specified
      let finalEntries = sortedEntries;
      let limitMessage = '';
      if (
        this.params.max_files &&
        sortedEntries.length > this.params.max_files
      ) {
        finalEntries = sortedEntries.slice(0, this.params.max_files);
        limitMessage = ` (showing first ${this.params.max_files} of ${sortedEntries.length} total matches)`;
      }

      const sortedAbsolutePaths = finalEntries.map((entry) => entry.fullpath());
      const fileListDescription = sortedAbsolutePaths.join('\n');
      const fileCount = finalEntries.length;
      const totalCount = sortedEntries.length;

      let resultMessage = `Found ${totalCount} file(s) matching "${this.params.pattern}"${limitMessage}`;
      if (searchDirectories.length === 1) {
        resultMessage += ` within ${searchDirectories[0]}`;
      } else {
        resultMessage += ` across ${searchDirectories.length} workspace directories`;
      }
      if (gitIgnoredCount > 0) {
        resultMessage += ` (${gitIgnoredCount} additional files were git-ignored)`;
      }
      resultMessage += `, sorted by modification time (newest first):\n${fileListDescription}`;

      // Apply token-based limiting (NOT item limiting - glob just lists paths)
      const limitedResult = limitOutputTokens(
        resultMessage,
        this.config,
        'glob',
      );

      // If we hit token limits with warn mode, provide better guidance
      if (
        limitedResult.wasTruncated &&
        !limitedResult.content &&
        !this.params.max_files
      ) {
        const improvedMessage = `glob output exceeded token limit (${limitedResult.originalTokens} > ${getOutputLimits(this.config).maxTokens}). Too many files matched the pattern. Please:
1. Use the max_files parameter to limit results (e.g., max_files: 100)
2. Use a more specific glob pattern (e.g., "src/**/*.ts" instead of "**/*")
3. Search in a specific subdirectory rather than the entire codebase
4. Include file extensions in your pattern (e.g., "*.tsx" not "*")
5. Use multiple smaller searches instead of one broad search`;

        return {
          llmContent: improvedMessage,
          returnDisplay: `## File Limit Exceeded\n\n${improvedMessage}`,
        };
      }

      const formatted = formatLimitedOutput(limitedResult);
      if (limitedResult.wasTruncated && !limitedResult.content) {
        return formatted;
      }

      return {
        llmContent: formatted.llmContent,
        returnDisplay: `Found ${fileCount} matching file(s)`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`GlobLogic execute Error: ${errorMessage}`, error);
      return {
        llmContent: `Error during glob search operation: ${errorMessage}`,
        returnDisplay: `Error: An unexpected error occurred.`,
      };
    }
  }
}

/**
 * Implementation of the Glob tool logic
 */
export class GlobTool extends BaseDeclarativeTool<GlobToolParams, ToolResult> {
  static readonly Name = 'glob';

  constructor(private config: Config) {
    super(
      GlobTool.Name,
      'FindFiles',
      'Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure, especially in large codebases.',
      Icon.FileSearch,
      {
        properties: {
          pattern: {
            description:
              "The glob pattern to match against (e.g., '**/*.py', 'docs/*.md').",
            type: Type.STRING,
          },
          path: {
            description:
              'Optional: The absolute path to the directory to search within. If omitted, searches the root directory.',
            type: Type.STRING,
          },
          case_sensitive: {
            description:
              'Optional: Whether the search should be case-sensitive. Defaults to false.',
            type: Type.BOOLEAN,
          },
          respect_git_ignore: {
            description:
              'Optional: Whether to respect .gitignore patterns when finding files. Only available in git repositories. Defaults to true.',
            type: Type.BOOLEAN,
          },
          max_files: {
            description:
              'Optional: Maximum number of files to return. If omitted, returns all matching files up to system limits. Set a lower number if you expect many matches to avoid overwhelming output.',
            type: Type.NUMBER,
          },
        },
        required: ['pattern'],
        type: Type.OBJECT,
      },
    );
  }

  /**
   * Validates the parameters for the tool.
   */
  validateToolParams(params: GlobToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    const searchDirAbsolute = path.resolve(
      this.config.getTargetDir(),
      params.path || '.',
    );

    const workspaceContext = this.config.getWorkspaceContext();
    if (!workspaceContext.isPathWithinWorkspace(searchDirAbsolute)) {
      const directories = workspaceContext.getDirectories();
      return `Search path ("${searchDirAbsolute}") resolves outside the allowed workspace directories: ${directories.join(', ')}`;
    }

    const targetDir = searchDirAbsolute || this.config.getTargetDir();
    try {
      if (!fs.existsSync(targetDir)) {
        return `Search path does not exist ${targetDir}`;
      }
      if (!fs.statSync(targetDir).isDirectory()) {
        return `Search path is not a directory: ${targetDir}`;
      }
    } catch (e: unknown) {
      return `Error accessing search path: ${e}`;
    }

    if (
      !params.pattern ||
      typeof params.pattern !== 'string' ||
      params.pattern.trim() === ''
    ) {
      return "The 'pattern' parameter cannot be empty.";
    }

    return null;
  }

  /**
   * Creates an invocation for the given parameters
   */
  protected createInvocation(
    params: GlobToolParams,
  ): ToolInvocation<GlobToolParams, ToolResult> {
    return new GlobToolInvocation(this.config, params);
  }
}
